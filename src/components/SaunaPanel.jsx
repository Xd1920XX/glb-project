import { COLORS, INTERIORS } from '../config/sauna.js'

export function SaunaPanel({
  colorId, view, interiorId,
  onColorChange, onViewChange, onInteriorChange,
  showNextBtn = false,
  nextBtnLabel = 'Next →',
}) {
  return (
    <div className="config-panel">

      {/* View tabs — very top */}
      <div className="view-tabs">
        <button
          className={`view-tab${view === 'exterior' ? ' active' : ''}`}
          onClick={() => onViewChange('exterior')}
        >
          Exterior
        </button>
        <button
          className={`view-tab${view === 'interior' ? ' active' : ''}`}
          onClick={() => onViewChange('interior')}
        >
          Interior
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
            {showNextBtn && (
              <button className="next-btn" onClick={() => onViewChange('interior')}>
                {nextBtnLabel}
              </button>
            )}
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
            {showNextBtn && (
              <button className="next-btn" onClick={() => onViewChange('exterior')}>
                ← Back
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
