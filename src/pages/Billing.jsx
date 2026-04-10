import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { updateUser } from '../firebase/db.js'
import { PLANS, getPlan } from '../config/plans.js'

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID

const PLAN_IDS = {
  starter:    import.meta.env.VITE_PAYPAL_PLAN_ID_STARTER,
  pro:        import.meta.env.VITE_PAYPAL_PLAN_ID_PRO,
  business:   import.meta.env.VITE_PAYPAL_PLAN_ID_BUSINESS,
  enterprise: import.meta.env.VITE_PAYPAL_PLAN_ID_ENTERPRISE,
}

const STATUS_CONFIG = {
  trial:     { label: 'Free trial',      color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  active:    { label: 'Active',          color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  cancelled: { label: 'Cancelled',       color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  past_due:  { label: 'Payment overdue', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
}

const COUNTRIES = [
  'Austria','Belgium','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark','Estonia',
  'Finland','France','Germany','Greece','Hungary','Ireland','Italy','Latvia','Lithuania',
  'Luxembourg','Malta','Netherlands','Poland','Portugal','Romania','Slovakia','Slovenia',
  'Spain','Sweden','United Kingdom','Norway','Switzerland','United States','Other',
]

export default function Billing() {
  const { user, profile, setProfile } = useAuth()
  const sub         = profile?.subscriptionStatus ?? 'trial'
  const status      = STATUS_CONFIG[sub] ?? STATUS_CONFIG.trial
  const currentPlan = sub === 'active' ? getPlan(profile?.planId) : null

  const trialEnd = profile?.trialStarted
    ? new Date(profile.trialStarted.toDate?.() ?? profile.trialStarted).getTime() + 7 * 86400000
    : null
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - Date.now()) / 86400000)) : null

  return (
    <div className="billing-page">
      <div className="billing-container">

        <div className="billing-back">
          <Link to="/dashboard" className="btn-ghost btn-sm">← Dashboard</Link>
        </div>

        <h1 className="billing-title">Billing</h1>

        {/* ── Status card ── */}
        <div className="billing-status-card" style={{ borderColor: status.border, background: status.bg }}>
          <div className="billing-status-row">
            <div>
              <div className="billing-status-label">Current plan</div>
              <div className="billing-status-value" style={{ color: status.color }}>
                {sub === 'active' && currentPlan
                  ? `${currentPlan.label} — €${currentPlan.price}/month`
                  : status.label}
              </div>
            </div>
            <span className="billing-status-dot" style={{ background: status.color }} />
          </div>
          {sub === 'trial' && daysLeft !== null && (
            <div className="billing-trial-note">
              {daysLeft > 0
                ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining · ${PLANS[0].embeds} embeds included`
                : 'Your trial has ended — choose a plan to continue'}
            </div>
          )}
          {sub === 'active' && currentPlan && (
            <div className="billing-trial-note">
              {currentPlan.embeds} active embeds · renews automatically
            </div>
          )}
          {sub === 'cancelled' && (
            <div className="billing-trial-note">
              Your subscription has been cancelled. Re-subscribe below to continue.
            </div>
          )}
        </div>

        {/* ── Billing details ── */}
        <BillingInfoForm user={user} profile={profile} setProfile={setProfile} />

        {/* ── Plan / subscription ── */}
        {sub === 'active'
          ? <ActiveSection user={user} profile={profile} setProfile={setProfile} currentPlan={currentPlan} />
          : <PlanSelector user={user} setProfile={setProfile} />
        }

        {/* ── Invoice history ── */}
        <InvoiceHistory profile={profile} />

      </div>
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

  // Sync if profile loads after mount
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

function PlanSelector({ user, setProfile, defaultPlan }) {
  const [selected, setSelected] = useState(defaultPlan ?? 'pro')
  const plan        = PLANS.find((p) => p.id === selected)
  const planPaypalId = PLAN_IDS[selected]

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
          <strong>{plan.label}</strong> — €{plan.price}/month · {plan.embeds} active embeds · 7-day free trial
        </div>
        {PAYPAL_CLIENT_ID && planPaypalId
          ? <PayPalButton key={selected} planPaypalId={planPaypalId} planId={selected} user={user} setProfile={setProfile} />
          : <div className="billing-unconfigured">
              PayPal not configured. Set <code>VITE_PAYPAL_CLIENT_ID</code> and <code>VITE_PAYPAL_PLAN_ID_{selected.toUpperCase()}</code> in your <code>.env</code> file.
            </div>
        }
      </div>
    </div>
  )
}

// ── Invoice history ─────────────────────────────────────────────────

function InvoiceHistory({ profile }) {
  const sub = profile?.subscriptionStatus
  if (sub !== 'active' && sub !== 'cancelled') return null

  const plan      = getPlan(profile?.planId)
  const activatedAt = profile?.subscribedAt
    ? new Date(profile.subscribedAt.toDate?.() ?? profile.subscribedAt)
    : null

  const invoices = activatedAt && plan ? [
    {
      id:     profile.paypalSubscriptionId ?? 'SUB-1',
      date:   activatedAt,
      desc:   `${plan.label} — subscription`,
      amount: `€${plan.price}.00`,
      status: sub === 'cancelled' ? 'Cancelled' : 'Paid',
    }
  ] : []

  return (
    <div className="billing-section">
      <h2 className="billing-section-title">Invoice history</h2>
      {invoices.length === 0 ? (
        <p className="billing-empty-note">No invoices yet.</p>
      ) : (
        <div className="billing-invoice-table">
          <div className="billing-invoice-head">
            <span>Date</span>
            <span>Description</span>
            <span>Amount</span>
            <span>Status</span>
          </div>
          {invoices.map((inv) => (
            <div key={inv.id} className="billing-invoice-row">
              <span>{inv.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              <span>{inv.desc}</span>
              <span className="billing-invoice-amount">{inv.amount}</span>
              <span className={`billing-invoice-status ${inv.status === 'Paid' ? 'paid' : 'cancelled'}`}>{inv.status}</span>
            </div>
          ))}
        </div>
      )}
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
          }
          await updateUser(user.uid, update)
          setProfile((p) => ({ ...p, ...update }))
        },
        onError: (err) => console.error('PayPal error', err),
      }).render(btnRef.current)
    }
  }, [])

  return <div ref={btnRef} className="billing-paypal-area" />
}
