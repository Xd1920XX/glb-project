import { Link } from 'react-router-dom'
import { PLANS } from '../config/plans.js'
import HeroBackground from '../components/HeroBackground.jsx'

export default function Landing() {
  return (
    <div className="landing">
      <HeroBackground />

      {/* ── Nav ── */}
      <nav className="landing-nav">
        <span className="landing-logo">GLB Configurator</span>
        <div className="landing-nav-links">
          <Link to="/contact">Contact</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup" className="btn-primary">Get started</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">3D · 360° · Interactive · Landing pages</div>
          <h1>Build &amp; embed 3D<br />product configurators</h1>
          <p>Upload your 3D models and images, build an interactive configurator, publish a branded landing page, and embed it anywhere — no coding required.</p>
          <div className="hero-actions">
            <Link to="/signup" className="btn-primary btn-lg">Start free 7-day trial</Link>
            <Link to="/demo" className="btn-ghost btn-lg">See demo →</Link>
          </div>
          <div className="hero-proof">
            <span>✓ No credit card required</span>
            <span>✓ Cancel any time</span>
            <span>✓ 7-day free trial</span>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="landing-stats">
        <div className="landing-stats-inner">
          <div className="stat-item">
            <div className="stat-number">3D + 360°</div>
            <div className="stat-label">Asset support</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-number">1 line</div>
            <div className="stat-label">To embed anywhere</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-number">Any CMS</div>
            <div className="stat-label">Shopify, WordPress &amp; more</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-number">7 days</div>
            <div className="stat-label">Free trial, no card</div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="how-it-works">
        <div className="section-eyebrow">How it works</div>
        <h2 className="section-title">From assets to live configurator<br />in minutes</h2>
        <div className="steps">
          <div className="step">
            <div className="step-num">01</div>
            <h3>Upload your assets</h3>
            <p>Upload GLB models, 360° rotation images, and panoramic interior shots. We handle storage and delivery.</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-num">02</div>
            <h3>Build your configurator</h3>
            <p>Set up color variants with price tags, interior views, 3D viewer settings, and a background — all visually.</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-num">03</div>
            <h3>Publish &amp; share</h3>
            <p>Create a branded landing page to showcase all your configurators, or embed directly into any website with one line of code.</p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features-section">
        <div className="section-eyebrow">Features</div>
        <h2 className="section-title">Everything you need to<br />sell products in 3D</h2>
        <div className="features">
          <div className="feature-card">
            <div className="feature-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </div>
            <h3>3D GLB viewer</h3>
            <p>Full orbit controls, auto-rotate, custom lighting presets, FOV — fully configurable per product.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            </div>
            <h3>360° rotation images</h3>
            <p>Drag-to-rotate spinner from multi-frame image sequences with auto-preload and optional auto-spin.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <h3>Interior panoramas</h3>
            <p>360° interior views with drag navigation — perfect for saunas, cabins, rooms, and vehicles.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
            </div>
            <h3>Color &amp; price variants</h3>
            <p>Color swatches or image thumbnails per variant, individual pricing, and a "from €X" display.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            </div>
            <h3>Branded landing pages</h3>
            <p>Create a public storefront page with your logo, brand colors, and all your configurators listed — choose from 5 beautiful layouts.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </div>
            <h3>iFrame &amp; JS widget</h3>
            <p>Embed with a single iframe tag or a lightweight JS widget snippet — works on any platform.</p>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="pricing">
        <div className="section-eyebrow">Pricing</div>
        <h2 className="section-title">Simple, transparent pricing</h2>
        <p className="pricing-sub">7-day free trial on any plan. No credit card required. Cancel any time.</p>
        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`pricing-tier${plan.popular ? ' popular' : ''}`}>
              {plan.popular && <div className="pricing-popular-badge">Most popular</div>}
              <div className="pricing-tier-header">
                <div className="pricing-tier-name">{plan.label}</div>
                <div className="pricing-tier-price">
                  €{plan.price}<span>/mo</span>
                </div>
              </div>
              <div className="pricing-tier-embeds">
                <strong>{plan.embeds}</strong> active embed{plan.embeds !== 1 ? 's' : ''}
              </div>
              <ul className="pricing-tier-features">
                <li>Unlimited configurators</li>
                <li>Unlimited asset uploads</li>
                <li>3D GLB + rotation + 360°</li>
                <li>{plan.landingPages} landing page{plan.landingPages !== 1 ? 's' : ''}</li>
                <li>{plan.embeds} live embed{plan.embeds !== 1 ? 's' : ''}</li>
              </ul>
              <Link to="/signup" className={plan.popular ? 'btn-primary btn-block' : 'btn-ghost btn-block'}>
                Start free trial
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2>Ready to sell products in 3D?</h2>
          <p>Start your free 7-day trial today. No credit card required.</p>
          <div className="hero-actions">
            <Link to="/signup" className="btn-primary btn-lg">Get started free</Link>
            <Link to="/contact" className="btn-ghost btn-lg">Talk to us</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-logo">GLB Configurator</span>
            <p>Build &amp; embed 3D product configurators. Create branded landing pages. Share anywhere.</p>
          </div>
          <div className="landing-footer-links">
            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <Link to="/demo">Demo</Link>
              <Link to="/signup">Sign up</Link>
              <Link to="/login">Log in</Link>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Company</div>
              <Link to="/contact">Contact</Link>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          © {new Date().getFullYear()} glbconfigurator.com. All rights reserved.
        </div>
      </footer>

    </div>
  )
}
