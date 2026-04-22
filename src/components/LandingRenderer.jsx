// Shared renderer for all 5 landing page layouts.
// Used by both LandingBuilder (preview) and LandingView (public).

function ConfigCard({ item, accent, cardBg, textColor, className = '' }) {
  return (
    <a
      className={`lp-card ${className}`}
      style={{ background: cardBg, color: textColor }}
      href={`/embed/${item.configId}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div>
        <div className="lp-card-title" style={{ color: textColor }}>{item.label || 'Configurator'}</div>
        {item.description && <div className="lp-card-desc">{item.description}</div>}
      </div>
      <span className="lp-card-cta" style={{ color: accent }}>Configure →</span>
    </a>
  )
}

// ── Hero — centered hero + card grid ──────────────────────────────

function HeroLayout({ p }) {
  const items = p.items || []
  return (
    <div className="lp lp--hero" style={{ background: p.bgColor, color: p.textColor }}>
      <div className="lp-hero-header">
        {p.logoUrl && <img src={p.logoUrl} className="lp-logo" alt="" />}
        {p.siteName && <div className="lp-site-name" style={{ color: p.textColor }}>{p.siteName}</div>}
      </div>
      <div className="lp-hero-copy">
        {p.tagline && <h1 className="lp-hero-h1" style={{ color: p.textColor }}>{p.tagline}</h1>}
        {p.tagline && <div className="lp-hero-bar" style={{ background: p.accentColor }} />}
        {p.description && <p className="lp-hero-p" style={{ color: p.textColor }}>{p.description}</p>}
      </div>
      <div className="lp-hero-grid">
        {items.length > 0
          ? items.map((item) => (
              <ConfigCard key={item.id} item={item} accent={p.accentColor} cardBg={p.cardBg} textColor={p.textColor} />
            ))
          : <p className="lp-empty">No configurators added yet.</p>
        }
      </div>
    </div>
  )
}

// ── Minimal — header bar + clean vertical list ─────────────────────

function MinimalLayout({ p }) {
  const items = p.items || []
  return (
    <div className="lp lp--minimal" style={{ background: p.bgColor, color: p.textColor }}>
      <header className="lp-min-header" style={{ borderBottomColor: p.textColor + '18' }}>
        {p.logoUrl && <img src={p.logoUrl} className="lp-logo lp-logo--sm" alt="" />}
        {p.siteName && <span className="lp-min-name" style={{ color: p.textColor }}>{p.siteName}</span>}
      </header>
      <div className="lp-min-body">
        <div className="lp-min-intro">
          {p.tagline && <h1 className="lp-min-h1" style={{ color: p.textColor }}>{p.tagline}</h1>}
          {p.description && <p className="lp-min-p" style={{ color: p.textColor }}>{p.description}</p>}
        </div>
        <div className="lp-min-list">
          {items.length > 0
            ? items.map((item) => (
                <a key={item.id} className="lp-min-row" href={`/embed/${item.configId}`} target="_blank" rel="noopener noreferrer"
                  style={{ background: p.cardBg, color: p.textColor }}>
                  <div>
                    <div className="lp-min-row-name" style={{ color: p.textColor }}>{item.label || 'Configurator'}</div>
                    {item.description && <div className="lp-min-row-desc">{item.description}</div>}
                  </div>
                  <span className="lp-min-row-arr" style={{ color: p.accentColor }}>→</span>
                </a>
              ))
            : <p className="lp-empty">No configurators added yet.</p>
          }
        </div>
      </div>
    </div>
  )
}

// ── Magazine — featured large card + side grid ─────────────────────

function MagazineLayout({ p }) {
  const [featured, ...rest] = p.items || []
  return (
    <div className="lp lp--magazine" style={{ background: p.bgColor, color: p.textColor }}>
      <header className="lp-mag-hdr">
        <div className="lp-mag-brand">
          {p.logoUrl && <img src={p.logoUrl} className="lp-logo lp-logo--sm" alt="" />}
          {p.siteName && <span className="lp-mag-name" style={{ color: p.textColor }}>{p.siteName}</span>}
        </div>
        {p.tagline && <span className="lp-mag-tag" style={{ color: p.textColor }}>{p.tagline}</span>}
      </header>
      {p.description && <p className="lp-mag-intro" style={{ color: p.textColor }}>{p.description}</p>}
      <div className="lp-mag-grid">
        {featured
          ? (
            <a className="lp-mag-feat" href={`/embed/${featured.configId}`} target="_blank" rel="noopener noreferrer"
              style={{ background: p.accentColor }}>
              <span className="lp-mag-feat-label">Featured</span>
              <h2 className="lp-mag-feat-title">{featured.label || 'Configurator'}</h2>
              {featured.description && <p className="lp-mag-feat-desc">{featured.description}</p>}
              <span className="lp-mag-feat-cta">Configure →</span>
            </a>
          )
          : <div className="lp-mag-feat lp-empty" style={{ background: p.accentColor + '22', color: p.textColor }}>First configurator will be featured here.</div>
        }
        <div className="lp-mag-rest">
          {rest.length > 0
            ? rest.map((item) => (
                <ConfigCard key={item.id} item={item} accent={p.accentColor} cardBg={p.cardBg} textColor={p.textColor} />
              ))
            : <p className="lp-empty" style={{ color: p.textColor }}>Add more configurators to fill this area.</p>
          }
        </div>
      </div>
    </div>
  )
}

// ── Bento — mosaic grid with alternating card widths ───────────────

function BentoLayout({ p }) {
  const items = p.items || []
  return (
    <div className="lp lp--bento" style={{ background: p.bgColor, color: p.textColor }}>
      <div className="lp-bento-top">
        <div>
          {p.siteName && <h1 className="lp-bento-name" style={{ color: p.textColor }}>{p.siteName}</h1>}
          {p.tagline && <p className="lp-bento-tag" style={{ color: p.textColor }}>{p.tagline}</p>}
          {p.description && <p className="lp-bento-desc" style={{ color: p.textColor }}>{p.description}</p>}
        </div>
        {p.logoUrl && <img src={p.logoUrl} className="lp-logo lp-logo--lg" alt="" />}
      </div>
      <div className="lp-bento-grid">
        {items.length > 0
          ? items.map((item, i) => {
              const isWide  = i % 3 === 0
              const isAccent = i === 0
              return (
                <a key={item.id}
                  className={`lp-bento-card${isWide ? ' lp-bento-wide' : ''}`}
                  href={`/embed/${item.configId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: isAccent ? p.accentColor : p.cardBg, color: isAccent ? '#fff' : p.textColor }}>
                  <div className="lp-bento-card-title">{item.label || 'Configurator'}</div>
                  {item.description && <div className="lp-bento-card-desc">{item.description}</div>}
                  <span className="lp-bento-card-cta" style={{ color: isAccent ? 'rgba(255,255,255,0.8)' : p.accentColor }}>Configure →</span>
                </a>
              )
            })
          : <p className="lp-empty" style={{ gridColumn: 'span 3', color: p.textColor }}>No configurators added yet.</p>
        }
      </div>
    </div>
  )
}

// ── Split — colored left panel + scrollable right ──────────────────

function SplitLayout({ p }) {
  const items = p.items || []
  return (
    <div className="lp lp--split" style={{ '--lp-accent': p.accentColor }}>
      <div className="lp-split-left" style={{ background: p.accentColor }}>
        {p.logoUrl && <img src={p.logoUrl} className="lp-logo lp-logo--invert" alt="" />}
        {p.siteName && <h1 className="lp-split-name">{p.siteName}</h1>}
        {p.tagline && <p className="lp-split-tag">{p.tagline}</p>}
        {p.description && <p className="lp-split-desc">{p.description}</p>}
      </div>
      <div className="lp-split-right" style={{ background: p.bgColor }}>
        <div className="lp-split-cards">
          {items.length > 0
            ? items.map((item) => (
                <a key={item.id} className="lp-split-card" href={`/embed/${item.configId}`} target="_blank" rel="noopener noreferrer"
                  style={{ background: p.cardBg, color: p.textColor }}>
                  <div>
                    <div className="lp-split-card-name" style={{ color: p.textColor }}>{item.label || 'Configurator'}</div>
                    {item.description && <div className="lp-split-card-desc">{item.description}</div>}
                  </div>
                  <span style={{ color: p.accentColor, flexShrink: 0, marginLeft: 16, fontSize: 20 }}>→</span>
                </a>
              ))
            : <p className="lp-empty" style={{ color: p.textColor }}>No configurators added yet.</p>
          }
        </div>
      </div>
    </div>
  )
}

// ── Public export ──────────────────────────────────────────────────

export function LandingRenderer({ page }) {
  const p = {
    bgColor: '#ffffff',
    cardBg: '#f5f5f5',
    textColor: '#111111',
    accentColor: '#111111',
    items: [],
    ...page,
  }
  switch (p.layout) {
    case 'minimal':  return <MinimalLayout p={p} />
    case 'magazine': return <MagazineLayout p={p} />
    case 'bento':    return <BentoLayout p={p} />
    case 'split':    return <SplitLayout p={p} />
    default:         return <HeroLayout p={p} />
  }
}
