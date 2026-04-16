import { useState } from 'react'
import { COLORS, INTERIORS } from '../config/sauna.js'

function encodeForm(data) {
  return Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

function OrderForm({ color, interior }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeForm({
          'form-name': 'sauna-order',
          'bot-field': '',
          ...form,
          color: color.label,
          heater: interior.label,
        }),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again or contact us directly.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="order-success">
        <div className="order-success-icon">✓</div>
        <h3>Thank you!</h3>
        <p>Your order request has been prepared. Please send the email that just opened in your mail client.</p>
        <button className="order-btn" onClick={() => setSubmitted(false)}>Back</button>
      </div>
    )
  }

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <div className="order-summary">
        <p className="section-label">Your configuration</p>
        <div className="order-summary-row">
          <span>Color</span>
          <span>
            <span className="order-swatch" style={{ background: color.swatch }} />
            {color.label}
          </span>
        </div>
        <div className="order-summary-row">
          <span>Heater</span>
          <span>{interior.label}</span>
        </div>
      </div>

      <div className="order-fields">
        <div className="order-field">
          <label>Full name *</label>
          <input name="name" value={form.name} onChange={handleChange} required placeholder="Jane Smith" />
        </div>
        <div className="order-field">
          <label>Email *</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="jane@example.com" />
        </div>
        <div className="order-field">
          <label>Phone</label>
          <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
        </div>
        <div className="order-field">
          <label>Delivery address</label>
          <input name="address" value={form.address} onChange={handleChange} placeholder="Street, city, country" />
        </div>
        <div className="order-field">
          <label>Additional wishes</label>
          <textarea name="message" value={form.message} onChange={handleChange} rows={3} placeholder="Any special requests…" />
        </div>
      </div>

      {error && <p className="order-error">{error}</p>}
      <button type="submit" className="order-btn" disabled={loading}>
        {loading ? 'Sending…' : 'Send order request'}
      </button>
    </form>
  )
}

export function SaunaPanel({
  colorId, view, interiorId,
  onColorChange, onViewChange, onInteriorChange,
}) {
  const color = COLORS.find((c) => c.id === colorId)
  const interior = INTERIORS.find((i) => i.id === interiorId)

  return (
    <div className="config-panel">

      <div className="view-tabs">
        <button className={`view-tab${view === 'exterior' ? ' active' : ''}`} onClick={() => onViewChange('exterior')}>
          Exterior
        </button>
        <button className={`view-tab${view === 'interior' ? ' active' : ''}`} onClick={() => onViewChange('interior')}>
          Interior
        </button>
        <button className={`view-tab${view === 'order' ? ' active' : ''}`} onClick={() => onViewChange('order')}>
          Order
        </button>
      </div>

      <div className="tab-body">
        <div className="config-header">
          <h1 className="config-title">City XS</h1>
          <p className="config-subtitle">Configure your sauna</p>
        </div>

        {view === 'exterior' && (
          <div className="tab-section">
            <p className="section-label">Color</p>
            <div className="color-grid">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  className={`color-card${colorId === c.id ? ' selected' : ''}`}
                  onClick={() => onColorChange(c.id)}
                >
                  <span className="color-dot" style={{ background: c.swatch }} />
                  <span className="color-label">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'interior' && (
          <div className="tab-section">
            <p className="section-label">Heater</p>
            <div className="interior-list">
              {INTERIORS.map((item) => (
                <button
                  key={item.id}
                  className={`interior-item${interiorId === item.id ? ' selected' : ''}`}
                  onClick={() => onInteriorChange(item.id)}
                >
                  <div className="interior-item-thumb">
                    <img src={item.path} alt="" />
                  </div>
                  <span className="interior-item-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'order' && (
          <div className="tab-section">
            <OrderForm color={color} interior={interior} />
          </div>
        )}
      </div>
    </div>
  )
}
