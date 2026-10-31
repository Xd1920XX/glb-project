import { useState } from 'react'
import { t, resolveLabel } from '../i18n.js'

function encodeForm(data) {
  return Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

function OrderForm({ color, interior, strings, lang }) {
  const colorLabel = resolveLabel(color, lang)
  const interiorLabel = resolveLabel(interior, lang)
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
          color: colorLabel,
          heater: interiorLabel,
        }),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
    } catch {
      setError(strings.errGeneric)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="order-success">
        <div className="order-success-icon">✓</div>
        <h3>{strings.thanks}</h3>
        <p>{strings.thanksBody}</p>
        <button className="order-btn" onClick={() => setSubmitted(false)}>{strings.back}</button>
      </div>
    )
  }

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <div className="order-summary">
        <p className="section-label">{strings.yourConfig}</p>
        <div className="order-summary-row">
          <span>{strings.color}</span>
          <span>
            <span className="order-swatch" style={{ background: color.swatch }} />
            {colorLabel}
          </span>
        </div>
        <div className="order-summary-row">
          <span>{strings.heater}</span>
          <span>{interiorLabel}</span>
        </div>
      </div>

      <div className="order-fields">
        <div className="order-field">
          <label>{strings.fullName}</label>
          <input name="name" value={form.name} onChange={handleChange} required placeholder={strings.phName} />
        </div>
        <div className="order-field">
          <label>{strings.email}</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder={strings.phEmail} />
        </div>
        <div className="order-field">
          <label>{strings.phone}</label>
          <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder={strings.phPhone} />
        </div>
        <div className="order-field">
          <label>{strings.address}</label>
          <input name="address" value={form.address} onChange={handleChange} placeholder={strings.phAddress} />
        </div>
        <div className="order-field">
          <label>{strings.wishes}</label>
          <textarea name="message" value={form.message} onChange={handleChange} rows={3} placeholder={strings.phWishes} />
        </div>
      </div>

      {error && <p className="order-error">{error}</p>}
      <button type="submit" className="order-btn" disabled={loading}>
        {loading ? strings.sending : strings.send}
      </button>
    </form>
  )
}

export function SaunaPanel({
  modelName, colors, interiors, rooms,
  colorId, view, interiorId, roomId, lang = 'en',
  onColorChange, onViewChange, onInteriorChange, onRoomChange,
}) {
  const strings = t[lang]
  const color = colors.find((c) => c.id === colorId)
  const interior = interiors.find((i) => i.id === interiorId)
  const currentRoom = rooms?.find((r) => r.id === roomId)
  const showHeaters = !rooms || !currentRoom?.path

  return (
    <div className="config-panel">

      <div className="view-tabs">
        <button className={`view-tab${view === 'exterior' ? ' active' : ''}`} onClick={() => onViewChange('exterior')}>
          {strings.exterior}
        </button>
        <button className={`view-tab${view === 'interior' ? ' active' : ''}`} onClick={() => onViewChange('interior')}>
          {strings.interior}
        </button>
        <button className={`view-tab${view === 'order' ? ' active' : ''}`} onClick={() => onViewChange('order')}>
          {strings.summary}
        </button>
      </div>

      <div className="tab-body">
        <div className="config-header">
          <h1 className="config-title">{modelName}</h1>
          <p className="config-subtitle">{strings.configureSub}</p>
        </div>

        {view === 'exterior' && (
          <div className="tab-section">
            <p className="section-label">{strings.color}</p>
            <div className="color-grid">
              {colors.map((c) => (
                <button
                  key={c.id}
                  className={`color-card${colorId === c.id ? ' selected' : ''}`}
                  onClick={() => onColorChange(c.id)}
                >
                  <span className="color-dot" style={{ background: c.swatch }} />
                  <span className="color-label">{resolveLabel(c, lang)}</span>
                </button>
              ))}
            </div>
            <button className="next-btn" onClick={() => onViewChange('interior')}>{strings.next}</button>
          </div>
        )}

        {view === 'interior' && (
          <div className="tab-section">
            {rooms && (
              <>
                <p className="section-label">{strings.room}</p>
                <div className="color-grid" style={{ marginBottom: 20 }}>
                  {rooms.map((r) => (
                    <button
                      key={r.id}
                      className={`color-card${roomId === r.id ? ' selected' : ''}`}
                      onClick={() => onRoomChange(r.id)}
                    >
                      <span className="color-label">{resolveLabel(r, lang)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {showHeaters && (
              <>
                <p className="section-label">{strings.heater}</p>
                <div className="interior-list">
                  {interiors.map((item) => (
                    <button
                      key={item.id}
                      className={`interior-item${interiorId === item.id ? ' selected' : ''}`}
                      onClick={() => onInteriorChange(item.id)}
                    >
                      {item.icon && (
                        <div className="interior-item-thumb">
                          <img src={item.icon} alt="" />
                        </div>
                      )}
                      <span className="interior-item-label">{resolveLabel(item, lang)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <button className="next-btn" onClick={() => onViewChange('order')}>{strings.next}</button>
          </div>
        )}

        {view === 'order' && (
          <div className="tab-section">
            <OrderForm color={color} interior={interior} strings={strings} lang={lang} />
          </div>
        )}
      </div>
    </div>
  )
}
