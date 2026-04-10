const functions = require('firebase-functions')
const admin     = require('firebase-admin')
const axios     = require('axios')

admin.initializeApp()
const db = admin.firestore()

// ── PayPal helpers ─────────────────────────────────────────────────

async function getPayPalAccessToken() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env
  const base = 'https://api-m.paypal.com' // use api-m.sandbox.paypal.com for testing
  const { data } = await axios.post(
    `${base}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      auth: { username: PAYPAL_CLIENT_ID, password: PAYPAL_CLIENT_SECRET },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  )
  return { token: data.access_token, base }
}

async function verifyWebhookSignature(req, webhookId) {
  const { token, base } = await getPayPalAccessToken()
  const { data } = await axios.post(
    `${base}/v1/notifications/verify-webhook-signature`,
    {
      auth_algo:         req.headers['paypal-auth-algo'],
      cert_url:          req.headers['paypal-cert-url'],
      transmission_id:   req.headers['paypal-transmission-id'],
      transmission_sig:  req.headers['paypal-transmission-sig'],
      transmission_time: req.headers['paypal-transmission-time'],
      webhook_id:        webhookId,
      webhook_event:     req.body,
    },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data.verification_status === 'SUCCESS'
}

// ── Webhook handler ────────────────────────────────────────────────
// Register this URL in the PayPal developer dashboard as a webhook endpoint.

exports.paypalWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') { res.sendStatus(405); return }

  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID
    const valid = await verifyWebhookSignature(req, webhookId)
    if (!valid) { res.sendStatus(400); return }
  } catch (e) {
    functions.logger.error('Webhook verification failed', e)
    res.sendStatus(400)
    return
  }

  const { event_type, resource } = req.body
  const subscriptionId = resource?.id ?? resource?.billing_agreement_id

  if (!subscriptionId) { res.sendStatus(200); return }

  // Find the user with this subscription ID
  const snap = await db.collection('users')
    .where('paypalSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get()

  if (snap.empty) { res.sendStatus(200); return }

  const userRef = snap.docs[0].ref

  const statusMap = {
    'BILLING.SUBSCRIPTION.ACTIVATED':  { subscriptionStatus: 'active' },
    'BILLING.SUBSCRIPTION.CANCELLED':  { subscriptionStatus: 'cancelled' },
    'BILLING.SUBSCRIPTION.SUSPENDED':  { subscriptionStatus: 'past_due' },
    'BILLING.SUBSCRIPTION.EXPIRED':    { subscriptionStatus: 'cancelled' },
    'PAYMENT.SALE.COMPLETED':          { lastPaymentAt: admin.firestore.FieldValue.serverTimestamp() },
    'PAYMENT.SALE.DENIED':             { subscriptionStatus: 'past_due' },
  }

  const update = statusMap[event_type]
  if (update) await userRef.update(update)

  res.sendStatus(200)
})
