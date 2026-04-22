// Shared renderer — used by LandingBuilder (preview) and LandingView (public).

// ── Design tokens ──────────────────────────────────────────────────

const FONTS = {
  sans:    "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  serif:   "Georgia,'Times New Roman',serif",
  mono:    "'Courier New',Courier,monospace",
  display: "Palatino,'Book Antiqua','Palatino Linotype',Georgia,serif",
}

const CARD_STYLES = {
  flat:     { borderRadius: '4px',  boxShadow: 'none',                          border: 'none' },
  default:  { borderRadius: '10px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)',    border: 'none' },
  elevated: { borderRadius: '14px', boxShadow: '0 8px 28px rgba(0,0,0,0.15)',   border: 'none' },
  outlined: { borderRadius: '10px', boxShadow: 'none',                          border: '__outline__' },
}

const SPACING_TOKENS = {
  compact:  { gap: '8px',  pad: '16px', outer: '32px'  },
  normal:   { gap: '16px', pad: '24px', outer: '56px'  },
  spacious: { gap: '28px', pad: '40px', outer: '80px'  },
}

function tok(p) {
  const cs  = CARD_STYLES[p.cardStyle ?? 'default'] ?? CARD_STYLES.default
  const sp  = SPACING_TOKENS[p.spacing ?? 'normal']  ?? SPACING_TOKENS.normal
  const outline = `1.5px solid ${p.textColor ?? '#111'}33`
  return {
    font: FONTS[p.fontFamily ?? 'sans'] ?? FONTS.sans,
    cs: { ...cs, border: cs.border === '__outline__' ? outline : cs.border },
    sp,
  }
}

// ── Shared card ────────────────────────────────────────────────────

function ConfigCard({ item, p, t, className = '', inverted = false }) {
  const bg      = inverted ? p.accentColor : p.cardBg
  const clr     = inverted ? '#ffffff' : p.textColor
  const ctaClr  = inverted ? 'rgba(255,255,255,0.75)' : p.accentColor
  const hasBg   = !!item.thumbnailUrl

  return (
    <a
      className={`lp-card${hasBg ? ' lp-card--has-thumb' : ''} ${className}`}
      style={{ ...t.cs, background: bg, color: clr }}
      href={`/embed/${item.configId}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {hasBg && (
        <div className="lp-card-thumb">
          <img src={item.thumbnailUrl} alt={item.label} />
        </div>
      )}
      <div className="lp-card-body">
        <div>
          <div className="lp-card-title" style={{ color: clr }}>{item.label || 'Configurator'}</div>
          {item.description && <div className="lp-card-desc">{item.description}</div>}
        </div>
        <span className="lp-card-cta" style={{ color: ctaClr }}>{item.ctaLabel || 'Configure →'}</span>
      </div>
    </a>
  )
}

// ── Hero — centered hero + card grid ──────────────────────────────

function HeroLayout({ p, t }) {
  const items = p.items || []
  return (
    <div className="lp lp--hero" style={{ background: p.bgColor, color: p.textColor, fontFamily: t.font, paddingBottom: t.sp.outer }}>
      <div className="lp-hero-header">
        {p.logoUrl && <img src={p.logoUrl} className="lp-logo" alt="" />}
        {p.siteName && <div className="lp-site-name" style={{ color: p.textColor }}>{p.siteName}</div>}
      </div>
      <div className="lp-hero-copy" style={{ paddingBottom: t.sp.outer }}>
        {p.tagline && <h1 className="lp-hero-h1" style={{ color: p.textColor }}>{p.tagline}</h1>}
        {p.tagline && <div className="lp-hero-bar" style={{ background: p.accentColor }} />}
        {p.description && <p className="lp-hero-p" style={{ color: p.textColor }}>{p.description}</p>}
      </div>
      <div className="lp-hero-grid" style={{ gap: t.sp.gap }}>
        {items.length > 0
          ? items.map((item) => <ConfigCard key={item.id} item={item} p={p} t={t} />)
          : <p className="lp-empty">No configurators added yet.</p>
        }
      </div>
    </div>
  )
}

// ── Minimal — header bar + clean vertical list ─────────────────────

function MinimalLayout({ p, t }) {
  const items = p.items || []
  return (
    <div className="lp lp--minimal" style={{ background: p.bgColor, color: p.textColor, fontFamily: t.font }}>
      <header className="lp-min-header" style={{ borderBottomColor: p.textColor + '18' }}>
        {p.logoUrl && <img src={p.logoUrl} className="lp-logo lp-logo--sm" alt="" />}
        {p.siteName && <span className="lp-min-name" style={{ color: p.textColor }}>{p.siteName}</span>}
      </header>
      <div className="lp-min-body">
        <div className="lp-min-intro">
          {p.tagline && <h1 className="lp-min-h1" style={{ color: p.textColor }}>{p.tagline}</h1>}
          {p.description && <p className="lp-min-p" style={{ color: p.textColor }}>{p.description}</p>}
        </div>
        <div className="lp-min-list" style={{ gap: t.sp.gap }}>
          {items.length > 0
            ? items.map((item) => (
                <a key={item.id} className="lp-min-row" href={`/embed/${item.configId}`} target="_blank" rel="noopener noreferrer"
                  style={{ ...t.cs, background: p.cardBg, color: p.textColor }}>
                  {item.thumbnailUrl && (
                    <div className="lp-min-row-thumb" style={{ borderRadius: `calc(${t.cs.borderRadius} - 4px)` }}>
                      <img src={item.thumbnailUrl} alt={item.label} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="lp-min-row-name" style={{ color: p.textColor }}>{item.label || 'Configurator'}</div>
                    {item.description && <div className="lp-min-row-desc">{item.description}</div>}
                  </div>
                  <span className="lp-min-row-arr" style={{ color: p.accentColor }}>{item.ctaLabel || '→'}</span>
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

function MagazineLayout({ p, t }) {
  const [featured, ...rest] = p.items || []
  const hasFeatThumb = !!featured?.thumbnailUrl

  return (
    <div className="lp lp--magazine" style={{ background: p.bgColor, color: p.textColor, fontFamily: t.font }}>
      <header className="lp-mag-hdr">
        <div className="lp-mag-brand">
          {p.logoUrl && <img src={p.logoUrl} className="lp-logo lp-logo--sm" alt="" />}
          {p.siteName && <span className="lp-mag-name" style={{ color: p.textColor }}>{p.siteName}</span>}
        </div>
        {p.tagline && <span className="lp-mag-tag" style={{ color: p.textColor }}>{p.tagline}</span>}
      </header>
      {p.description && <p className="lp-mag-intro" style={{ color: p.textColor }}>{p.description}</p>}
      <div className="lp-mag-grid" style={{ gap: t.sp.gap }}>
        {featured ? (
          <a className={`lp-mag-feat${hasFeatThumb ? ' lp-mag-feat--thumb' : ''}`}
            href={`/embed/${featured.configId}`} target="_blank" rel="noopener noreferrer"
            style={hasFeatThumb
              ? { ...t.cs, backgroundImage: `url(${featured.thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { ...t.cs, background: p.accentColor }
            }>
            {hasFeatThumb && <div className="lp-mag-feat-overlay" />}
            <div className="lp-mag-feat-content">
              <span className="lp-mag-feat-label">Featured</span>
              <h2 className="lp-mag-feat-title">{featured.label || 'Configurator'}</h2>
              {featured.description && <p className="lp-mag-feat-desc">{featured.description}</p>}
              <span className="lp-mag-feat-cta">{featured.ctaLabel || 'Configure →'}</span>
            </div>
          </a>
        ) : (
          <div className="lp-mag-feat lp-empty" style={{ ...t.cs, background: p.accentColor + '22', color: p.textColor }}>First configurator will be featured here.</div>
        )}
        <div className="lp-mag-rest" style={{ gap: t.sp.gap }}>
          {rest.length > 0
            ? rest.map((item) => <ConfigCard key={item.id} item={item} p={p} t={t} />)
            : <p className="lp-empty" style={{ color: p.textColor }}>Add more configurators to fill this area.</p>
          }
        </div>
      </div>
    </div>
  )
}

// ── Bento — mosaic grid with alternating card widths ───────────────

function BentoLayout({ p, t }) {
  const items = p.items || []
  return (
    <div className="lp lp--bento" style={{ background: p.bgColor, color: p.textColor, fontFamily: t.font, padding: t.sp.outer }}>
      <div className="lp-bento-top" style={{ marginBottom: t.sp.outer }}>
        <div>
          {p.siteName && <h1 className="lp-bento-name" style={{ color: p.textColor }}>{p.siteName}</h1>}
          {p.tagline && <p className="lp-bento-tag" style={{ color: p.textColor }}>{p.tagline}</p>}
          {p.description && <p className="lp-bento-desc" style={{ color: p.textColor }}>{p.description}</p>}
        </div>
        {p.logoUrl && <img src={p.logoUrl} className="lp-logo lp-logo--lg" alt="" />}
      </div>
      <div className="lp-bento-grid" style={{ gap: t.sp.gap }}>
        {items.length > 0
          ? items.map((item, i) => (
              <ConfigCard
                key={item.id}
                item={item}
                p={p}
                t={t}
                className={i % 3 === 0 ? 'lp-bento-wide' : ''}
                inverted={i === 0}
              />
            ))
          : <p className="lp-empty" style={{ gridColumn: 'span 3', color: p.textColor }}>No configurators added yet.</p>
        }
      </div>
    </div>
  )
}

// ── Split — colored left panel + scrollable right ──────────────────

function SplitLayout({ p, t }) {
  const items = p.items || []
  return (
    <div className="lp lp--split" style={{ fontFamily: t.font }}>
      <div className="lp-split-left" style={{ background: p.accentColor }}>
        {p.logoUrl && <img src={p.logoUrl} className="lp-logo lp-logo--invert" alt="" />}
        {p.siteName && <h1 className="lp-split-name">{p.siteName}</h1>}
        {p.tagline && <p className="lp-split-tag">{p.tagline}</p>}
        {p.description && <p className="lp-split-desc">{p.description}</p>}
      </div>
      <div className="lp-split-right" style={{ background: p.bgColor }}>
        <div className="lp-split-cards" style={{ gap: t.sp.gap }}>
          {items.length > 0
            ? items.map((item) => (
                <a key={item.id} className="lp-split-card" href={`/embed/${item.configId}`} target="_blank" rel="noopener noreferrer"
                  style={{ ...t.cs, background: p.cardBg, color: p.textColor }}>
                  {item.thumbnailUrl && (
                    <div className="lp-split-card-thumb" style={{ borderRadius: `calc(${t.cs.borderRadius} - 4px)` }}>
                      <img src={item.thumbnailUrl} alt={item.label} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="lp-split-card-name" style={{ color: p.textColor }}>{item.label || 'Configurator'}</div>
                    {item.description && <div className="lp-split-card-desc">{item.description}</div>}
                  </div>
                  <span style={{ color: p.accentColor, flexShrink: 0, marginLeft: 16, fontSize: 20 }}>{item.ctaLabel || '→'}</span>
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
    bgColor:     '#ffffff',
    cardBg:      '#f5f5f5',
    textColor:   '#111111',
    accentColor: '#111111',
    fontFamily:  'sans',
    cardStyle:   'default',
    spacing:     'normal',
    items:       [],
    ...page,
  }
  const t = tok(p)
  switch (p.layout) {
    case 'minimal':  return <MinimalLayout  p={p} t={t} />
    case 'magazine': return <MagazineLayout p={p} t={t} />
    case 'bento':    return <BentoLayout    p={p} t={t} />
    case 'split':    return <SplitLayout    p={p} t={t} />
    default:         return <HeroLayout     p={p} t={t} />
  }
}
