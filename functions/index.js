const functions = require('firebase-functions')
const admin     = require('firebase-admin')
const axios     = require('axios')

admin.initializeApp()
const db = admin.firestore()

// ── Email setup (Brevo transactional API) ──────────────────────────

const APP_URL    = process.env.APP_URL    || 'https://glbconfigurator.com'
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'info@glbconfigurator.com'
const FROM_NAME  = process.env.BREVO_FROM_NAME  || 'GLB Configurator'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@glbconfigurator.com'

function parseRecipient(to) {
  if (Array.isArray(to)) return to.map(parseRecipient).flat()
  if (typeof to === 'object' && to?.email) return [{ email: to.email, name: to.name }]
  const match = /^\s*(.*?)\s*<\s*(.+?)\s*>\s*$/.exec(to ?? '')
  if (match) return [{ name: match[1], email: match[2] }]
  return [{ email: String(to ?? '').trim() }]
}

async function sendEmail({ to, subject, html, text, replyTo }) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    functions.logger.warn('BREVO_API_KEY not configured — skipping email to', to)
    return
  }
  const recipients = parseRecipient(to).filter((r) => r.email)
  if (!recipients.length) {
    functions.logger.warn('sendEmail called without valid recipient'); return
  }
  const payload = {
    sender: { name: FROM_NAME, email: FROM_EMAIL },
    to: recipients,
    subject,
    htmlContent: html,
    textContent: text,
  }
  if (replyTo) {
    const r = parseRecipient(replyTo)[0]
    if (r?.email) payload.replyTo = r
  }
  try {
    await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      timeout: 15000,
    })
  } catch (e) {
    functions.logger.error('Brevo send failed', e.response?.data ?? e.message)
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

// Team invite email
function teamInviteEmail(ownerEmail, inviteUrl, projectName) {
  const scopeLine = projectName
    ? `You've been invited to collaborate on <strong>${projectName}</strong>.`
    : `You've been invited to collaborate on all configurators in this workspace.`
  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;">You're invited</h1>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 8px;">
      ${ownerEmail || 'A teammate'} invited you to Nordic Render.
    </p>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
      ${scopeLine}
    </p>
    <p style="font-size:13px;color:#777;margin:0 0 8px;">Open this link to accept:</p>
    <p style="font-size:13px;color:#111;word-break:break-all;margin:0 0 16px;"><a href="${inviteUrl}" style="color:#111;">${inviteUrl}</a></p>
    ${btn('Accept invite →', inviteUrl)}
  `
  return {
    subject: projectName ? `Invite to edit "${projectName}" on Nordic Render` : 'Invite to collaborate on Nordic Render',
    html:    emailWrapper(`You've been invited to Nordic Render${projectName ? ` — ${projectName}` : ''}.`, body),
    text:    `${ownerEmail || 'A teammate'} invited you to Nordic Render.\n\n${scopeLine.replace(/<[^>]+>/g, '')}\n\nAccept: ${inviteUrl}`,
  }
}

// Contact form — admin notification
function contactAdminEmail({ name, email, subject, message }) {
  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;">New contact message</h1>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
      <strong>${name}</strong> &lt;${email}&gt; sent a message via the contact form.
    </p>
    ${divider()}
    <table cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td style="font-size:13px;color:#777;padding-bottom:10px;">Subject</td>
        <td style="font-size:13px;color:#111;font-weight:600;text-align:right;padding-bottom:10px;">${subject}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#777;padding-bottom:10px;">From</td>
        <td style="font-size:13px;color:#111;text-align:right;padding-bottom:10px;">${name}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#777;">Email</td>
        <td style="font-size:13px;color:#111;text-align:right;"><a href="mailto:${email}" style="color:#111;">${email}</a></td>
      </tr>
    </table>
    ${divider()}
    <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin:0 0 8px;">Message</p>
    <p style="font-size:14px;color:#222;line-height:1.6;white-space:pre-wrap;margin:0;">${message}</p>
  `
  return {
    subject: `[Contact] ${subject} — ${name}`,
    html:    emailWrapper(`${name} sent a message via the contact form.`, body),
    text:    `New contact message\n\nFrom: ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
  }
}

// Contact form — auto-reply to sender
function contactAutoReplyEmail(name) {
  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;">Thanks for reaching out</h1>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px;">
      Hi ${name}, we received your message and will get back to you within one business day.
    </p>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
      In the meantime, feel free to explore the platform — your dashboard has everything you need to start a configurator.
    </p>
    ${btn('Open Nordic Render →', APP_URL)}
  `
  return {
    subject: 'We received your message — Nordic Render',
    html:    emailWrapper('We received your message — we will reply within one business day.', body),
    text:    `Hi ${name},\n\nWe received your message and will get back to you within one business day.\n\n${APP_URL}`,
  }
}

// Model inquiry — admin notification
function modelInquiryEmail({ name, email, description, ...rest }) {
  const extraRows = Object.entries(rest)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `
      <tr>
        <td style="font-size:13px;color:#777;padding:8px 0;border-bottom:1px solid #f2f1ef;width:40%;">${k}</td>
        <td style="font-size:13px;color:#111;padding:8px 0;border-bottom:1px solid #f2f1ef;font-weight:500;">${v}</td>
      </tr>`).join('')
  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;">New model inquiry</h1>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
      <strong>${name}</strong> &lt;${email}&gt; submitted a model inquiry.
    </p>
    ${divider()}
    <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin:0 0 8px;">Description</p>
    <p style="font-size:14px;color:#222;line-height:1.6;white-space:pre-wrap;margin:0 0 16px;">${description}</p>
    ${extraRows ? `
      ${divider()}
      <table cellpadding="0" cellspacing="0" style="width:100%;">${extraRows}</table>` : ''}
  `
  return {
    subject: `[Model inquiry] ${name}`,
    html:    emailWrapper(`${name} submitted a model inquiry.`, body),
    text:    `Model inquiry\n\nFrom: ${name} <${email}>\n\n${description}`,
  }
}

// Subscription cancelled
function subscriptionCancelledEmail(name, planLabel) {
  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;">Your subscription is cancelled</h1>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
      ${name ? `Hi ${name}, ` : ''}your <strong>${planLabel}</strong> subscription has been cancelled. You'll keep access until the end of the current billing period.
    </p>
    <p style="font-size:13px;color:#777;margin:0 0 16px;">
      Changed your mind? You can resubscribe any time — your configurators and media stay in your account.
    </p>
    ${btn('Reactivate Plan →', `${APP_URL}/billing`)}
  `
  return {
    subject: 'Your Nordic Render subscription has been cancelled',
    html:    emailWrapper('Your subscription is cancelled. Resubscribe any time.', body),
    text:    `Your ${planLabel} subscription has been cancelled.\n\nReactivate: ${APP_URL}/billing`,
  }
}

// Payment failed / past due
function paymentFailedEmail(name, planLabel) {
  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;">Payment issue with your subscription</h1>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px;">
      ${name ? `Hi ${name}, ` : ''}we couldn't process the latest payment for your <strong>${planLabel}</strong> plan.
    </p>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
      Update your payment method to avoid losing access. Your published configurators and embeds may be paused if the issue isn't resolved.
    </p>
    ${btn('Fix Payment →', `${APP_URL}/billing`)}
  `
  return {
    subject: 'Action required — payment failed for your Nordic Render subscription',
    html:    emailWrapper('Update your payment method to keep your subscription active.', body),
    text:    `Payment failed for your ${planLabel} plan.\n\nUpdate: ${APP_URL}/billing`,
  }
}

// Trial ending reminder
function trialEndingEmail(name, trialEndDate) {
  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;">Your trial ends tomorrow</h1>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px;">
      ${name ? `Hi ${name}, ` : ''}your free trial ends on <strong>${trialEndDate}</strong>.
    </p>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
      Pick a plan to keep your configurators live. All your data and settings stay exactly as you left them.
    </p>
    ${btn('Choose a Plan →', `${APP_URL}/billing`)}
  `
  return {
    subject: 'Your Nordic Render trial ends tomorrow',
    html:    emailWrapper(`Your free trial ends on ${trialEndDate}.`, body),
    text:    `Your trial ends on ${trialEndDate}.\n\nChoose a plan: ${APP_URL}/billing`,
  }
}

// Trial expired
function trialExpiredEmail(name) {
  const body = `
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;">Your trial has ended</h1>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px;">
      ${name ? `Hi ${name}, ` : ''}your free trial of Nordic Render has ended.
    </p>
    <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
      Subscribe to a plan to keep building and publishing. Your account stays intact — pick up right where you left off.
    </p>
    ${btn('Subscribe Now →', `${APP_URL}/billing`)}
  `
  return {
    subject: 'Your Nordic Render trial has ended',
    html:    emailWrapper('Your free trial has ended — subscribe to keep building.', body),
    text:    `Your trial has ended.\n\nSubscribe: ${APP_URL}/billing`,
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
  starter: { label: 'Starter', price: 19.99 },
  pro:     { label: 'Pro',     price: 69.99 },
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

  const userData = userDoc.data() ?? {}
  const name     = userData.name || 'there'
  const email    = userData.email
  const planId   = userData.planId
  const plan     = PLANS_MAP[planId] ?? PLANS_MAP.starter

  if (event_type === 'BILLING.SUBSCRIPTION.ACTIVATED' && email) {
    await sendEmail({ to: email, ...subscriptionEmail(name, plan.label, plan.price) })
  }

  if ((event_type === 'BILLING.SUBSCRIPTION.CANCELLED'
       || event_type === 'BILLING.SUBSCRIPTION.EXPIRED') && email) {
    await sendEmail({ to: email, ...subscriptionCancelledEmail(name, plan.label) })
  }

  if ((event_type === 'BILLING.SUBSCRIPTION.SUSPENDED'
       || event_type === 'PAYMENT.SALE.DENIED') && email) {
    await sendEmail({ to: email, ...paymentFailedEmail(name, plan.label) })
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

// Email a team invite when a new teamInvites doc is created
exports.onTeamInviteCreated = functions.firestore
  .document('teamInvites/{code}')
  .onCreate(async (snap) => {
    const invite = snap.data()
    const { inviteeEmail, ownerEmail, code, configuratorId } = invite ?? {}
    if (!inviteeEmail || !code) return

    let projectName = null
    if (configuratorId) {
      try {
        const cfgSnap = await db.collection('configurators').doc(configuratorId).get()
        if (cfgSnap.exists) projectName = cfgSnap.data().name ?? null
      } catch (e) { functions.logger.warn('Could not load configurator for invite', e.message) }
    }

    const inviteUrl = `${APP_URL}/join/${code}`
    await sendEmail({ to: inviteeEmail, ...teamInviteEmail(ownerEmail, inviteUrl, projectName) })
    functions.logger.info(`Team invite sent to ${inviteeEmail} (project=${projectName ?? 'all'})`)
  })

// ── Contact form trigger ───────────────────────────────────────────

exports.onContactMessageCreated = functions.firestore
  .document('contact_messages/{id}')
  .onCreate(async (snap) => {
    const msg = snap.data() ?? {}
    const { name, email, subject, message } = msg
    if (!email || !message) return

    await sendEmail({
      to: ADMIN_EMAIL,
      replyTo: { name, email },
      ...contactAdminEmail({ name, email, subject: subject || 'No subject', message }),
    })

    await sendEmail({ to: { name, email }, ...contactAutoReplyEmail(name || 'there') })
  })

// ── Model inquiry trigger ──────────────────────────────────────────

exports.onModelInquiryCreated = functions.firestore
  .document('model_inquiries/{id}')
  .onCreate(async (snap) => {
    const inquiry = snap.data() ?? {}
    if (!inquiry.email || !inquiry.description) return
    await sendEmail({
      to: ADMIN_EMAIL,
      replyTo: { name: inquiry.name, email: inquiry.email },
      ...modelInquiryEmail(inquiry),
    })
  })

// ── Trial reminder + expiry (scheduled daily) ──────────────────────

exports.trialLifecycle = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('UTC')
  .onRun(async () => {
    const now    = Date.now()
    const oneDay = 24 * 60 * 60 * 1000

    const snap = await db.collection('users')
      .where('subscriptionStatus', '==', 'trial').get()

    for (const doc of snap.docs) {
      const u = doc.data() ?? {}
      const startMs = u.trialStarted?.toMillis?.()
      if (!startMs || !u.email) continue

      const trialEndMs = startMs + 3 * oneDay
      const msUntilEnd = trialEndMs - now
      const name       = u.name || 'there'
      const endStr     = new Date(trialEndMs).toLocaleDateString('en-GB',
        { day: '2-digit', month: 'long', year: 'numeric' })

      // Trial ends in ~24h (between 24h and 48h remaining)
      if (msUntilEnd > 0 && msUntilEnd <= oneDay && !u.trialEndingNotifiedAt) {
        await sendEmail({ to: u.email, ...trialEndingEmail(name, endStr) })
        await doc.ref.update({
          trialEndingNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      }

      // Trial ended (and we have not already sent the expired notice)
      if (msUntilEnd <= 0 && !u.trialExpiredNotifiedAt) {
        await sendEmail({ to: u.email, ...trialExpiredEmail(name) })
        await doc.ref.update({
          subscriptionStatus:      'past_due',
          trialExpiredNotifiedAt:  admin.firestore.FieldValue.serverTimestamp(),
        })
      }
    }
  })

// ── Claude chat assistant ─────────────────────────────────────────────

const CLAUDE_MODEL = 'claude-sonnet-4-6'

const CLAUDE_SYSTEM_PROMPT = `You are an AI assistant inside a 3D product configurator builder. The user is editing a configurator that has variants (products), interiors (360° views), background, viewer settings, theme, hotspots, and an order form.

Your job: help the user modify their configurator. Use the provided tools to make changes — never reply with raw JSON for edits. Ask short clarifying questions when the request is ambiguous.

When the user uploads an image, analyze it for: dominant colors, product material/shape, possible variant names. Suggest concrete edits via tools.

Be concise. Use 1-3 sentences plus tool calls. Don't restate the user request.`

const CLAUDE_TOOLS = [
  {
    name: 'add_variant',
    description: 'Add a new product variant to the configurator',
    input_schema: {
      type: 'object',
      properties: {
        label:  { type: 'string', description: 'Display name shown to end users' },
        type:   { type: 'string', enum: ['spinner', 'glb'], description: 'spinner = rotation images, glb = 3D model. Default spinner.' },
        swatch: { type: 'string', description: 'Hex color for the variant swatch, e.g. #c4956a' },
        price:  { type: 'number', description: 'Optional price in EUR' },
      },
      required: ['label'],
    },
  },
  {
    name: 'update_variant',
    description: 'Update fields on an existing variant by its id',
    input_schema: {
      type: 'object',
      properties: {
        variantId: { type: 'string' },
        fields:    { type: 'object', description: 'Partial variant object to merge. Supported keys: label, swatch, price, type.' },
      },
      required: ['variantId', 'fields'],
    },
  },
  {
    name: 'delete_variant',
    description: 'Remove a variant',
    input_schema: {
      type: 'object',
      properties: { variantId: { type: 'string' } },
      required: ['variantId'],
    },
  },
  {
    name: 'set_background',
    description: 'Set the viewer background',
    input_schema: {
      type: 'object',
      properties: {
        type:  { type: 'string', enum: ['none', 'color', 'image'] },
        color: { type: 'string', description: 'Hex color, required when type is color' },
      },
      required: ['type'],
    },
  },
  {
    name: 'set_theme',
    description: 'Set the configurator UI theme',
    input_schema: {
      type: 'object',
      properties: {
        theme:    { type: 'string', enum: ['minimal', 'slate', 'warm', 'forest', 'bold'] },
        darkMode: { type: 'boolean' },
      },
      required: ['theme'],
    },
  },
  {
    name: 'set_viewer_setting',
    description: 'Update a single viewer setting field',
    input_schema: {
      type: 'object',
      properties: {
        key:   { type: 'string', description: 'Setting key, e.g. glbAutoRotate, glbEnableAnimationControls, glbFov, glbEnvironment, glbAllowZoom, glbEnableAR' },
        value: { description: 'New value — boolean, number, or string depending on key' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'set_order_form_enabled',
    description: 'Turn the order form tab on or off',
    input_schema: {
      type: 'object',
      properties: { enabled: { type: 'boolean' } },
      required: ['enabled'],
    },
  },
  {
    name: 'set_labels',
    description: 'Rename the Exterior and/or Interior tab labels',
    input_schema: {
      type: 'object',
      properties: {
        exteriorLabel: { type: 'string' },
        interiorLabel: { type: 'string' },
      },
    },
  },
]

function buildConfigSummary(config) {
  const summary = {
    name: config.name,
    exteriorLabel: config.exteriorLabel,
    interiorLabel: config.interiorLabel,
    theme: config.theme,
    darkMode: config.darkMode,
    background: config.background,
    variantCount: (config.variants ?? []).length,
    variants: (config.variants ?? []).map((v) => ({
      id: v.id,
      label: v.label,
      type: v.type,
      swatch: v.swatch,
      price: v.price,
      hasGlb: !!v.glbUrl || (v.glbLayers ?? []).some((l) => l.glbUrl),
      hasFrames: (v.frames ?? []).length > 0,
    })),
    interiorCount: (config.interiors ?? []).length,
    viewerSettings: config.viewerSettings,
    orderFormEnabled: !!config.orderForm?.enabled,
    hotspotCount: (config.hotspots ?? []).length,
  }
  return summary
}

// Per-plan monthly AI turn quota (only enforced when add-on enabled + using platform key)
const AI_QUOTA_BY_PLAN = {
  trial:   10,
  starter: 50,
  pro:     500,
  custom:  Infinity,
}

function currentMonthKey() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

async function loadProfile(uid) {
  const snap = await db.collection('users').doc(uid).get()
  return snap.exists ? snap.data() : null
}

async function getAiUsageDoc(uid, month) {
  const ref = db.collection('users').doc(uid).collection('aiUsage').doc(month)
  const snap = await ref.get()
  return { ref, count: snap.exists ? (snap.data().turnCount ?? 0) : 0 }
}

exports.chatWithClaude = functions
  .runWith({ secrets: ['ANTHROPIC_API_KEY'], timeoutSeconds: 60, memory: '512MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required')
    }

    const { history = [], userMessage = '', image, config = {}, userApiKey = '' } = data ?? {}
    if (!userMessage && !image) {
      throw new functions.https.HttpsError('invalid-argument', 'userMessage or image required')
    }

    const uid = context.auth.uid
    const profile = await loadProfile(uid)
    const month = currentMonthKey()

    let apiKey
    let usingByok = false
    let usageRef = null
    let currentCount = 0

    if (userApiKey && userApiKey.startsWith('sk-ant-')) {
      // BYOK — no quota, no tracking, no platform cost
      apiKey = userApiKey
      usingByok = true
    } else {
      // Platform key path — require add-on
      if (!profile?.aiAssistantEnabled) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'AI assistant add-on not active. Enable it in Billing or paste your own Anthropic API key.',
        )
      }
      apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Anthropic API key not configured on server')
      }
      const sub  = profile.subscriptionStatus ?? 'trial'
      const plan = sub === 'active' ? (profile.planId ?? 'starter') : 'trial'
      const quota = AI_QUOTA_BY_PLAN[plan] ?? AI_QUOTA_BY_PLAN.trial
      const usage = await getAiUsageDoc(uid, month)
      usageRef = usage.ref
      currentCount = usage.count
      if (currentCount >= quota) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `Monthly AI turn limit reached (${quota}). Upgrade plan or use your own API key.`,
        )
      }
    }

    const Anthropic = require('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey })

    const userContent = []
    if (image?.data && image?.mediaType) {
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: image.mediaType, data: image.data },
      })
    }
    const configSummary = buildConfigSummary(config)
    userContent.push({
      type: 'text',
      text: `Current configurator state:\n\`\`\`json\n${JSON.stringify(configSummary, null, 2)}\n\`\`\`\n\nUser: ${userMessage}`,
    })

    try {
      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: [
          { type: 'text', text: CLAUDE_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        tools: CLAUDE_TOOLS,
        messages: [
          ...history,
          { role: 'user', content: userContent },
        ],
      })
      if (!usingByok && usageRef) {
        await usageRef.set({
          turnCount: admin.firestore.FieldValue.increment(1),
          tokensIn:  admin.firestore.FieldValue.increment(response.usage?.input_tokens ?? 0),
          tokensOut: admin.firestore.FieldValue.increment(response.usage?.output_tokens ?? 0),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true })
      }

      return {
        content: response.content,
        stopReason: response.stop_reason,
        usage: response.usage,
        quota: usingByok ? null : {
          used:  currentCount + 1,
          limit: AI_QUOTA_BY_PLAN[
            (profile?.subscriptionStatus === 'active'
              ? (profile?.planId ?? 'starter')
              : 'trial')
          ] ?? 0,
        },
      }
    } catch (err) {
      functions.logger.error('Anthropic API error', err.message)
      throw new functions.https.HttpsError('internal', err.message ?? 'Anthropic API call failed')
    }
  })

// Read current AI usage for caller
exports.getAiUsage = functions.https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required')
  const uid = context.auth.uid
  const profile = await loadProfile(uid)
  const month = currentMonthKey()
  const usage = await getAiUsageDoc(uid, month)
  const sub  = profile?.subscriptionStatus ?? 'trial'
  const plan = sub === 'active' ? (profile?.planId ?? 'starter') : 'trial'
  const quota = AI_QUOTA_BY_PLAN[plan] ?? AI_QUOTA_BY_PLAN.trial
  return {
    enabled: !!profile?.aiAssistantEnabled,
    used:    usage.count,
    limit:   quota === Infinity ? null : quota,
    month,
  }
})
