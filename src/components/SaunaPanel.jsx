import { COLORS, INTERIORS } from '../config/sauna.js'

export function SaunaPanel({
  colorId, view, interiorId,
  onColorChange, onViewChange, onInteriorChange,
  showNextBtn = true,
  nextBtnLabel = 'Next →',
}) {
  const color    = COLORS.find((c) => c.id === colorId)
  const interior = INTERIORS.find((i) => i.id === interiorId)

  const tabs = ['exterior', 'interior', 'summary']
  const idx  = tabs.indexOf(view)
  const prev = tabs[idx - 1]
  const next = tabs[idx + 1]

  return (
    <div className="config-panel">

      {/* Header */}
      <div className="config-header">
        <h1 className="config-title">City XS</h1>
        <p className="config-subtitle">Configure your sauna</p>
      </div>

      {/* Tabs */}
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
        <button
          className={`view-tab${view === 'summary' ? ' active' : ''}`}
          onClick={() => onViewChange('summary')}
        >
          Summary
        </button>
      </div>

      <div className="tab-body">

        {/* Exterior tab */}
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
                  <div className="color-card-info">
                    <span className="color-label">{c.label}</span>
                  </div>
                </button>
              ))}
            </div>
            {showNextBtn && next && (
              <div className="tab-nav">
                <span />
                <button className="tab-nav-btn tab-nav-btn--next" onClick={() => onViewChange(next)}>
                  {nextBtnLabel}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Interior tab */}
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
              <div className="tab-nav">
                {prev
                  ? <button className="tab-nav-btn" onClick={() => onViewChange(prev)}>← Back</button>
                  : <span />
                }
                {next && (
                  <button className="tab-nav-btn tab-nav-btn--next" onClick={() => onViewChange(next)}>
                    {nextBtnLabel}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Summary tab */}
        {view === 'summary' && (
          <div className="tab-section">
            <p className="section-label">Your selection</p>

            <div className="order-summary">
              <div className="order-summary-row">
                <span>Color</span>
                <span>
                  <span className="order-swatch" style={{ background: color?.swatch }} />
                  {color?.label}
                </span>
              </div>
              <div className="order-summary-row">
                <span>Heater</span>
                <span>{interior?.label}</span>
              </div>
            </div>

            {showNextBtn && prev && (
              <div className="tab-nav">
                <button className="tab-nav-btn" onClick={() => onViewChange(prev)}>← Back</button>
                <span />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
