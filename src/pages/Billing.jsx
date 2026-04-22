import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useAuth } from '../hooks/useAuth.jsx'
import { updateUser, getUserInvoices, createClientInvoice } from '../firebase/db.js'
import { PLANS, getPlan, TRIAL_DAYS } from '../config/plans.js'
import { CmsSidebar } from '../components/CmsSidebar.jsx'

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID

const PAYPAL_PLAN_IDS = {
  starter:    import.meta.env.VITE_PAYPAL_PLAN_ID_STARTER,
  pro:        import.meta.env.VITE_PAYPAL_PLAN_ID_PRO,
  business:   import.meta.env.VITE_PAYPAL_PLAN_ID_BUSINESS,
  enterprise: import.meta.env.VITE_PAYPAL_PLAN_ID_ENTERPRISE,
}

const STRIPE_PRICE_IDS = {
  starter:    import.meta.env.VITE_STRIPE_PRICE_ID_STARTER,
  pro:        import.meta.env.VITE_STRIPE_PRICE_ID_PRO,
  business:   import.meta.env.VITE_STRIPE_PRICE_ID_BUSINESS,
  enterprise: import.meta.env.VITE_STRIPE_PRICE_ID_ENTERPRISE,
}

const STATUS_CONFIG = {
  trial:     { label: 'Free trial',      color: '#d97706' },
  active:    { label: 'Active',          color: '#16a34a' },
  cancelled: { label: 'Cancelled',       color: '#dc2626' },
  past_due:  { label: 'Payment overdue', color: '#dc2626' },
}

const COUNTRIES = [
  'Austria','Belgium','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark','Estonia',
  'Finland','France','Germany','Greece','Hungary','Ireland','Italy','Latvia','Lithuania',
  'Luxembourg','Malta','Netherlands','Poland','Portugal','Romania','Slovakia','Slovenia',
  'Spain','Sweden','United Kingdom','Norway','Switzerland','United States','Other',
]

export default function Billing() {
  const { user, profile, setProfile } = useAuth()
  const [searchParams]  = useSearchParams()
  const stripeResult    = searchParams.get('stripe') // 'success' | 'cancel'
  const [invoiceKey, setInvoiceKey] = useState(() => stripeResult === 'success' ? 1 : 0)

  const sub         = profile?.subscriptionStatus ?? 'trial'
  const status      = STATUS_CONFIG[sub] ?? STATUS_CONFIG.trial
  const currentPlan = sub === 'active' ? getPlan(profile?.planId) : null

  const trialEnd = profile?.trialStarted
    ? new Date(profile.trialStarted.toDate?.() ?? profile.trialStarted).getTime() + TRIAL_DAYS * 86400000
    : null
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - Date.now()) / 86400000)) : null

  return (
    <div className="cms-layout billing-page">
      <CmsSidebar active="billing" />
      <div className="cms-content">
      <div className="billing-container">

        <h1 className="billing-title">Billing</h1>

        {stripeResult === 'success' && (
          <div className="billing-stripe-notice success">
            ✓ Payment successful! Your subscription is being activated — this may take a moment.
          </div>
        )}
        {stripeResult === 'cancel' && (
          <div className="billing-stripe-notice cancel">
            Payment cancelled. Choose a plan below to subscribe.
          </div>
        )}

        {/* ── Status card ── */}
        <div className="billing-status-card">
          <div className="billing-status-row">
            <span className="billing-status-dot" style={{ background: status.color }} />
            <span className="billing-status-badge" style={{ color: status.color }}>
              {sub === 'active' && currentPlan ? currentPlan.label : status.label}
            </span>
            {sub === 'active' && currentPlan && (
              <span className="billing-status-price">€{currentPlan.price}<span>/mo</span></span>
            )}
          </div>
          {sub === 'trial' && daysLeft !== null && (
            <div className="billing-trial-note">
              {daysLeft > 0
                ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining · ${PLANS[0].embeds} embeds included`
                : 'Your trial has ended — choose a plan to continue'}
            </div>
          )}
          {sub === 'active' && currentPlan && (
            <div className="billing-trial-note">{currentPlan.embeds} embeds · renews automatically</div>
          )}
          {sub === 'cancelled' && (
            <div className="billing-trial-note">Your subscription has been cancelled. Re-subscribe below to continue.</div>
          )}
        </div>

        {/* ── Billing details ── */}
        <BillingInfoForm user={user} profile={profile} setProfile={setProfile} />

        {/* ── Plan / subscription ── */}
        {sub === 'active'
          ? <ActiveSection user={user} profile={profile} setProfile={setProfile} currentPlan={currentPlan} />
          : <PlanSelector user={user} setProfile={setProfile} onInvoiceCreated={() => setInvoiceKey((k) => k + 1)} />
        }

        {/* ── Invoice history ── */}
        <InvoiceHistory user={user} refreshKey={invoiceKey} />

      </div>{/* billing-container */}
      </div>{/* cms-content */}
    </div>
  )
}

// ── Billing details form ────────────────────────────────────────────

function BillingInfoForm({ user, profile, setProfile }) {
  const saved = profile?.billingInfo ?? {}
  const [form, setForm] = useState({
    fullName:   saved.fullName   ?? '',
    company:    saved.company    ?? '',
    vatId:      saved.vatId      ?? '',
    address:    saved.address    ?? '',
    city:       saved.city       ?? '',
    postalCode: saved.postalCode ?? '',
    country:    saved.country    ?? '',
  })
  const [saving, setSaving]   = useState(false)
  const [savedOk, setSavedOk] = useState(false)

  useEffect(() => {
    if (profile?.billingInfo) {
      setForm((f) => ({ ...f, ...profile.billingInfo }))
    }
  }, [profile?.billingInfo])

  function field(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const clean = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
    await updateUser(user.uid, { billingInfo: clean })
    setProfile((p) => ({ ...p, billingInfo: clean }))
    setSaving(false); setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2500)
  }

  return (
    <div className="billing-section">
      <h2 className="billing-section-title">Billing details</h2>
      <form className="billing-info-form" onSubmit={handleSave}>
        <div className="billing-info-row">
          <div className="field-row">
            <label className="field-label">Full name</label>
            <input className="field-input" placeholder="Jane Smith" value={form.fullName} onChange={field('fullName')} />
          </div>
          <div className="field-row">
            <label className="field-label">Company (optional)</label>
            <input className="field-input" placeholder="Acme OÜ" value={form.company} onChange={field('company')} />
          </div>
        </div>
        <div className="billing-info-row">
          <div className="field-row">
            <label className="field-label">VAT / Tax ID (optional)</label>
            <input className="field-input" placeholder="EE123456789" value={form.vatId} onChange={field('vatId')} />
          </div>
          <div className="field-row">
            <label className="field-label">Street address</label>
            <input className="field-input" placeholder="Tartu mnt 1" value={form.address} onChange={field('address')} />
          </div>
        </div>
        <div className="billing-info-row billing-info-row-3">
          <div className="field-row">
            <label className="field-label">City</label>
            <input className="field-input" placeholder="Tallinn" value={form.city} onChange={field('city')} />
          </div>
          <div className="field-row">
            <label className="field-label">Postal code</label>
            <input className="field-input" placeholder="10111" value={form.postalCode} onChange={field('postalCode')} />
          </div>
          <div className="field-row">
            <label className="field-label">Country</label>
            <select className="field-input" value={form.country} onChange={field('country')}>
              <option value="">Select country</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="billing-info-actions">
          <button className="btn-primary" type="submit" disabled={saving}>
            {savedOk ? '✓ Saved' : saving ? 'Saving…' : 'Save details'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Active subscription section ─────────────────────────────────────

function ActiveSection({ user, profile, setProfile, currentPlan }) {
  const [changingPlan, setChangingPlan] = useState(false)
  const [cancelling, setCancelling]     = useState(false)
  const [cancelled, setCancelled]       = useState(false)

  async function handleCancel() {
    if (!confirm('Cancel your subscription? You will keep access until the end of the billing period.')) return
    setCancelling(true)
    await updateUser(user.uid, { subscriptionStatus: 'cancelled' })
    setProfile((p) => ({ ...p, subscriptionStatus: 'cancelled' }))
    setCancelled(true)
    setCancelling(false)
  }

  if (cancelled) return null

  return (
    <div className="billing-section">
      <h2 className="billing-section-title">Subscription</h2>

      {!changingPlan ? (
        <div className="billing-active-card">
          <div className="billing-active-plan-row">
            <div>
              <div className="billing-active-plan-name">{currentPlan?.label}</div>
              <div className="billing-active-plan-price">€{currentPlan?.price}<span>/month</span></div>
            </div>
            <div className="billing-active-plan-meta">{currentPlan?.embeds} embeds · auto-renews</div>
          </div>
          <div className="billing-active-actions">
            <button className="btn-ghost btn-sm" onClick={() => setChangingPlan(true)}>Change plan</button>
            <a href="https://www.paypal.com/myaccount/autopay" target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
              Payment in PayPal →
            </a>
            <button className="btn-ghost btn-sm billing-cancel-btn" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel subscription'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="billing-change-back">
            <button className="btn-ghost btn-sm" onClick={() => setChangingPlan(false)}>← Back</button>
            <span className="billing-change-note">New subscription replaces current plan immediately.</span>
          </div>
          <PlanSelector user={user} setProfile={setProfile} defaultPlan={profile?.planId} />
        </div>
      )}
    </div>
  )
}

// ── Plan selector ───────────────────────────────────────────────────

function PlanSelector({ user, setProfile, defaultPlan, onInvoiceCreated }) {
  const [selected,      setSelected]     = useState(defaultPlan ?? 'pro')
  const [paymentMethod, setPaymentMethod] = useState('stripe')
  const plan          = PLANS.find((p) => p.id === selected)
  const planPaypalId  = PAYPAL_PLAN_IDS[selected]
  const stripePriceId = STRIPE_PRICE_IDS[selected]

  const hasStripe = !!stripePriceId
  const hasPayPal = !!(PAYPAL_CLIENT_ID && planPaypalId)

  const effectiveMethod = (!hasStripe && !hasPayPal) ? 'demo' : paymentMethod

  return (
    <div className="billing-section">
      <h2 className="billing-section-title">Choose a plan</h2>

      <div className="billing-plan-grid">
        {PLANS.map((p) => (
          <button
            key={p.id}
            className={`billing-plan-option${selected === p.id ? ' selected' : ''}${p.popular ? ' popular' : ''}`}
            onClick={() => setSelected(p.id)}
          >
            {p.popular && <span className="billing-plan-badge">Popular</span>}
            <div className="billing-plan-option-name">{p.label}</div>
            <div className="billing-plan-option-price">€{p.price}<span>/mo</span></div>
            <div className="billing-plan-option-embeds">{p.embeds} embeds</div>
          </button>
        ))}
      </div>

      <div className="billing-subscribe-box">
        <div className="billing-subscribe-summary">
          <strong>{plan.label}</strong> — €{plan.price}/month · {plan.embeds} active embeds · 3-day free trial
        </div>

        {/* Payment method selector */}
        <div className="billing-pay-method-row">
          <span className="billing-pay-method-label">Pay with</span>
          <div className="billing-pay-method-btns">
            {hasStripe && (
              <button
                className={`billing-pay-method-btn${effectiveMethod === 'stripe' ? ' active' : ''}`}
                onClick={() => setPaymentMethod('stripe')}>
                <StripeIcon /> Card (Stripe)
              </button>
            )}
            {hasPayPal && (
              <button
                className={`billing-pay-method-btn${effectiveMethod === 'paypal' ? ' active' : ''}`}
                onClick={() => setPaymentMethod('paypal')}>
                <PayPalIcon /> PayPal
              </button>
            )}
            <button
              className={`billing-pay-method-btn${effectiveMethod === 'demo' ? ' active' : ''}`}
              onClick={() => setPaymentMethod('demo')}>
              Demo
            </button>
          </div>
        </div>

        {/* Payment UI */}
        {effectiveMethod === 'stripe' && (
          <StripeButton key={selected} planId={selected} priceId={stripePriceId} user={user} />
        )}
        {effectiveMethod === 'paypal' && (
          <PayPalButton key={selected} planPaypalId={planPaypalId} planId={selected} user={user} setProfile={setProfile} />
        )}
        {effectiveMethod === 'demo' && (
          <DemoButton key={selected} planId={selected} plan={plan} user={user} setProfile={setProfile} onInvoiceCreated={onInvoiceCreated} />
        )}
      </div>
    </div>
  )
}

// ── Invoice history ─────────────────────────────────────────────────

function InvoiceHistory({ user, refreshKey }) {
  const [invoices, setInvoices] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getUserInvoices(user.uid)
      .then((list) => { setInvoices(list); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user, refreshKey])

  if (loading) return null
  if (!invoices.length) return null

  return (
    <div className="billing-section">
      <h2 className="billing-section-title">Invoice history</h2>
      <div className="billing-invoice-table">
        <div className="billing-invoice-head">
          <span>Invoice</span>
          <span>Date</span>
          <span>Plan</span>
          <span>Amount</span>
          <span>Status</span>
          <span></span>
        </div>
        {invoices.map((inv) => {
          const date = inv.issuedAt
            ? new Date(inv.issuedAt.toDate?.() ?? inv.issuedAt)
            : null
          return (
            <div key={inv.id} className="billing-invoice-row">
              <span className="billing-invoice-num">{inv.invoiceNumber}</span>
              <span>{date ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
              <span>{inv.planLabel}</span>
              <span className="billing-invoice-amount">€{inv.grossAmount?.toFixed(2)}</span>
              <span className="billing-invoice-status paid">Paid</span>
              <span>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => openInvoice(inv)}
                >
                  Download PDF
                </button>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Invoice HTML renderer ───────────────────────────────────────────

function fmt(n) {
  return typeof n === 'number' ? `€${n.toFixed(2)}` : '€0.00'
}

function openInvoice(inv) {
  const date = inv.issuedAt
    ? new Date(inv.issuedAt.toDate?.() ?? inv.issuedAt)
    : new Date()

  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  const b       = inv.buyer  ?? {}
  const s       = inv.seller ?? {}
  const vatPct  = Math.round((inv.vatRate ?? 0.22) * 100)

  const buyerLines = [
    b.company || b.fullName,
    b.company ? b.fullName : null,
    b.vatId   ? `VAT ID: ${b.vatId}` : null,
    b.address,
    [b.postalCode, b.city].filter(Boolean).join(' '),
    b.country,
    b.email,
  ].filter(Boolean)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice ${inv.invoiceNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 13px;
    color: #111;
    background: #fff;
    padding: 48px;
    max-width: 760px;
    margin: 0 auto;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 48px;
  }
  .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
  .brand-sub { font-size: 12px; color: #555; margin-top: 2px; }
  .inv-meta { text-align: right; }
  .inv-num { font-size: 18px; font-weight: 600; }
  .inv-date { color: #555; margin-top: 4px; font-size: 12px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 48px; }
  .party-label { font-size: 11px; font-weight: 600; text-transform: uppercase;
                 letter-spacing: 0.6px; color: #888; margin-bottom: 8px; }
  .party-line { line-height: 1.7; color: #333; }
  .party-line.name { font-weight: 600; color: #111; }
  .divider { border: none; border-top: 1px solid #e8e6e3; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
  thead th {
    font-size: 11px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.5px; color: #888;
    padding: 0 0 10px; border-bottom: 1px solid #e8e6e3;
  }
  thead th:last-child { text-align: right; }
  tbody td { padding: 14px 0; border-bottom: 1px solid #f2f1ef; vertical-align: top; }
  tbody td:last-child { text-align: right; }
  .item-name { font-weight: 500; }
  .item-desc { font-size: 12px; color: #666; margin-top: 2px; }
  .totals { margin-top: 16px; margin-left: auto; width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 5px 0;
                font-size: 13px; color: #444; }
  .totals-row.vat { border-top: 1px solid #e8e6e3; margin-top: 4px; padding-top: 10px; }
  .totals-row.total {
    border-top: 2px solid #111; margin-top: 8px; padding-top: 10px;
    font-weight: 700; font-size: 15px; color: #111;
  }
  .paid-badge {
    display: inline-block; margin-top: 32px;
    background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;
    border-radius: 6px; padding: 6px 14px; font-size: 12px; font-weight: 600;
  }
  .footer {
    margin-top: 64px; padding-top: 20px; border-top: 1px solid #e8e6e3;
    font-size: 11px; color: #888; line-height: 1.7;
  }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="brand">${s.name ?? 'Nordic Render OÜ'}</div>
    <div class="brand-sub">Software as a Service</div>
  </div>
  <div class="inv-meta">
    <div class="inv-num">Invoice ${inv.invoiceNumber}</div>
    <div class="inv-date">${dateStr}</div>
  </div>
</div>

<div class="parties">
  <div>
    <div class="party-label">From</div>
    <div class="party-line name">${s.name ?? 'Nordic Render OÜ'}</div>
    <div class="party-line">Reg. no: ${s.regCode ?? '16885822'}</div>
    <div class="party-line">VAT ID: ${s.vatId ?? 'EE102691294'}</div>
    <div class="party-line">${s.address ?? 'A. H. Tammsaare tee 47, 11316 Tallinn, Estonia'}</div>
    <div class="party-line">${s.email ?? 'billing@nordicrender.com'}</div>
  </div>
  <div>
    <div class="party-label">Bill to</div>
    ${buyerLines.map((l, i) =>
      `<div class="party-line${i === 0 ? ' name' : ''}">${l}</div>`
    ).join('\n    ')}
  </div>
</div>

<hr class="divider">

<table>
  <thead>
    <tr>
      <th style="text-align:left">Description</th>
      <th style="text-align:right">Unit price</th>
      <th style="text-align:right">Qty</th>
      <th style="text-align:right">Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <div class="item-name">${inv.planLabel ?? inv.planId} Plan — Monthly Subscription</div>
        <div class="item-desc">GLB Configurator SaaS · Period: ${dateStr}</div>
      </td>
      <td style="text-align:right">${fmt(inv.netAmount)}</td>
      <td style="text-align:right">1</td>
      <td style="text-align:right">${fmt(inv.netAmount)}</td>
    </tr>
  </tbody>
</table>

<div class="totals">
  <div class="totals-row">
    <span>Subtotal (excl. VAT)</span>
    <span>${fmt(inv.netAmount)}</span>
  </div>
  <div class="totals-row vat">
    <span>VAT ${vatPct}%</span>
    <span>${fmt(inv.vatAmount)}</span>
  </div>
  <div class="totals-row total">
    <span>Total paid</span>
    <span>${fmt(inv.grossAmount)}</span>
  </div>
</div>

<div>
  <span class="paid-badge">✓ PAID</span>
</div>

<div class="footer">
  <strong>${s.name ?? 'Nordic Render OÜ'}</strong> · Reg. no ${s.regCode ?? '16885822'} · VAT ${s.vatId ?? 'EE102691294'}<br>
  ${s.address ?? 'A. H. Tammsaare tee 47, Kristiine linnaosa, 11316 Tallinn, Estonia'}<br>
  Payment processed via ${inv.provider === 'stripe' ? 'Stripe' : inv.provider === 'paypal' ? 'PayPal' : inv.provider} · Transaction ID: ${inv.transactionId ?? '—'}
</div>

<script>window.onload = () => window.print()</script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

// ── Icons ───────────────────────────────────────────────────────────

function StripeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 60 25" aria-hidden="true" fill="none">
      <path fill="#635BFF" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.39-6.83-7.21 0-4.23 2.37-7.27 6.29-7.27 3.74 0 5.96 2.86 5.96 7.17 0 .42-.04 1.17-.05 1.29zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-3.84.82V6.74h3.4l.16 1.02c.55-.62 1.55-1.22 3.03-1.22 2.99 0 5.9 2.97 5.9 7.28 0 4.78-2.98 7.48-5.73 7.48zM40 10.25c-.92 0-1.64.33-2.08.84l.03 6.27c.43.5 1.12.86 2.05.86 1.6 0 2.7-1.75 2.7-3.99 0-2.18-1.11-3.98-2.7-3.98zM27.28 6.74h3.87v13.36h-3.87zm0-3.89l3.87-.82V5.4l-3.87.83zm-6.07 17.25c-1.24 0-2-.48-2.5-1.04l-.14 1.02H15.2V.32l3.84-.82.01 5.66c.54-.54 1.3-1.16 2.68-1.16 2.77 0 5.52 2.75 5.52 7.28 0 4.78-2.68 7.49-5.04 7.49zm-.6-10.07c-.9 0-1.56.35-2.02.86l.02 6.21c.43.5 1.1.84 2 .84 1.53 0 2.64-1.77 2.64-3.94 0-2.24-1.14-3.97-2.64-3.97zm-10.6 2.57l-1.55-.5c-.89-.27-1.07-.56-1.07-.9 0-.55.54-.92 1.46-.92 1.08 0 2.12.37 2.89.85V8.5c-.66-.43-1.83-.88-3.27-.88C5.7 7.62 3.6 9.1 3.6 11.85c0 1.97.97 3.12 3.3 3.84l1.46.5c.9.3 1.23.6 1.23 1.03 0 .58-.52 1-1.62 1-1.3 0-2.67-.55-3.58-1.1v3.53c.83.44 2.16.88 3.65.88 2.82 0 5.01-1.4 5.01-4.14 0-2.05-1.1-3.13-3.34-3.89z"/>
    </svg>
  )
}

function PayPalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#003087" d="M7.266 19.191H4.548a.425.425 0 0 1-.421-.492L6.61.597A.533.533 0 0 1 7.136.2h4.966c1.71 0 3.048.361 3.787 1.203.671.765.868 1.614.673 2.852l-.05.301c-.654 3.364-2.9 4.53-5.759 4.53H9.28a.626.626 0 0 0-.618.527l-.744 4.717-.1.638a.425.425 0 0 1-.42.362l-.132-.139z"/>
      <path fill="#009CDE" d="M19.657 7.563a4.4 4.4 0 0 0-.404-.36c-.673 3.454-2.87 5.21-6.082 5.21H11.66a.627.627 0 0 0-.618.528l-.79 5.01-.224 1.42a.422.422 0 0 0 .418.487h2.934a.55.55 0 0 0 .544-.465l.022-.117.432-2.741.028-.152a.55.55 0 0 1 .543-.465h.343c2.217 0 3.953-.9 4.462-3.503.212-1.092.102-2.005-.465-2.646a2.193 2.193 0 0 0-.632-.406z"/>
      <path fill="#012169" d="M19.005 7.3a4.604 4.604 0 0 0-.567-.126 7.22 7.22 0 0 0-1.147-.089h-3.476a.55.55 0 0 0-.543.465l-.739 4.689-.021.137a.627.627 0 0 1 .618-.528h1.511c2.513 0 4.481-1.021 5.056-3.975.017-.087.032-.172.045-.254a3.34 3.34 0 0 0-.737-.32z"/>
    </svg>
  )
}

// ── Demo button ─────────────────────────────────────────────────────

const SELLER_INFO = {
  name:    'Nordic Render OÜ',
  regCode: '16885822',
  vatId:   'EE102691294',
  address: 'A. H. Tammsaare tee 47, Kristiine linnaosa, 11316 Tallinn, Estonia',
  email:   'billing@nordicrender.com',
}
const VAT_RATE = 0.22

function DemoButton({ planId, plan, user, setProfile, onInvoiceCreated }) {
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState(null)

  async function handleClick() {
    if (!confirm(`Activate "${plan.label}" in demo mode? No real payment will be taken.`)) return
    setLoading(true); setError(null)
    try {
      const now    = new Date()
      const year   = now.getFullYear()
      const suffix = String(Date.now()).slice(-4)
      const invoiceNumber = `DEMO-${year}-${suffix}`
      const grossAmount   = plan.price
      const netAmount     = +(grossAmount / (1 + VAT_RATE)).toFixed(2)
      const vatAmount     = +(grossAmount - netAmount).toFixed(2)

      const update = {
        subscriptionStatus: 'active',
        planId,
        subscribedAt:       now,
        paymentProvider:    'demo',
      }

      // Subscription activation is critical; invoice is best-effort
      await updateUser(user.uid, update)
      createClientInvoice({
        userId:        user.uid,
        invoiceNumber,
        provider:      'demo',
        transactionId: `DEMO-${Date.now()}`,
        planId,
        planLabel:     plan.label,
        grossAmount,
        netAmount,
        vatAmount,
        vatRate:       VAT_RATE,
        currency:      'EUR',
        status:        'paid',
        seller:        SELLER_INFO,
        buyer: {
          fullName: user.displayName ?? '',
          email:    user.email       ?? '',
        },
      }).then(() => onInvoiceCreated?.()).catch(() => {})

      setProfile((p) => ({ ...p, ...update }))
      setDone(true)
    } catch (err) {
      setError(err.message ?? 'Something went wrong.')
    }
    setLoading(false)
  }

  return (
    <div className="billing-stripe-btn-wrap">
      <div className="billing-demo-notice">
        Demo mode — no real payment. Use this to test the subscription flow.
      </div>
      <button className="btn-primary btn-block" onClick={handleClick} disabled={loading || done}>
        {done ? '✓ Demo subscription activated' : loading ? 'Activating…' : `Activate ${plan.label} (Demo)`}
      </button>
      {error && <div className="billing-stripe-error">{error}</div>}
    </div>
  )
}

// ── Stripe button ───────────────────────────────────────────────────

function StripeButton({ planId, priceId, user }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleClick() {
    setLoading(true); setError(null)
    try {
      const fn = httpsCallable(getFunctions(), 'createStripeCheckout')
      const { data } = await fn({
        planId,
        priceId,
        appUrl: window.location.origin,
      })
      window.location.href = data.url
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="billing-stripe-btn-wrap">
      <button className="btn-primary btn-block" onClick={handleClick} disabled={loading}>
        {loading ? 'Redirecting to Stripe…' : 'Subscribe with Card →'}
      </button>
      {error && <div className="billing-stripe-error">{error}</div>}
      <p className="billing-stripe-note">
        Secured by Stripe · 3-day free trial · Cancel any time
      </p>
    </div>
  )
}

// ── PayPal button ───────────────────────────────────────────────────

function PayPalButton({ planPaypalId, planId, user, setProfile }) {
  const btnRef = useRef()

  useEffect(() => {
    const existing = document.getElementById('paypal-sdk')
    if (existing) { renderButton(); return }

    const script = document.createElement('script')
    script.id  = 'paypal-sdk'
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription`
    script.dataset.sdkIntegrationSource = 'button-factory'
    script.onload = renderButton
    document.head.appendChild(script)
    return () => { try { document.head.removeChild(script) } catch {} }

    function renderButton() {
      if (!btnRef.current || !window.paypal) return
      window.paypal.Buttons({
        style: { shape: 'rect', color: 'black', layout: 'vertical', label: 'subscribe' },
        createSubscription: (data, actions) =>
          actions.subscription.create({ plan_id: planPaypalId }),
        onApprove: async (data) => {
          const update = {
            paypalSubscriptionId: data.subscriptionID,
            subscriptionStatus:   'active',
            planId,
            subscribedAt:         new Date(),
            paymentProvider:      'paypal',
          }
          await updateUser(user.uid, update)
          setProfile((p) => ({ ...p, ...update }))
        },
        onError: (err) => console.error('PayPal error', err),
      }).render(btnRef.current)
    }
  }, [])

  return (
    <div className="billing-stripe-btn-wrap">
      <div ref={btnRef} className="billing-paypal-area" />
      <p className="billing-stripe-note">
        Secured by PayPal · 3-day free trial · Cancel any time
      </p>
    </div>
  )
}
