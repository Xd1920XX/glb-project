import { useState, useEffect } from 'react'
import { FRAMES, LIDS } from '../config/models.js'
import { LID_VARIANTS } from '../hooks/useConfigurator.js'

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', notes: '' }

export function OrderModal({ frameId, lids, showPanels, price, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitted, setSubmitted] = useState(false)

  const frame = FRAMES.find((f) => f.id === frameId)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  if (submitted) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-success">
            <div className="modal-success-icon">✓</div>
            <h2 className="modal-success-title">Order Received</h2>
            <p className="modal-success-sub">We'll be in touch at <strong>{form.email}</strong></p>
            <button className="order-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Complete Order</h2>
          <button className="modal-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-summary">
          <div className="summary-row">
            <span>Frame</span>
            <span>{frame?.label} — {frame?.slots} slots</span>
          </div>
          {lids.map(({ type, variant }, i) => {
            const lid = LIDS.find((l) => l.id === type)
            const variantLabel = LID_VARIANTS.find((v) => v.id === variant)?.label ?? variant
            return lid ? (
              <div key={i} className="summary-row">
                <span>Slot {i + 1}</span>
                <span className="summary-lid">
                  <span className="summary-lid-dot" style={{ background: lid.color }} />
                  {lid.label} — {variantLabel}
                </span>
              </div>
            ) : null
          })}
          {showPanels && (
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

        <form className="order-form" onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}>
          <div className="form-row">
            <label className="form-label">Full Name *</label>
            <input className="form-input" required placeholder="John Smith" value={form.name} onChange={update('name')} />
          </div>
          <div className="form-row">
            <label className="form-label">Email *</label>
            <input className="form-input" type="email" required placeholder="john@example.com" value={form.email} onChange={update('email')} />
          </div>
          <div className="form-grid">
            <div className="form-row">
              <label className="form-label">Phone</label>
              <input className="form-input" type="tel" placeholder="+1 234 567 890" value={form.phone} onChange={update('phone')} />
            </div>
            <div className="form-row">
              <label className="form-label">Delivery Address *</label>
              <input className="form-input" required placeholder="123 Main St, City" value={form.address} onChange={update('address')} />
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">Notes</label>
            <textarea className="form-input form-textarea" placeholder="Any special instructions…" rows={3} value={form.notes} onChange={update('notes')} />
          </div>
          <button type="submit" className="order-btn">Place Order · €{price}</button>
        </form>
      </div>
    </div>
  )
}
