import { COLORS, INTERIORS } from '../config/sauna.js'

function StepHeader({ number, label }) {
  return (
    <div className="step-header">
      <span className="step-number">{number}</span>
      <span className="step-label">{label}</span>
    </div>
  )
}

export function SaunaPanel({
  colorId, view, interiorId,
  onColorChange, onViewChange, onInteriorChange,
}) {
  return (
    <div className="config-panel">
      <div className="config-header">
        <h1 className="config-title">City XS</h1>
        <p className="config-subtitle">Configure your sauna</p>
      </div>

      {/* Step 1 – Color */}
      <div className="step">
        <StepHeader number={1} label="Color" />
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

      <hr className="step-divider" />

      {/* Step 2 – View */}
      <div className="step">
        <StepHeader number={2} label="View" />
        <div className="view-toggle">
          <button
            className={`view-btn${view === 'exterior' ? ' active' : ''}`}
            onClick={() => onViewChange('exterior')}
          >
            Exterior
          </button>
          <button
            className={`view-btn${view === 'interior' ? ' active' : ''}`}
            onClick={() => onViewChange('interior')}
          >
            Interior
          </button>
        </div>
      </div>

      {view === 'interior' && (
        <>
          <hr className="step-divider" />
          <div className="step">
            <StepHeader number={3} label="Heater" />
            <div className="interior-grid">
              {INTERIORS.map((item) => (
                <button
                  key={item.id}
                  className={`interior-card${interiorId === item.id ? ' selected' : ''}`}
                  onClick={() => onInteriorChange(item.id)}
                >
                  <div className="interior-thumb">
                    <img src={item.path} alt={item.label} />
                  </div>
                  <span className="interior-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
