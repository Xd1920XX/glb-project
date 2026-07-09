import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const PAGE_TITLE = 'Product Configurators & Product Visualizers — Nordic Render'
const PAGE_DESC  = 'Interactive product configurators and product visualizers for manufacturers, furniture brands, building products, and industrial companies. Custom-developed, scalable, and optimized for sales.'

const DEMO_IMAGES = [
  { src: '/demo-image/demo-1.jpeg', caption: 'Interactive 3D product viewer' },
  { src: '/demo-image/demo-2.jpeg', caption: 'Material and color picker' },
  { src: '/demo-image/demo-3.jpeg', caption: 'Embedded on client website' },
  { src: '/demo-image/demo-4.jpeg', caption: 'Configurable options in real time' },
]

const INDUSTRIES = [
  { title: 'Furniture brands',   body: 'Preview materials, upholstery, and dimensions before checkout.' },
  { title: 'Building products',  body: 'Cladding, doors, windows, containers — visualise on site.' },
  { title: 'Modular construction', body: 'Configure layouts, floor plans, and finishes.' },
  { title: 'Industrial equipment', body: 'Sales enablement with interactive spec sheets.' },
  { title: 'Manufacturers',      body: 'Replace static PDFs and photo catalogues with live product experiences.' },
]

export default function Solutions() {
  useEffect(() => {
    const prevTitle = document.title
    document.title = PAGE_TITLE
    const meta = document.querySelector('meta[name="description"]')
    const prevDesc = meta?.getAttribute('content') ?? ''
    if (meta) meta.setAttribute('content', PAGE_DESC)
    return () => {
      document.title = prevTitle
      if (meta) meta.setAttribute('content', prevDesc)
    }
  }, [])

  return (
    <div className="landing">
      {/* ── Nav ── */}
      <nav className="landing-nav">
        <Link to="/"><img src="/logo.svg" alt="glbconfigurator" className="landing-logo-img" /></Link>
        <div className="landing-nav-links">
          <Link to="/features">Features</Link>
          <Link to="/solutions">Solutions</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup" className="btn-primary">Get started</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero" style={{ paddingTop: 60 }}>
        <div className="hero-content">
          <div className="hero-badge">Solutions</div>
          <h1>Product Configurators<br />&amp; Product Visualizers</h1>
          <p>
            Interactive product configurators and visualizers for manufacturers, furniture brands,
            building products, and industrial companies. Custom-developed, scalable, and optimized for sales.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn-primary btn-lg">Start with GLB Configurator</Link>
            <Link to="/contact" className="btn-ghost btn-lg">Talk about a custom project →</Link>
          </div>
        </div>
      </section>

      {/* ── Intro / value ── */}
      <section className="how-it-works" style={{ paddingBottom: 40 }}>
        <div className="section-eyebrow">Why interactive</div>
        <h2 className="section-title">Modern buyers expect more than<br />photos and PDF catalogs</h2>
        <p style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', fontSize: 17, lineHeight: 1.65, color: 'var(--text-muted)' }}>
          Product configurators and product visualizers allow customers to explore materials, colors,
          dimensions, and product options in real time — creating an engaging and interactive buying experience.
          By helping customers visualize products before purchasing, configurators improve buying confidence,
          simplify decision-making, and reduce the workload of sales teams.
        </p>
      </section>

      {/* ── Demo gallery ── */}
      <section className="how-it-works" style={{ paddingTop: 0 }}>
        <div className="section-eyebrow">See it in action</div>
        <h2 className="section-title">Real client work</h2>
        <div className="solutions-gallery">
          {DEMO_IMAGES.map((img) => (
            <figure key={img.src} className="solutions-gallery-item">
              <img src={img.src} alt={img.caption} loading="lazy" />
              <figcaption>{img.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── Industries ── */}
      <section className="how-it-works">
        <div className="section-eyebrow">Where it fits</div>
        <h2 className="section-title">Built for physical products</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, maxWidth: 1200, margin: '32px auto 0', padding: '0 24px' }}>
          {INDUSTRIES.map((ind) => (
            <div key={ind.title} style={{ padding: 24, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 17 }}>{ind.title}</h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--text-muted)' }}>{ind.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Two service tiers ── */}
      <section className="how-it-works">
        <div className="section-eyebrow">How we work with you</div>
        <h2 className="section-title">Two ways to get a configurator live</h2>
        <div className="solutions-tier-grid">

          <div className="solutions-tier-card">
            <div className="solutions-tier-eyebrow">Self-serve · SaaS</div>
            <h3>GLB Configurator</h3>
            <p>
              Upload your own GLBs, spinners, and 360° panoramas. Build configurators visually,
              publish landing pages, and embed anywhere. Predictable monthly pricing.
            </p>
            <ul className="solutions-feature-list">
              <li>Unlimited variants, colors, and part options</li>
              <li>Multi-language, order forms, analytics</li>
              <li>Iframe embed + postMessage API</li>
              <li>7-day free trial, cancel any time</li>
            </ul>
            <div className="solutions-tier-actions">
              <Link to="/signup" className="btn-primary">Start free trial</Link>
              <Link to="/features" className="btn-ghost">See features</Link>
            </div>
          </div>

          <div className="solutions-tier-card">
            <div className="solutions-tier-eyebrow">Custom project</div>
            <h3>Custom Development</h3>
            <p>
              We handle the whole stack: GLB modelling from your product data, integrations with your CRM
              or ERP, custom UI, and hosting. One-time delivery fee plus optional monthly maintenance.
            </p>
            <ul className="solutions-feature-list">
              <li>3D modelling from photos, CAD, or samples</li>
              <li>Custom UI, branded flows, bespoke features</li>
              <li>API / webhook integrations (Shopify, WP, ERP)</li>
              <li>Ongoing model updates and support</li>
            </ul>
            <div className="solutions-tier-actions">
              <Link to="/contact" className="btn-primary">Get a quote</Link>
              <Link to="/glb-models" className="btn-ghost">GLB model service</Link>
            </div>
          </div>

        </div>
      </section>

      {/* ── CTA ── */}
      <section className="how-it-works" style={{ paddingBottom: 80 }}>
        <h2 className="section-title">Not sure which fits?</h2>
        <p style={{ maxWidth: 640, margin: '0 auto 24px', textAlign: 'center', fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)' }}>
          Send us your product photos, catalogue, or CAD files. We&apos;ll tell you within a day
          whether the SaaS plan covers your case or a custom build is the better route.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/contact" className="btn-primary btn-lg">Contact us</Link>
          <Link to="/demo" className="btn-ghost btn-lg">See live demo</Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <img src="/logo.svg" alt="glbconfigurator" className="landing-logo-img" />
            <p>Build &amp; embed 3D product configurators. Create branded landing pages. Share anywhere.</p>
          </div>
          <div className="landing-footer-links">
            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <Link to="/features">Features</Link>
              <Link to="/solutions">Solutions</Link>
              <Link to="/demo">Demo</Link>
              <Link to="/signup">Sign up</Link>
              <Link to="/login">Log in</Link>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Resources</div>
              <Link to="/what-is-glb">What is GLB?</Link>
              <Link to="/glb-models">GLB Model Service</Link>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Company</div>
              <Link to="/contact">Contact</Link>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} Nordic Render OÜ · Reg. 16885822 · VAT EE102691294</span>
          <div className="landing-footer-legal">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
