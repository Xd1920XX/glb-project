const functions   = require('firebase-functions')
const admin       = require('firebase-admin')
const axios       = require('axios')
const Stripe      = require('stripe')
const nodemailer  = require('nodemailer')

admin.initializeApp()
const db = admin.firestore()

// ── PayPal helpers ─────────────────────────────────────────────────

async function getPayPalAccessToken() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env
  const base = 'https://api-m.paypal.com'
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

// ── PayPal webhook ─────────────────────────────────────────────────

exports.paypalWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') { res.sendStatus(405); return }

  try {
    const valid = await verifyWebhookSignature(req, process.env.PAYPAL_WEBHOOK_ID)
    if (!valid) { res.sendStatus(400); return }
  } catch (e) {
    functions.logger.error('PayPal webhook verification failed', e)
    res.sendStatus(400); return
  }

  const { event_type, resource } = req.body
  const subscriptionId = resource?.id ?? resource?.billing_agreement_id
  if (!subscriptionId) { res.sendStatus(200); return }

  const snap = await db.collection('users')
    .where('paypalSubscriptionId', '==', subscriptionId).limit(1).get()
  if (snap.empty) { res.sendStatus(200); return }

  const userRef = snap.docs[0].ref
  const statusMap = {
    'BILLING.SUBSCRIPTION.ACTIVATED': { subscriptionStatus: 'active' },
    'BILLING.SUBSCRIPTION.CANCELLED': { subscriptionStatus: 'cancelled' },
    'BILLING.SUBSCRIPTION.SUSPENDED': { subscriptionStatus: 'past_due' },
    'BILLING.SUBSCRIPTION.EXPIRED':   { subscriptionStatus: 'cancelled' },
    'PAYMENT.SALE.COMPLETED':         { lastPaymentAt: admin.firestore.FieldValue.serverTimestamp() },
    'PAYMENT.SALE.DENIED':            { subscriptionStatus: 'past_due' },
  }

  const update = statusMap[event_type]
  if (update) await userRef.update(update)
  res.sendStatus(200)
})

// ── Stripe: create checkout session ────────────────────────────────

exports.createStripeCheckout = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')

  const { planId, priceId, appUrl } = data
  const uid = context.auth.uid

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

  const session = await stripe.checkout.sessions.create({
    mode:                'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data:   { trial_period_days: 7 },
    client_reference_id: uid,
    metadata:            { uid, planId },
    success_url:         `${appUrl}/billing?stripe=success`,
    cancel_url:          `${appUrl}/billing?stripe=cancel`,
  })

  return { url: session.url }
})

// ── Stripe webhook ─────────────────────────────────────────────────
// Register this URL in Stripe Dashboard → Webhooks.
// Events to listen for:
//   checkout.session.completed
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.payment_failed

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') { res.sendStatus(405); return }

  const sig    = req.headers['stripe-signature']
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

  let event
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (e) {
    functions.logger.error('Stripe webhook signature failed', e.message)
    res.sendStatus(400); return
  }

  const obj = event.data.object

  if (event.type === 'checkout.session.completed') {
    const uid    = obj.client_reference_id
    const planId = obj.metadata?.planId
    const subId  = obj.subscription
    if (uid && planId) {
      await db.collection('users').doc(uid).update({
        subscriptionStatus:    'active',
        planId,
        stripeSubscriptionId:  subId,
        stripeCustomerId:      obj.customer,
        subscribedAt:          admin.firestore.FieldValue.serverTimestamp(),
        paymentProvider:       'stripe',
      })
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const snap = await db.collection('users')
      .where('stripeSubscriptionId', '==', obj.id).limit(1).get()
    if (!snap.empty) {
      const status = obj.status === 'active' ? 'active'
        : obj.status === 'past_due' ? 'past_due'
        : obj.status === 'canceled' ? 'cancelled'
        : null
      if (status) await snap.docs[0].ref.update({ subscriptionStatus: status })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const snap = await db.collection('users')
      .where('stripeSubscriptionId', '==', obj.id).limit(1).get()
    if (!snap.empty) await snap.docs[0].ref.update({ subscriptionStatus: 'cancelled' })
  }

  if (event.type === 'invoice.payment_failed') {
    const snap = await db.collection('users')
      .where('stripeCustomerId', '==', obj.customer).limit(1).get()
    if (!snap.empty) await snap.docs[0].ref.update({ subscriptionStatus: 'past_due' })
  }

  res.sendStatus(200)
})

// ── Order notification email ────────────────────────────────────────
// Triggers on every new order document. Sends an email to the
// notificationEmail stored in the configurator's orderForm settings.
//
// Required Firebase Function env vars (set via Firebase CLI):
//   firebase functions:config:set smtp.host="smtp.gmail.com" \
//     smtp.port="587" smtp.user="you@gmail.com" smtp.pass="app-password" \
//     smtp.from="Your App <noreply@example.com>"

exports.onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap) => {
    const order = snap.data()
    const { configuratorId, formData = {}, variantId, configuratorName } = order

    if (!configuratorId) return

    // Fetch configurator to get notification email
    const cfgSnap = await db.collection('configurators').doc(configuratorId).get()
    if (!cfgSnap.exists) return

    const cfg = cfgSnap.data()
    const notificationEmail = cfg.orderForm?.notificationEmail
    if (!notificationEmail) return

    const fieldRows = Object.entries(formData)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n')

    const text = [
      `New order received for "${configuratorName ?? cfg.name}"`,
      '',
      variantId ? `Variant: ${variantId}` : null,
      fieldRows ? `Form data:\n${fieldRows}` : null,
    ].filter((l) => l !== null).join('\n')

    const smtpConfig = functions.config().smtp ?? {}
    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      functions.logger.warn('onOrderCreated: SMTP not configured.')
      return
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: parseInt(smtpConfig.port ?? '587'),
      secure: smtpConfig.port === '465',
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    })

    await transporter.sendMail({
      from:    smtpConfig.from ?? smtpConfig.user,
      to:      notificationEmail,
      subject: `New order — ${configuratorName ?? cfg.name}`,
      text,
    })

    functions.logger.info(`Order notification sent to ${notificationEmail}`)
  })
