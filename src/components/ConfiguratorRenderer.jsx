import { useState, useRef, useEffect, useMemo } from 'react'
import { InteriorViewer } from './InteriorViewer.jsx'
import { SaunaViewer3D } from './SaunaViewer3D.jsx'
import { saveOrder } from '../firebase/db.js'

// ── Group helpers ────────────────────────────────────────────────────

const DEFAULT_GROUP_ID = '__default__'

function computeGroups(variants, variantGroups) {
  const grouped = {}
  for (const v of variants) {
    const gid = v.groupId || DEFAULT_GROUP_ID
    if (!grouped[gid]) grouped[gid] = []
    grouped[gid].push(v)
  }
  // Named groups first (only those that have variants)
  const named = variantGroups
    .filter((g) => (grouped[g.id]?.length ?? 0) > 0)
    .map((g) => ({ ...g, variants: grouped[g.id] }))
  // Unassigned variants go to a default group (no label)
  if (grouped[DEFAULT_GROUP_ID]?.length) {
    named.push({ id: DEFAULT_GROUP_ID, label: '', dependsOnVariantId: null, variants: grouped[DEFAULT_GROUP_ID] })
  }
  return named
}

function computeVisibleGroups(groups, selectedByGroup) {
  return groups.filter((g) => {
    if (!g.dependsOnVariantId) return true
    return Object.values(selectedByGroup).includes(g.dependsOnVariantId)
  })
}

/**
 * Generic configurator renderer.
 * config = { variants, interiors, background, viewerSettings, variantGroups, hotspots, watermark }
 */
export function ConfiguratorRenderer({ config, hotspotPlaceId = null, onHotspotPlace = null }) {
  const { variants = [], interiors = [], background, viewerSettings = {}, exteriorLabel, interiorLabel, orderForm, theme = 'minimal', darkMode = false, themeColors = {}, variantGroups = [], hotspots = [], watermark } = config

  const extLabel = exteriorLabel || 'Exterior'
  const intLabel = interiorLabel || 'Interior'

  // Build ordered tab list for prev/next navigation
  const tabs = [
    ...(variants.length > 0  ? ['exterior'] : []),
    ...(interiors.length > 0 ? ['interior'] : []),
    ...(orderForm?.enabled   ? ['order']    : []),
  ]

  const [view, setView]               = useState(tabs[0] ?? 'exterior')
  const [selectedByGroup, setSelectedByGroup] = useState({})
  const [frameIndex, setFrameIndex]   = useState(0)
  const [show3D, setShow3D]           = useState(false)
  const [interiorId, setInteriorId]   = useState(interiors[0]?.id ?? null)
  const [orderData, setOrderData]     = useState({})
  const [orderSubmitted, setOrderSubmitted] = useState(false)

  // Compute groups
  const allGroups = useMemo(() => computeGroups(variants, variantGroups), [variants, variantGroups])
  const visibleGroups = useMemo(() => computeVisibleGroups(allGroups, selectedByGroup), [allGroups, selectedByGroup])

  // Initialize / update selection state when groups change
  useEffect(() => {
    setSelectedByGroup((prev) => {
      const next = {}
      for (const g of allGroups) {
        if (g.variants.length > 0) {
          const kept = prev[g.id] && g.variants.find((v) => v.id === prev[g.id])
          next[g.id] = kept ? prev[g.id] : g.variants[0].id
        }
      }
      return next
    })
  }, [allGroups])

  // Primary variant drives the 3D / spinner viewer
  const primaryGroup = visibleGroups[0]
  const primaryVariantId = primaryGroup
    ? (selectedByGroup[primaryGroup.id] ?? primaryGroup.variants[0]?.id)
    : null
  const variant  = variants.find((v) => v.id === primaryVariantId) ?? null
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

  // Price display — sum selected prices across all visible groups
  const hasAnyPrice = variants.some((v) => v.price != null)
  const totalSelectedPrice = hasAnyPrice
    ? visibleGroups.reduce((sum, g) => {
        const selId = selectedByGroup[g.id] ?? g.variants[0]?.id
        const sel = g.variants.find((v) => v.id === selId)
        return sel?.price != null ? sum + sel.price : sum
      }, 0)
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
      // Normalize GLB layers — support both old single-glb and new multi-layer variants
      const glbLayers = variant.glbLayers
        ? variant.glbLayers.filter((l) => l.visible !== false && l.glbUrl).map((l) => ({ url: l.glbUrl, materialOverrides: l.materialOverrides ?? {} }))
        : variant.glbUrl
          ? [{ url: variant.glbUrl, materialOverrides: variant.materialOverrides ?? {} }]
          : []

      const lightProps = {
        ambientIntensity: ((vs.glbAmbientIntensity ?? 25) / 100) * 2,
        keyIntensity:     ((vs.glbKeyIntensity     ?? 40) / 100) * 3,
        fillIntensity:    ((vs.glbFillIntensity    ?? 20) / 100) * 1.5,
        envIntensity:     ((vs.glbEnvIntensity     ?? 50) / 100) * 2,
      }
      const sharedProps = {
        autoRotate: vs.glbAutoRotate,
        autoRotateSpeed: vs.glbAutoRotateSpeed ?? 1,
        environment: vs.glbEnvironment ?? 'city',
        allowZoom: vs.glbAllowZoom ?? true,
        fov: vs.glbFov ?? 42,
        surroundLighting: vs.glbSurroundLighting ?? false,
        ...lightProps,
      }
      if (show3D && glbLayers.length > 0) {
        return <SaunaViewer3D key={variant.id + '3d'} glbLayers={glbLayers} {...sharedProps} />
      }
      if (variant.type === 'glb' && glbLayers.length > 0) {
        return <SaunaViewer3D key={variant.id} glbLayers={glbLayers} {...sharedProps} />
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

  const can3D = (view === 'exterior' || view === 'order') && (
    variant?.glbLayers?.some((l) => l.visible !== false && l.glbUrl) ||
    !!variant?.glbUrl
  )

  async function handleOrderSubmit(e) {
    e.preventDefault()
    if (config.id && config.ownerId) {
      try {
        const allSelections = visibleGroups.map((g) => {
          const selId = selectedByGroup[g.id] ?? g.variants[0]?.id
          const sel = g.variants.find((v) => v.id === selId)
          return sel ? `${g.label || extLabel}: ${sel.label}` : null
        }).filter(Boolean).join(', ')
        await saveOrder(config.id, config.ownerId, {
          variantId: allSelections || (variant?.label ?? primaryVariantId),
          interiorId: interior?.label ?? interiorId,
          formData: orderData,
          configuratorName: config.name ?? '',
        })
      } catch { /* non-fatal */ }
    }
    setOrderSubmitted(true)
  }

  // ── Panel ────────────────────────────────────────────────────────
  return (
    <div
      className="configurator-view"
      data-theme={theme}
      data-dark={darkMode ? 'true' : undefined}
      style={{
        ...(themeColors.accent  && { '--accent':  themeColors.accent  }),
        ...(themeColors.surface && { '--surface': themeColors.surface }),
        ...(themeColors.bg      && { '--bg':      themeColors.bg      }),
        ...(themeColors.border  && { '--border':  themeColors.border  }),
      }}
    >
      <div
        className={`viewer-pane${hotspotPlaceId ? ' hotspot-place-mode' : ''}`}
        style={viewerStyle}
        onClick={hotspotPlaceId ? (e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
          const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
          onHotspotPlace?.(x, y)
        } : undefined}
      >
        {renderViewer()}
        {can3D && (
          <button className={`view-3d-btn${show3D ? ' active' : ''}`}
            onClick={() => setShow3D((v) => !v)}>
            {show3D ? 'Renders' : '3D'}
          </button>
        )}
        {hotspotPlaceId && (
          <div className="hotspot-place-hint">Click anywhere to position hotspot</div>
        )}
        {!hotspotPlaceId && hotspots.map((hs) => (
          <HotspotPin key={hs.id} hotspot={hs} />
        ))}
        {watermark?.enabled && watermark.imageUrl && (
          <img
            className={`viewer-watermark viewer-watermark--${watermark.position ?? 'bottom-right'}`}
            src={watermark.imageUrl}
            alt=""
            style={{ opacity: (watermark.opacity ?? 80) / 100, width: `${watermark.size ?? 15}%` }}
          />
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
                {hasAnyPrice && totalSelectedPrice != null && (
                  <div className="config-price-display">
                    <span className="config-price-value">{fmt(totalSelectedPrice)}</span>
                  </div>
                )}

                {visibleGroups.map((group) => (
                  <div key={group.id} className="variant-group-section">
                    {group.label && <p className="section-label">{group.label}</p>}
                    <div className="color-grid">
                      {group.variants.map((v) => (
                        <button key={v.id}
                          className={`color-card${selectedByGroup[group.id] === v.id ? ' selected' : ''}`}
                          onClick={() => {
                            setSelectedByGroup((prev) => ({ ...prev, [group.id]: v.id }))
                            setFrameIndex(0)
                            setShow3D(false)
                          }}>
                          <SwatchDot variant={v} />
                          <div className="color-card-info">
                            <span className="color-label">{v.label}</span>
                            {v.price != null && <span className="color-price">{fmt(v.price)}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
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
                {(variants.length > 0 || interior) && (
                  <div className="order-summary">
                    <p className="order-summary-label">Your selection</p>
                    {visibleGroups.map((g) => {
                      const selId = selectedByGroup[g.id] ?? g.variants[0]?.id
                      const sel = g.variants.find((v) => v.id === selId)
                      if (!sel) return null
                      return (
                        <div key={g.id} className="order-summary-row">
                          <span>{g.label || extLabel}</span>
                          <span>
                            <SwatchDot variant={sel} />
                            {' '}{sel.label}
                            {sel.price != null && ` — ${fmt(sel.price)}`}
                          </span>
                        </div>
                      )
                    })}
                    {hasAnyPrice && visibleGroups.length > 1 && totalSelectedPrice != null && (
                      <div className="order-summary-row order-summary-total">
                        <span>Total</span>
                        <span>{fmt(totalSelectedPrice)}</span>
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
                  <form className="order-form" onSubmit={handleOrderSubmit}>
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

// ── Hotspot pin ─────────────────────────────────────────────────────

function HotspotPin({ hotspot }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="hotspot-pin-wrap" style={{ left: `${hotspot.x ?? 50}%`, top: `${hotspot.y ?? 50}%` }}>
      <button
        className={`hotspot-pin${open ? ' open' : ''}`}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        title={hotspot.label}
      >
        +
      </button>
      {open && (
        <div className="hotspot-popup">
          {hotspot.label && <div className="hotspot-popup-title">{hotspot.label}</div>}
          {hotspot.description && <div className="hotspot-popup-body">{hotspot.description}</div>}
        </div>
      )}
    </div>
  )
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
