const functions = require('firebase-functions')
const admin     = require('firebase-admin')
const axios     = require('axios')
const sgMail    = require('@sendgrid/mail')

admin.initializeApp()
const db = admin.firestore()

// ── Email setup ────────────────────────────────────────────────────

function initSendGrid() {
  const key = process.env.SENDGRID_API_KEY
  if (key) sgMail.setApiKey(key)
  return !!key
}

const FROM     = process.env.SENDGRID_FROM || 'Nordic Render OÜ <noreply@nordicrender.com>'
const APP_URL  = process.env.APP_URL       || 'https://glbconfigurator.com'

async function sendEmail({ to, subject, html, text }) {
  if (!initSendGrid()) {
    functions.logger.warn('SendGrid not configured — skipping email to', to)
    return
  }
  try {
    await sgMail.send({ from: FROM, to, subject, html, text })
  } catch (e) {
    functions.logger.error('SendGrid send failed', e.response?.body ?? e.message)
  }
}

// ── Email templates ────────────────────────────────────────────────

function emailWrapper(preheader, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nordic Render</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;color:transparent;">${preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="padding-bottom:24px;">
            <span style="font-size:18px;font-weight:700;color:#111;letter-spacing:-0.3px;">Nordic Render</span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#fff;border-radius:12px;border:1px solid #e8e6e3;padding:40px 40px 32px;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top:24px;font-size:11px;color:#888;line-height:1.6;">
            Nordic Render OÜ &nbsp;·&nbsp; Reg. 16885822 &nbsp;·&nbsp; VAT EE102691294<br>
            A. H. Tammsaare tee 47, 11316 Tallinn, Estonia<br>
            <a href="${APP_URL}" style="color:#888;">glbconfigurator.com</a>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function btn(label, url) {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${label}</a>`
}

function divider() {
  return `<div style="border-top:1px solid #e8e6e3;margin:28px 0;"></div>`
}

function badge(text, color = '#15803d', bg = '#dcfce7') {
  return `<span style="display:inline-block;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;color:${color};background:${bg};">${text}</span>`
}

// Welcome email
function welcomeEmail(name, trialEndDate) {
  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;">Welcome, ${name}!</h1>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
      Your 3-day free trial has started. Build and publish 3D product configurators — no credit card required during the trial.
    </p>

    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f7f6f4;border-radius:8px;padding:20px;">
      <tr><td>
        <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#111;">What's included in your trial</p>
        <p style="margin:0 0 8px;font-size:13px;color:#444;">✓ &nbsp;Up to 3 published embeds</p>
        <p style="margin:0 0 8px;font-size:13px;color:#444;">✓ &nbsp;1 landing page</p>
        <p style="margin:0 0 8px;font-size:13px;color:#444;">✓ &nbsp;Full configurator builder access</p>
        <p style="margin:0;    font-size:13px;color:#444;">✓ &nbsp;Media library & order tracking</p>
      </td></tr>
    </table>

    <p style="font-size:13px;color:#777;margin:20px 0 0;">
      Trial ends on <strong style="color:#111;">${trialEndDate}</strong>. Subscribe any time from the billing page to keep access.
    </p>

    ${btn('Open Dashboard →', `${APP_URL}/dashboard`)}
  `
  return {
    subject: 'Welcome to Nordic Render — your trial has started',
    html:    emailWrapper('Your 3-day free trial has started. Build your first 3D configurator.', body),
    text:    `Welcome to Nordic Render, ${name}!\n\nYour 3-day free trial has started.\nTrial ends: ${trialEndDate}\n\nOpen your dashboard: ${APP_URL}/dashboard`,
  }
}

// Subscription confirmed email
function subscriptionEmail(name, planLabel, planPrice) {
  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;">Subscription confirmed</h1>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
      Thank you, ${name}. Your <strong>${planLabel}</strong> subscription is now active.
    </p>

    ${divider()}

    <table cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td style="font-size:13px;color:#777;padding-bottom:10px;">Plan</td>
        <td style="font-size:13px;color:#111;font-weight:600;text-align:right;padding-bottom:10px;">${planLabel}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#777;padding-bottom:10px;">Amount</td>
        <td style="font-size:13px;color:#111;font-weight:600;text-align:right;padding-bottom:10px;">€${planPrice} / month</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#777;">Status</td>
        <td style="text-align:right;">${badge('ACTIVE')}</td>
      </tr>
    </table>

    ${divider()}

    <p style="font-size:13px;color:#777;margin:0;">
      Your invoice is available in the billing section. You can cancel any time.
    </p>

    ${btn('View Billing →', `${APP_URL}/billing`)}
  `
  return {
    subject: `Your ${planLabel} subscription is active`,
    html:    emailWrapper(`Your ${planLabel} plan is now active — €${planPrice}/month.`, body),
    text:    `Subscription confirmed!\n\nPlan: ${planLabel}\nAmount: €${planPrice}/month\nStatus: Active\n\nView billing: ${APP_URL}/billing`,
  }
}

// Invoice email
function invoiceEmail(name, inv) {
  const vatPct = Math.round((inv.vatRate ?? 0.22) * 100)
  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;">Your invoice is ready</h1>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
      Invoice <strong>${inv.invoiceNumber}</strong> for your <strong>${inv.planLabel}</strong> subscription.
    </p>

    ${divider()}

    <table cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td style="font-size:13px;color:#777;padding-bottom:10px;">Invoice number</td>
        <td style="font-size:13px;color:#111;font-weight:600;text-align:right;padding-bottom:10px;font-family:monospace;">${inv.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#777;padding-bottom:10px;">Plan</td>
        <td style="font-size:13px;color:#111;font-weight:600;text-align:right;padding-bottom:10px;">${inv.planLabel}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#777;padding-bottom:10px;">Net amount</td>
        <td style="font-size:13px;color:#111;text-align:right;padding-bottom:10px;">€${(inv.netAmount ?? 0).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#777;padding-bottom:10px;">VAT ${vatPct}%</td>
        <td style="font-size:13px;color:#111;text-align:right;padding-bottom:10px;">€${(inv.vatAmount ?? 0).toFixed(2)}</td>
      </tr>
      <tr style="border-top:1px solid #e8e6e3;">
        <td style="font-size:14px;font-weight:700;color:#111;padding-top:12px;">Total paid</td>
        <td style="font-size:14px;font-weight:700;color:#111;text-align:right;padding-top:12px;">€${(inv.grossAmount ?? 0).toFixed(2)}</td>
      </tr>
    </table>

    ${divider()}

    <p style="font-size:13px;color:#777;margin:0;">
      You can download this invoice as a PDF from your billing page.
    </p>

    ${btn('Download Invoice →', `${APP_URL}/billing`)}
  `
  return {
    subject: `Invoice ${inv.invoiceNumber} — €${(inv.grossAmount ?? 0).toFixed(2)} paid`,
    html:    emailWrapper(`Invoice ${inv.invoiceNumber} is ready. Total: €${(inv.grossAmount ?? 0).toFixed(2)}.`, body),
    text:    `Invoice ${inv.invoiceNumber}\n\nPlan: ${inv.planLabel}\nNet: €${(inv.netAmount ?? 0).toFixed(2)}\nVAT ${vatPct}%: €${(inv.vatAmount ?? 0).toFixed(2)}\nTotal: €${(inv.grossAmount ?? 0).toFixed(2)}\n\nDownload: ${APP_URL}/billing`,
  }
}

// Order notification email (sent to configurator owner)
function orderEmail(configuratorName, variantId, formData) {
  const rows = Object.entries(formData ?? {})
    .map(([k, v]) => `
      <tr>
        <td style="font-size:13px;color:#777;padding:8px 0;border-bottom:1px solid #f2f1ef;width:40%;">${k}</td>
        <td style="font-size:13px;color:#111;padding:8px 0;border-bottom:1px solid #f2f1ef;font-weight:500;">${v}</td>
      </tr>`).join('')

  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;">New order received</h1>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
      A customer submitted an order for <strong>${configuratorName}</strong>.
    </p>

    ${variantId ? `<p style="font-size:13px;color:#777;margin:0 0 16px;">Variant: <strong style="color:#111;">${variantId}</strong></p>` : ''}

    ${rows ? `
    ${divider()}
    <table cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td colspan="2" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#888;padding-bottom:12px;">Order details</td>
      </tr>
      ${rows}
    </table>` : ''}

    ${btn('View Orders →', `${APP_URL}/orders`)}
  `
  return {
    subject: `New order — ${configuratorName}`,
    html:    emailWrapper(`A new order was submitted for ${configuratorName}.`, body),
    text:    `New order for "${configuratorName}"\n${variantId ? `Variant: ${variantId}\n` : ''}\n${Object.entries(formData ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n')}`,
  }
}

// ── Seller info ────────────────────────────────────────────────────

const SELLER = {
  name:    'Nordic Render OÜ',
  regCode: '16885822',
  vatId:   'EE102691294',
  address: 'A. H. Tammsaare tee 47, Kristiine linnaosa, 11316 Tallinn, Estonia',
  email:   'billing@nordicrender.com',
}

const PLANS_MAP = {
  starter:    { label: 'Starter',    price: 60  },
  pro:        { label: 'Pro',        price: 120 },
  business:   { label: 'Business',   price: 180 },
  enterprise: { label: 'Enterprise', price: 680 },
}

const VAT_RATE = 0.22

// ── Invoice counter ─────────────────────────────────────────────────

async function getNextInvoiceNumber() {
  const counterRef = db.collection('meta').doc('invoiceCounter')
  const year = new Date().getFullYear()
  let num
  await db.runTransaction(async (tx) => {
    const snap  = await tx.get(counterRef)
    const prev  = snap.exists ? snap.data() : { year: 0, count: 0 }
    const count = prev.year === year ? prev.count + 1 : 1
    tx.set(counterRef, { year, count })
    num = `NR-${year}-${String(count).padStart(4, '0')}`
  })
  return num
}

// ── Invoice creator ─────────────────────────────────────────────────

async function createInvoice(uid, { provider, transactionId, planId, grossAmount, currency = 'EUR' }) {
  if (!grossAmount || grossAmount <= 0) return null

  const [userSnap, invoiceNumber] = await Promise.all([
    db.collection('users').doc(uid).get(),
    getNextInvoiceNumber(),
  ])

  const userData  = userSnap.exists ? userSnap.data() : {}
  const plan      = PLANS_MAP[planId] ?? { label: planId, price: grossAmount }
  const netAmount = +(grossAmount / (1 + VAT_RATE)).toFixed(2)
  const vatAmount = +(grossAmount - netAmount).toFixed(2)

  const invoice = {
    userId: uid,
    invoiceNumber,
    issuedAt:      admin.firestore.FieldValue.serverTimestamp(),
    provider,
    transactionId,
    planId,
    planLabel:     plan.label,
    grossAmount,
    netAmount,
    vatAmount,
    vatRate:       VAT_RATE,
    currency,
    status:        'paid',
    seller:        SELLER,
    buyer: {
      fullName:   userData.name                       ?? '',
      email:      userData.email                      ?? '',
      company:    userData.billingInfo?.company    ?? '',
      vatId:      userData.billingInfo?.vatId      ?? '',
      address:    userData.billingInfo?.address    ?? '',
      city:       userData.billingInfo?.city       ?? '',
      postalCode: userData.billingInfo?.postalCode ?? '',
      country:    userData.billingInfo?.country    ?? '',
    },
  }

  await db.collection('invoices').add(invoice)
  return { invoice, userData }
}

// ── Welcome email trigger ───────────────────────────────────────────

exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  const name        = user.displayName || user.email?.split('@')[0] || 'there'
  const trialEnd    = new Date(Date.now() + 3 * 86400000)
  const trialEndStr = trialEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  await sendEmail({ to: user.email, ...welcomeEmail(name, trialEndStr) })
})

// ── Invoice email trigger ───────────────────────────────────────────

exports.onInvoiceCreated = functions.firestore
  .document('invoices/{invoiceId}')
  .onCreate(async (snap) => {
    const inv = snap.data()
    const to  = inv.buyer?.email
    if (!to) return

    const name = inv.buyer?.fullName || inv.buyer?.company || 'there'
    await sendEmail({ to, ...invoiceEmail(name, inv) })
  })

// ── PayPal helpers ─────────────────────────────────────────────────

async function getPayPalAccessToken() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env
  const base = 'https://api-m.paypal.com'
  const { data } = await axios.post(
    `${base}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      auth:    { username: PAYPAL_CLIENT_ID, password: PAYPAL_CLIENT_SECRET },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  )
  return { token: data.access_token, base }
}

async function verifyPayPalWebhook(req, webhookId) {
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
// Register in PayPal Developer → Webhooks. Events:
//   BILLING.SUBSCRIPTION.ACTIVATED
//   BILLING.SUBSCRIPTION.CANCELLED
//   BILLING.SUBSCRIPTION.SUSPENDED
//   BILLING.SUBSCRIPTION.EXPIRED
//   PAYMENT.SALE.COMPLETED
//   PAYMENT.SALE.DENIED

exports.paypalWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') { res.sendStatus(405); return }

  try {
    const valid = await verifyPayPalWebhook(req, process.env.PAYPAL_WEBHOOK_ID)
    if (!valid) { res.sendStatus(400); return }
  } catch (e) {
    functions.logger.error('PayPal webhook verification failed', e)
    res.sendStatus(400); return
  }

  const { event_type, resource } = req.body
  const subscriptionId = resource?.billing_agreement_id ?? resource?.id
  if (!subscriptionId) { res.sendStatus(200); return }

  const snap = await db.collection('users')
    .where('paypalSubscriptionId', '==', subscriptionId).limit(1).get()
  if (snap.empty) { res.sendStatus(200); return }

  const userDoc = snap.docs[0]
  const uid     = userDoc.id

  const statusMap = {
    'BILLING.SUBSCRIPTION.ACTIVATED': { subscriptionStatus: 'active'    },
    'BILLING.SUBSCRIPTION.CANCELLED': { subscriptionStatus: 'cancelled' },
    'BILLING.SUBSCRIPTION.SUSPENDED': { subscriptionStatus: 'past_due'  },
    'BILLING.SUBSCRIPTION.EXPIRED':   { subscriptionStatus: 'cancelled' },
    'PAYMENT.SALE.DENIED':            { subscriptionStatus: 'past_due'  },
  }

  const update = statusMap[event_type]
  if (update) await userDoc.ref.update(update)

  if (event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    const planId   = userDoc.data()?.planId
    const plan     = PLANS_MAP[planId] ?? PLANS_MAP.starter
    const userData = userDoc.data() ?? {}
    const name     = userData.name || 'there'
    const email    = userData.email
    if (email) await sendEmail({ to: email, ...subscriptionEmail(name, plan.label, plan.price) })
  }

  if (event_type === 'PAYMENT.SALE.COMPLETED') {
    await userDoc.ref.update({ lastPaymentAt: admin.firestore.FieldValue.serverTimestamp() })
    const grossAmount = parseFloat(resource?.amount?.total ?? '0')
    const planId      = userDoc.data()?.planId ?? 'starter'
    try {
      await createInvoice(uid, {
        provider:      'paypal',
        transactionId: resource.id,
        planId,
        grossAmount,
        currency:      (resource?.amount?.currency ?? 'EUR').toUpperCase(),
      })
    } catch (e) {
      functions.logger.error('Failed to create PayPal invoice', e)
    }
  }

  res.sendStatus(200)
})

// ── Order notification ──────────────────────────────────────────────

exports.onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap) => {
    const order = snap.data()
    const { configuratorId, formData = {}, variantId, configuratorName } = order

    if (!configuratorId) return

    const cfgSnap = await db.collection('configurators').doc(configuratorId).get()
    if (!cfgSnap.exists) return

    const cfg               = cfgSnap.data()
    const notificationEmail = cfg.orderForm?.notificationEmail
    if (!notificationEmail) return

    const name = configuratorName ?? cfg.name
    await sendEmail({ to: notificationEmail, ...orderEmail(name, variantId, formData) })

    functions.logger.info(`Order notification sent to ${notificationEmail}`)
  })
