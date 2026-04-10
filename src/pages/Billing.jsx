import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useAuth } from '../hooks/useAuth.jsx'
import { updateUser } from '../firebase/db.js'
import { PLANS, getPlan } from '../config/plans.js'

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
  const [searchParams] = useSearchParams()
  const stripeResult   = searchParams.get('stripe') // 'success' | 'cancel'

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
  const [selected,      setSelected]     = useState(defaultPlan ?? 'pro')
  const [paymentMethod, setPaymentMethod] = useState('stripe')
  const plan          = PLANS.find((p) => p.id === selected)
  const planPaypalId  = PAYPAL_PLAN_IDS[selected]
  const stripePriceId = STRIPE_PRICE_IDS[selected]

  const hasStripe = !!stripePriceId
  const hasPayPal = !!(PAYPAL_CLIENT_ID && planPaypalId)

  // Default to demo if neither is configured
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
          <strong>{plan.label}</strong> — €{plan.price}/month · {plan.embeds} active embeds · 7-day free trial
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
          <DemoButton key={selected} planId={selected} plan={plan} user={user} setProfile={setProfile} />
        )}
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

// ── Icons ───────────────────────────────────────────────────────────

function StripeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 60 25" aria-hidden="true" fill="none">
      {/* Stripe wordmark */}
      <path fill="#635BFF" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.39-6.83-7.21 0-4.23 2.37-7.27 6.29-7.27 3.74 0 5.96 2.86 5.96 7.17 0 .42-.04 1.17-.05 1.29zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-3.84.82V6.74h3.4l.16 1.02c.55-.62 1.55-1.22 3.03-1.22 2.99 0 5.9 2.97 5.9 7.28 0 4.78-2.98 7.48-5.73 7.48zM40 10.25c-.92 0-1.64.33-2.08.84l.03 6.27c.43.5 1.12.86 2.05.86 1.6 0 2.7-1.75 2.7-3.99 0-2.18-1.11-3.98-2.7-3.98zM27.28 6.74h3.87v13.36h-3.87zm0-3.89l3.87-.82V5.4l-3.87.83zm-6.07 17.25c-1.24 0-2-.48-2.5-1.04l-.14 1.02H15.2V.32l3.84-.82.01 5.66c.54-.54 1.3-1.16 2.68-1.16 2.77 0 5.52 2.75 5.52 7.28 0 4.78-2.68 7.49-5.04 7.49zm-.6-10.07c-.9 0-1.56.35-2.02.86l.02 6.21c.43.5 1.1.84 2 .84 1.53 0 2.64-1.77 2.64-3.94 0-2.24-1.14-3.97-2.64-3.97zm-10.6 2.57l-1.55-.5c-.89-.27-1.07-.56-1.07-.9 0-.55.54-.92 1.46-.92 1.08 0 2.12.37 2.89.85V8.5c-.66-.43-1.83-.88-3.27-.88C5.7 7.62 3.6 9.1 3.6 11.85c0 1.97.97 3.12 3.3 3.84l1.46.5c.9.3 1.23.6 1.23 1.03 0 .58-.52 1-1.62 1-1.3 0-2.67-.55-3.58-1.1v3.53c.83.44 2.16.88 3.65.88 2.82 0 5.01-1.4 5.01-4.14 0-2.05-1.1-3.13-3.34-3.89z"/>
    </svg>
  )
}

function PayPalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      {/* Dark blue P */}
      <path fill="#003087" d="M7.266 19.191H4.548a.425.425 0 0 1-.421-.492L6.61.597A.533.533 0 0 1 7.136.2h4.966c1.71 0 3.048.361 3.787 1.203.671.765.868 1.614.673 2.852l-.05.301c-.654 3.364-2.9 4.53-5.759 4.53H9.28a.626.626 0 0 0-.618.527l-.744 4.717-.1.638a.425.425 0 0 1-.42.362l-.132-.139z"/>
      {/* Light blue P */}
      <path fill="#009CDE" d="M19.657 7.563a4.4 4.4 0 0 0-.404-.36c-.673 3.454-2.87 5.21-6.082 5.21H11.66a.627.627 0 0 0-.618.528l-.79 5.01-.224 1.42a.422.422 0 0 0 .418.487h2.934a.55.55 0 0 0 .544-.465l.022-.117.432-2.741.028-.152a.55.55 0 0 1 .543-.465h.343c2.217 0 3.953-.9 4.462-3.503.212-1.092.102-2.005-.465-2.646a2.193 2.193 0 0 0-.632-.406z"/>
      {/* Mid blue detail */}
      <path fill="#012169" d="M19.005 7.3a4.604 4.604 0 0 0-.567-.126 7.22 7.22 0 0 0-1.147-.089h-3.476a.55.55 0 0 0-.543.465l-.739 4.689-.021.137a.627.627 0 0 1 .618-.528h1.511c2.513 0 4.481-1.021 5.056-3.975.017-.087.032-.172.045-.254a3.34 3.34 0 0 0-.737-.32z"/>
    </svg>
  )
}

// ── Demo button ─────────────────────────────────────────────────────

function DemoButton({ planId, plan, user, setProfile }) {
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)

  async function handleClick() {
    if (!confirm(`Activate "${plan.label}" in demo mode? No real payment will be taken.`)) return
    setLoading(true)
    const update = {
      subscriptionStatus: 'active',
      planId,
      subscribedAt:       new Date(),
      paymentProvider:    'demo',
    }
    await updateUser(user.uid, update)
    setProfile((p) => ({ ...p, ...update }))
    setDone(true)
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
        Secured by Stripe · 7-day free trial · Cancel any time
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
