import { useState, useRef, useEffect } from 'react'
import { InteriorViewer } from './InteriorViewer.jsx'
import { SaunaViewer3D } from './SaunaViewer3D.jsx'

/**
 * Generic configurator renderer.
 * config = { variants, interiors, background, viewerSettings }
 */
export function ConfiguratorRenderer({ config }) {
  const { variants = [], interiors = [], background, viewerSettings = {}, exteriorLabel, interiorLabel, orderForm } = config

  const extLabel = exteriorLabel || 'Exterior'
  const intLabel = interiorLabel || 'Interior'

  // Build ordered tab list for prev/next navigation
  const tabs = [
    ...(variants.length > 0  ? ['exterior'] : []),
    ...(interiors.length > 0 ? ['interior'] : []),
    ...(orderForm?.enabled   ? ['order']    : []),
  ]

  const [view, setView]               = useState(tabs[0] ?? 'exterior')
  const [variantId, setVariantId]     = useState(variants[0]?.id ?? null)
  const [frameIndex, setFrameIndex]   = useState(0)
  const [show3D, setShow3D]           = useState(false)
  const [interiorId, setInteriorId]   = useState(interiors[0]?.id ?? null)
  const [orderData, setOrderData]     = useState({})
  const [orderSubmitted, setOrderSubmitted] = useState(false)

  const variant  = variants.find((v) => v.id === variantId)
  const interior = interiors.find((i) => i.id === interiorId)

  // Background style for viewer pane
  const viewerStyle = {}
  if (background?.type === 'color') {
    viewerStyle.background = background.color
  } else if (background?.type === 'image' && background.imageUrl) {
    viewerStyle.backgroundImage = `url(${background.imageUrl})`
    viewerStyle.backgroundSize = 'cover'
    viewerStyle.backgroundPosition = 'center'
  }

  // Price display
  const hasAnyPrice = variants.some((v) => v.price != null)
  const selectedPrice = variant?.price ?? null
  const minPrice = hasAnyPrice
    ? Math.min(...variants.filter((v) => v.price != null).map((v) => v.price))
    : null

  function fmt(n) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
  }

  const vs = viewerSettings

  // ── Viewer ──────────────────────────────────────────────────────
  function renderViewer() {
    if (view === 'interior' && interior?.panoramaUrl) {
      return <InteriorViewer key={interior.id} src={interior.panoramaUrl} />
    }
    if ((view === 'exterior' || view === 'order') && variant) {
      const overrides = variant.materialOverrides ?? {}
      if (show3D && variant.glbUrl) {
        return <SaunaViewer3D key={variant.id + '3d'} glb={variant.glbUrl}
          materialOverrides={overrides}
          autoRotate={vs.glbAutoRotate} autoRotateSpeed={vs.glbAutoRotateSpeed ?? 1}
          environment={vs.glbEnvironment ?? 'city'} allowZoom={vs.glbAllowZoom ?? true}
          fov={vs.glbFov ?? 42} />
      }
      if (variant.type === 'glb' && variant.glbUrl) {
        return <SaunaViewer3D key={variant.id} glb={variant.glbUrl}
          materialOverrides={overrides}
          autoRotate={vs.glbAutoRotate} autoRotateSpeed={vs.glbAutoRotateSpeed ?? 1}
          environment={vs.glbEnvironment ?? 'city'} allowZoom={vs.glbAllowZoom ?? true}
          fov={vs.glbFov ?? 42} />
      }
      if (variant.type === 'spinner' && variant.frames?.length) {
        return (
          <FrameSpinner
            frames={variant.frames.map((f) => f.url)}
            frameIndex={frameIndex}
            onFrameChange={setFrameIndex}
            sensitivity={vs.spinnerSensitivity ?? 18}
            autoRotate={vs.spinnerAutoRotate ?? false}
            autoRotateSpeed={vs.spinnerAutoRotateSpeed ?? 3}
          />
        )
      }
    }
    return <div className="preview-empty">No preview available</div>
  }

  const can3D = (view === 'exterior' || view === 'order') && variant?.glbUrl

  // ── Panel ────────────────────────────────────────────────────────
  return (
    <div className="configurator-view">
      <div className="viewer-pane" style={viewerStyle}>
        {renderViewer()}
        {can3D && (
          <button className={`view-3d-btn${show3D ? ' active' : ''}`}
            onClick={() => setShow3D((v) => !v)}>
            {show3D ? 'Renders' : '3D'}
          </button>
        )}
      </div>

      <div className="config-pane">
        <div className="config-panel">
          {/* Tabs */}
          <div className="view-tabs">
            {variants.length > 0 && (
              <button className={`view-tab${view === 'exterior' ? ' active' : ''}`}
                onClick={() => setView('exterior')}>{extLabel}</button>
            )}
            {interiors.length > 0 && (
              <button className={`view-tab${view === 'interior' ? ' active' : ''}`}
                onClick={() => setView('interior')}>{intLabel}</button>
            )}
            {orderForm?.enabled && (
              <button className={`view-tab${view === 'order' ? ' active' : ''}`}
                onClick={() => { setView('order'); setOrderSubmitted(false) }}>
                {orderForm.submitLabel ? 'Order' : 'Order'}
              </button>
            )}
          </div>

          <div className="tab-body">
            {/* Exterior panel */}
            {view === 'exterior' && variants.length > 0 && (
              <div className="tab-section">
                {/* Price display */}
                {hasAnyPrice && (
                  <div className="config-price-display">
                    {selectedPrice != null
                      ? <span className="config-price-value">{fmt(selectedPrice)}</span>
                      : <span className="config-price-from">From {fmt(minPrice)}</span>
                    }
                  </div>
                )}

                <p className="section-label">Color</p>
                <div className="color-grid">
                  {variants.map((v) => (
                    <button key={v.id}
                      className={`color-card${variantId === v.id ? ' selected' : ''}`}
                      onClick={() => { setVariantId(v.id); setFrameIndex(0); setShow3D(false) }}>
                      <SwatchDot variant={v} />
                      <div className="color-card-info">
                        <span className="color-label">{v.label}</span>
                        {v.price != null && <span className="color-price">{fmt(v.price)}</span>}
                      </div>
                    </button>
                  ))}
                </div>
                <TabNav tabs={tabs} view={view} setView={setView} />
              </div>
            )}

            {/* Interior panel */}
            {view === 'interior' && interiors.length > 0 && (
              <div className="tab-section">
                <p className="section-label">View</p>
                <div className="interior-list">
                  {interiors.map((item) => (
                    <button key={item.id}
                      className={`interior-item${interiorId === item.id ? ' selected' : ''}`}
                      onClick={() => setInteriorId(item.id)}>
                      {item.panoramaUrl && (
                        <div className="interior-item-thumb">
                          <img src={item.panoramaUrl} alt="" />
                        </div>
                      )}
                      <span className="interior-item-label">{item.label}</span>
                    </button>
                  ))}
                </div>
                <TabNav tabs={tabs} view={view} setView={setView} />
              </div>
            )}

            {/* Order panel */}
            {view === 'order' && orderForm?.enabled && (
              <div className="tab-section order-form-section">
                {/* Selection summary */}
                {(variant || interior) && (
                  <div className="order-summary">
                    <p className="order-summary-label">Your selection</p>
                    {variant && (
                      <div className="order-summary-row">
                        <span>Exterior</span>
                        <span>
                          <SwatchDot variant={variant} />
                          {' '}{variant.label}
                          {variant.price != null && ` — ${fmt(variant.price)}`}
                        </span>
                      </div>
                    )}
                    {interior && (
                      <div className="order-summary-row">
                        <span>Interior</span>
                        <span>{interior.label}</span>
                      </div>
                    )}
                  </div>
                )}

                {orderSubmitted ? (
                  <div className="order-success">{orderForm.successMessage || 'Thank you!'}</div>
                ) : (
                  <form className="order-form" onSubmit={(e) => { e.preventDefault(); setOrderSubmitted(true) }}>
                    {(orderForm.fields ?? []).filter((f) => f.enabled !== false).map((field) => (
                      <div key={field.id} className="order-field">
                        <label className="order-field-label">
                          {field.label}{field.required && <span className="order-required"> *</span>}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea className="order-field-input order-field-textarea"
                            required={field.required}
                            value={orderData[field.id] ?? ''}
                            onChange={(e) => setOrderData({ ...orderData, [field.id]: e.target.value })} />
                        ) : (
                          <input className="order-field-input" type={field.type}
                            required={field.required}
                            value={orderData[field.id] ?? ''}
                            onChange={(e) => setOrderData({ ...orderData, [field.id]: e.target.value })} />
                        )}
                      </div>
                    ))}
                    <button type="submit" className="btn-primary order-submit-btn">
                      {orderForm.submitLabel || 'Submit order'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TabNav({ tabs, view, setView }) {
  const idx  = tabs.indexOf(view)
  const prev = tabs[idx - 1]
  const next = tabs[idx + 1]
  if (!prev && !next) return null
  return (
    <div className="tab-nav">
      {prev
        ? <button className="tab-nav-btn" onClick={() => setView(prev)}>← Back</button>
        : <span />
      }
      {next && (
        <button className="tab-nav-btn tab-nav-btn--next" onClick={() => setView(next)}>Next →</button>
      )}
    </div>
  )
}

function SwatchDot({ variant }) {
  if ((variant.swatchType ?? 'color') === 'image' && variant.swatchImageUrl) {
    return <img src={variant.swatchImageUrl} className="color-dot color-dot-img" alt="" />
  }
  return <span className="color-dot" style={{ background: variant.swatch ?? '#888' }} />
}

// ── Frame spinner ───────────────────────────────────────────────────

function FrameSpinner({ frames, frameIndex, onFrameChange, sensitivity = 18, autoRotate = false, autoRotateSpeed = 3 }) {
  const [dragging, setDragging]   = useState(false)
  const [ready, setReady]         = useState(false)
  const prevX    = useRef(null)
  const acc      = useRef(0)
  const frameRef = useRef(frameIndex)
  frameRef.current = frameIndex

  // Preload all frames into browser cache before allowing interaction
  useEffect(() => {
    setReady(false)
    let loaded = 0
    const imgs = frames.map((src) => {
      const img = new Image()
      img.onload = img.onerror = () => {
        loaded++
        if (loaded === frames.length) setReady(true)
      }
      img.src = src
      return img
    })
    return () => imgs.forEach((img) => { img.onload = img.onerror = null })
  }, [frames])

  // Auto-rotate: advance one frame at `autoRotateSpeed` fps, paused while dragging
  useEffect(() => {
    if (!autoRotate || dragging || !ready) return
    const id = setInterval(() => {
      const next = (frameRef.current + 1) % frames.length
      frameRef.current = next
      onFrameChange(next)
    }, 1000 / Math.max(0.5, autoRotateSpeed))
    return () => clearInterval(id)
  }, [autoRotate, autoRotateSpeed, dragging, ready, frames.length])

  function handlePointerDown(e) {
    setDragging(true)
    prevX.current = e.clientX
    acc.current = 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!dragging) return
    const prev = prevX.current
    if (prev == null) return
    acc.current += e.clientX - prev
    prevX.current = e.clientX
    const steps = Math.trunc(acc.current / sensitivity)
    if (steps !== 0) {
      acc.current -= steps * sensitivity
      const next = ((frameRef.current - steps) % frames.length + frames.length) % frames.length
      frameRef.current = next
      onFrameChange(next)
    }
  }

  return (
    <div className={`image-spinner${dragging ? ' dragging' : ''}`}
      onPointerDown={ready ? handlePointerDown : undefined}
      onPointerMove={ready ? handlePointerMove : undefined}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}>
      <img src={frames[frameIndex] ?? frames[0]} alt="" draggable={false} />
      {ready
        ? <div className="spinner-hint">{autoRotate ? 'Drag to rotate' : 'Drag to rotate'}</div>
        : <div className="spinner-hint">Loading…</div>
      }
    </div>
  )
}
