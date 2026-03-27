import { FRAMES, LIDS, FRONT_PANELS } from '../config/models.js'

function StepHeader({ number, label }) {
  return (
    <div className="step-header">
      <span className="step-number">{number}</span>
      <span className="step-label">{label}</span>
    </div>
  )
}

export function ConfigPanel({
  frameId,
  lids,
  showPanels,
  price,
  onFrameChange,
  onLidChange,
  onPanelsChange,
  onOrder,
}) {
  const frame = FRAMES.find((f) => f.id === frameId)
  if (!frame) return null

  return (
    <div className="config-panel">
      <div className="config-header">
        <h1 className="config-title">Container Configurator</h1>
        <p className="config-subtitle">Design your waste sorting container</p>
      </div>

      {/* Step 1 – Frame */}
      <div className="step">
        <StepHeader number={1} label="Frame Size" />
        <div className="frame-grid">
          {FRAMES.map((f) => (
            <button
              key={f.id}
              className={`frame-card${frameId === f.id ? ' selected' : ''}`}
              onClick={() => onFrameChange(f.id)}
            >
              <div className="frame-card-label">{f.label}</div>
              <div className="frame-card-desc">{f.slots} slots</div>
            </button>
          ))}
        </div>
      </div>

      <hr className="step-divider" />

      {/* Step 2 – Lids per slot */}
      <div className="step">
        <StepHeader number={2} label="Lid per Slot" />
        <div className="slot-rows">
          {lids.map((lidId, i) => (
            <div key={i} className="slot-row">
              <span className="slot-row-label">{i + 1}</span>
              <div className="slot-swatches">
                {LIDS.map((lid) => (
                  <button
                    key={lid.id}
                    title={lid.label}
                    className={`slot-swatch${lidId === lid.id ? ' selected' : ''}`}
                    onClick={() => onLidChange(i, lid.id)}
                  >
                    <span
                      className="slot-swatch-dot"
                      style={{
                        background: lid.color,
                        boxShadow: lid.border
                          ? 'inset 0 0 0 1.5px #ccc'
                          : 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                      }}
                    />
                    <span className="slot-swatch-name">{lid.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <hr className="step-divider" />

      {/* Step 3 – Front Panels */}
      <div className="step">
        <StepHeader number={3} label="Front Panels" />
        <button
          className={`toggle-row${showPanels ? ' active' : ''}`}
          onClick={() => onPanelsChange(!showPanels)}
        >
          <span className="toggle-label">{FRONT_PANELS.label}</span>
          <span className={`toggle-switch${showPanels ? ' on' : ''}`} />
        </button>
      </div>

      <hr className="step-divider" />

      {/* Price summary */}
      <div className="price-section">
        <div className="price-breakdown">
          <div className="price-line">
            <span>Frame {frame.label}</span>
            <span>€{frame.price}</span>
          </div>
          {lids.map((lidId, i) => {
            const lid = LIDS.find((l) => l.id === lidId)
            return lid ? (
              <div key={i} className="price-line">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: lid.color, flexShrink: 0, display: 'inline-block', boxShadow: lid.border ? 'inset 0 0 0 1px #ccc' : undefined }} />
                  Slot {i + 1} — {lid.label}
                </span>
                <span>€{lid.price}</span>
              </div>
            ) : null
          })}
          {showPanels && (
            <div className="price-line">
              <span>Front Panels</span>
              <span>€{FRONT_PANELS.price}</span>
            </div>
          )}
        </div>
        <div className="price-total">
          <span>Total</span>
          <span>€{price}</span>
        </div>
        <button className="order-btn" onClick={onOrder}>
          Order Now
        </button>
      </div>
    </div>
  )
}
