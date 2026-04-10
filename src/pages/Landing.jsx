import { Link } from 'react-router-dom'
import { PLANS } from '../config/plans.js'

export default function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <span className="landing-logo">Configurator</span>
        <div className="landing-nav-links">
          <Link to="/login">Log in</Link>
          <Link to="/signup" className="btn-primary">Get started</Link>
        </div>
      </nav>

      <section className="hero">
        <h1>Build &amp; embed 3D product configurators</h1>
        <p>Upload your 3D models and images, build an interactive configurator, and embed it on any website — no coding required.</p>
        <div className="hero-actions">
          <Link to="/signup" className="btn-primary btn-lg">Start free 7-day trial</Link>
          <Link to="/demo" className="btn-ghost btn-lg">See demo</Link>
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">⬆</div>
          <h3>Upload your assets</h3>
          <p>Upload GLB models, 360° rotation images, and panoramic interior shots.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚙</div>
          <h3>Build your configurator</h3>
          <p>Set up color variants, interior views, and 3D models with a visual editor.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">{'</>'}</div>
          <h3>Embed anywhere</h3>
          <p>Copy a single line of HTML and paste it into any page, CMS, or webshop.</p>
        </div>
      </section>

      <section className="pricing">
        <h2>Simple pricing</h2>
        <p className="pricing-sub">7-day free trial on any plan. Cancel any time.</p>
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
                <strong>{plan.embeds}</strong> embed{plan.embeds !== 1 ? 's' : ''}
              </div>
              <ul className="pricing-tier-features">
                <li>Unlimited configurators</li>
                <li>Unlimited asset uploads</li>
                <li>3D GLB + rotation + 360°</li>
                <li>{plan.embeds} active embed{plan.embeds !== 1 ? 's' : ''}</li>
              </ul>
              <Link to="/signup" className={plan.popular ? 'btn-primary btn-block' : 'btn-ghost btn-block'}>
                Start free trial
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        © {new Date().getFullYear()} Configurator
      </footer>
    </div>
  )
}
