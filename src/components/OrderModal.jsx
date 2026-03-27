import { useState, useEffect } from 'react'
import { FRAMES, LIDS, PRICES } from '../config/models.js'

export function OrderModal({ config, price, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' })
  const [submitted, setSubmitted] = useState(false)

  const frame = FRAMES.find((f) => f.id === config.frameId)
  const lid = LIDS.find((l) => l.id === config.lidId)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <div className="modal-success">
            <div className="modal-success-icon">✓</div>
            <h2 className="modal-success-title">Order Received</h2>
            <p className="modal-success-sub">
              We'll be in touch at <strong>{form.email}</strong>
            </p>
            <button className="order-btn" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <h2 className="modal-title">Complete Order</h2>
              <button className="modal-x" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>

            {/* Order summary */}
            <div className="modal-summary">
              <div className="summary-row">
                <span>Frame</span>
                <span>
                  {frame.label} — {frame.slots} slots
                </span>
              </div>
              <div className="summary-row">
                <span>Lid</span>
                <span className="summary-lid">
                  <span
                    className="summary-lid-dot"
                    style={{ background: lid.color }}
                  />
                  {lid.label}
                </span>
              </div>
              {config.showPanels && (
                <div className="summary-row">
                  <span>Front Panels</span>
                  <span>Included</span>
                </div>
              )}
              <div className="summary-row summary-total-row">
                <span>Total</span>
                <span>€{price}</span>
              </div>
            </div>

            {/* Form */}
            <form className="order-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  required
                  placeholder="John Smith"
                  value={form.name}
                  onChange={set('name')}
                />
              </div>
              <div className="form-row">
                <label className="form-label">Email *</label>
                <input
                  className="form-input"
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={set('email')}
                />
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    type="tel"
                    placeholder="+1 234 567 890"
                    value={form.phone}
                    onChange={set('phone')}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Delivery Address *</label>
                  <input
                    className="form-input"
                    required
                    placeholder="123 Main St, City"
                    value={form.address}
                    onChange={set('address')}
                  />
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="Any special instructions…"
                  rows={3}
                  value={form.notes}
                  onChange={set('notes')}
                />
              </div>
              <button type="submit" className="order-btn">
                Place Order · €{price}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
