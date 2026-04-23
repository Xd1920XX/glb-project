import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { updateUser, getUserInvoices } from '../firebase/db.js'
import { PLANS, getPlan, TRIAL_DAYS } from '../config/plans.js'
import { CmsSidebar } from '../components/CmsSidebar.jsx'

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID

const PAYPAL_PLAN_IDS = {
  starter:    import.meta.env.VITE_PAYPAL_PLAN_ID_STARTER,
  pro:        import.meta.env.VITE_PAYPAL_PLAN_ID_PRO,
  business:   import.meta.env.VITE_PAYPAL_PLAN_ID_BUSINESS,
  enterprise: import.meta.env.VITE_PAYPAL_PLAN_ID_ENTERPRISE,
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
  const [invoiceKey, setInvoiceKey] = useState(0)

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
              Manage in PayPal →
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
  const [selected, setSelected] = useState(defaultPlan ?? 'pro')
  const plan         = PLANS.find((p) => p.id === selected)
  const planPaypalId = PAYPAL_PLAN_IDS[selected]

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
            <div className="billing-plan-option-divider" />
            <div className="billing-plan-option-embeds">{p.embeds} embeds</div>
          </button>
        ))}
      </div>

      <div className="billing-subscribe-box">
        <div className="billing-subscribe-summary">
          <div className="billing-subscribe-summary-left">
            <div className="billing-subscribe-plan-name">{plan.label} Plan</div>
            <div className="billing-subscribe-plan-meta">€{plan.price}/month · {plan.embeds} active embeds</div>
          </div>
          <span className="billing-subscribe-trial-badge">3-day free trial</span>
        </div>
        <div className="billing-subscribe-paypal">
          <PayPalButton key={selected} planPaypalId={planPaypalId} planId={selected} user={user} setProfile={setProfile} onInvoiceCreated={onInvoiceCreated} />
        </div>
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
  Payment processed via ${inv.provider === 'demo' ? 'Demo' : 'PayPal'} · Transaction ID: ${inv.transactionId ?? '—'}
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

function PayPalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#003087" d="M7.266 19.191H4.548a.425.425 0 0 1-.421-.492L6.61.597A.533.533 0 0 1 7.136.2h4.966c1.71 0 3.048.361 3.787 1.203.671.765.868 1.614.673 2.852l-.05.301c-.654 3.364-2.9 4.53-5.759 4.53H9.28a.626.626 0 0 0-.618.527l-.744 4.717-.1.638a.425.425 0 0 1-.42.362l-.132-.139z"/>
      <path fill="#009CDE" d="M19.657 7.563a4.4 4.4 0 0 0-.404-.36c-.673 3.454-2.87 5.21-6.082 5.21H11.66a.627.627 0 0 0-.618.528l-.79 5.01-.224 1.42a.422.422 0 0 0 .418.487h2.934a.55.55 0 0 0 .544-.465l.022-.117.432-2.741.028-.152a.55.55 0 0 1 .543-.465h.343c2.217 0 3.953-.9 4.462-3.503.212-1.092.102-2.005-.465-2.646a2.193 2.193 0 0 0-.632-.406z"/>
      <path fill="#012169" d="M19.005 7.3a4.604 4.604 0 0 0-.567-.126 7.22 7.22 0 0 0-1.147-.089h-3.476a.55.55 0 0 0-.543.465l-.739 4.689-.021.137a.627.627 0 0 1 .618-.528h1.511c2.513 0 4.481-1.021 5.056-3.975.017-.087.032-.172.045-.254a3.34 3.34 0 0 0-.737-.32z"/>
    </svg>
  )
}

// ── PayPal button ───────────────────────────────────────────────────

function PayPalButton({ planPaypalId, planId, user, setProfile, onInvoiceCreated }) {
  const btnRef  = useRef()
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!planPaypalId) return
    setError(null)

    let cancelled = false

    function renderButton() {
      if (cancelled || !btnRef.current || !window.paypal) return
      btnRef.current.innerHTML = ''
      window.paypal.Buttons({
        style: { shape: 'rect', color: 'black', layout: 'vertical', label: 'subscribe' },
        createSubscription: (_data, actions) =>
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
          onInvoiceCreated?.()
        },
        onError: (err) => {
          console.error('PayPal error', err)
          setError('Payment could not be completed. Please try again.')
        },
      }).render(btnRef.current)
    }

    const existing = document.getElementById('paypal-sdk')
    if (existing && window.paypal) {
      renderButton()
      return () => { cancelled = true }
    }

    // Remove any broken/partial previous script tag
    if (existing) existing.remove()

    const script = document.createElement('script')
    script.id  = 'paypal-sdk'
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription`
    script.dataset.sdkIntegrationSource = 'button-factory'
    script.onload  = renderButton
    script.onerror = () => setError('Failed to load PayPal. Check your connection and try again.')
    document.head.appendChild(script)

    return () => {
      cancelled = true
      try { document.head.removeChild(script) } catch {}
    }
  }, [planPaypalId])

  if (!planPaypalId) {
    return (
      <div className="billing-stripe-btn-wrap">
        <p className="billing-stripe-note" style={{ color: '#dc2626' }}>
          This plan is not yet available for purchase. Please contact support.
        </p>
      </div>
    )
  }

  return (
    <div className="billing-stripe-btn-wrap">
      <div ref={btnRef} className="billing-paypal-area" />
      <p className="billing-stripe-note" style={error ? { color: '#dc2626' } : {}}>
        {error ?? 'Secured by PayPal · Cancel any time'}
      </p>
    </div>
  )
}

