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

export default function Billing() {
  const { user, profile, setProfile } = useAuth()
  const sub    = profile?.subscriptionStatus ?? 'trial'
  const status = STATUS_CONFIG[sub] ?? STATUS_CONFIG.trial
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

        {/* Status card */}
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
            <div className="billing-trial-note">{currentPlan.embeds} active embeds · renews automatically</div>
          )}
        </div>

        {sub === 'active' ? (
          <div className="billing-active-section">
            <p>Your subscription is active. To cancel or update your payment method, visit your PayPal account.</p>
            <a href="https://www.paypal.com/myaccount/autopay" target="_blank" rel="noreferrer" className="btn-ghost">
              Manage in PayPal →
            </a>
          </div>
        ) : (
          <PlanSelector user={user} setProfile={setProfile} />
        )}
      </div>
    </div>
  )
}

function PlanSelector({ user, setProfile }) {
  const [selected, setSelected] = useState('pro')
  const plan = PLANS.find((p) => p.id === selected)
  const planPaypalId = PLAN_IDS[selected]

  return (
    <div className="billing-plans">
      <p className="billing-plans-heading">Choose a plan</p>

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
          await updateUser(user.uid, {
            paypalSubscriptionId: data.subscriptionID,
            subscriptionStatus: 'active',
            planId,
          })
          setProfile((p) => ({ ...p, subscriptionStatus: 'active', planId, paypalSubscriptionId: data.subscriptionID }))
        },
        onError: (err) => console.error('PayPal error', err),
      }).render(btnRef.current)
    }
  }, [])

  return <div ref={btnRef} className="billing-paypal-area" />
}
