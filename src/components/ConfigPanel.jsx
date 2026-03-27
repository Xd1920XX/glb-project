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
  lidId,
  showPanels,
  price,
  onFrameChange,
  onLidChange,
  onPanelsChange,
  onOrder,
}) {
  const frame = FRAMES.find((f) => f.id === frameId)
  const lid = LIDS.find((l) => l.id === lidId)
  if (!frame || !lid) return null
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
          {FRAMES.map((frame) => (
            <button
              key={frame.id}
              className={`frame-card${frameId === frame.id ? ' selected' : ''}`}
              onClick={() => onFrameChange(frame.id)}
            >
              <div className="frame-card-label">{frame.label}</div>
              <div className="frame-card-desc">{frame.slots} slots</div>
            </button>
          ))}
        </div>
      </div>

      <hr className="step-divider" />

      {/* Step 2 – Lids */}
      <div className="step">
        <StepHeader number={2} label="Lid Type" />
        <div className="lid-grid">
          {LIDS.map((lid) => (
            <button
              key={lid.id}
              className={`lid-swatch${lidId === lid.id ? ' selected' : ''}`}
              onClick={() => onLidChange(lid.id)}
            >
              <div
                className="lid-color"
                style={{
                  background: lid.color,
                  boxShadow: lid.border
                    ? 'inset 0 0 0 1.5px #ccc'
                    : 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                }}
              />
              <div className="lid-name">{lid.label}</div>
            </button>
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
          <div className="price-line">
            <span>Lid — {lid.label}</span>
            <span>€{lid.price}</span>
          </div>
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
