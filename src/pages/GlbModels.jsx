import { useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config.js'

export default function GlbModels() {
  const [form, setForm] = useState({ name: '', email: '', company: '', description: '', deadline: '', budget: '' })
  const [status, setStatus] = useState(null)

  function field(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    try {
      await addDoc(collection(db, 'model_inquiries'), {
        ...form,
        createdAt: serverTimestamp(),
        read: false,
      })
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link to="/"><img src="/logo.svg" alt="glbconfigurator" className="landing-logo-img" /></Link>
        <div className="landing-nav-links">
          <Link to="/what-is-glb">What is GLB?</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup" className="btn-primary">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="glbm-hero">
        <div className="glbm-hero-inner">
          <div className="section-eyebrow">3D Model Creation</div>
          <h1 className="glbm-hero-title">Missing a GLB model?<br />No problem — we can help.</h1>
          <p className="glbm-hero-sub">
            Don't have a 3D model yet? Our team creates professional, optimised GLB files
            ready to drop straight into your configurator. Send us an inquiry and we'll
            get back to you within one business day.
          </p>
          <a href="#inquiry" className="btn-primary btn-lg">Send an inquiry →</a>
        </div>
      </section>

      {/* What we offer */}
      <section className="glbm-features">
        <div className="glbm-features-inner">
          <h2 className="section-title">What we deliver</h2>
          <div className="glbm-feature-grid">
            <div className="glbm-feature-card">
              <div className="glbm-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
              </div>
              <h3>Production-ready GLB</h3>
              <p>Optimised geometry, correct scale, and clean material setup — ready to load in your configurator instantly.</p>
            </div>
            <div className="glbm-feature-card">
              <div className="glbm-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                </svg>
              </div>
              <h3>Named materials</h3>
              <p>All materials labelled so you can apply colour overrides and texture swaps directly in the builder.</p>
            </div>
            <div className="glbm-feature-card">
              <div className="glbm-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
                </svg>
              </div>
              <h3>Multi-layer support</h3>
              <p>Models split into separate layers — body, details, accessories — so each part can be toggled and styled independently.</p>
            </div>
            <div className="glbm-feature-card">
              <div className="glbm-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                </svg>
              </div>
              <h3>Any product category</h3>
              <p>Furniture, saunas, cabins, vehicles, industrial equipment, consumer goods — we've done it all.</p>
            </div>
            <div className="glbm-feature-card">
              <div className="glbm-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <h3>From any source</h3>
              <p>Send us photos, technical drawings, CAD files (STEP, DWG), existing 3D files, or just a detailed description.</p>
            </div>
            <div className="glbm-feature-card">
              <div className="glbm-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3>Revisions included</h3>
              <p>We include revision rounds until the model matches your product exactly. Your satisfaction is guaranteed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="glbm-process">
        <div className="glbm-process-inner">
          <div className="section-eyebrow">How it works</div>
          <h2 className="section-title">Simple three-step process</h2>
          <div className="steps">
            <div className="step">
              <div className="step-num">01</div>
              <h3>Send an inquiry</h3>
              <p>Fill in the form below with your product details, any reference materials, and your timeline.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-num">02</div>
              <h3>We create your model</h3>
              <p>Our 3D artists model your product and deliver an optimised GLB file ready for the configurator.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-num">03</div>
              <h3>Upload &amp; go live</h3>
              <p>Drop the file into your media library, add it to a variant, and publish — usually the same day.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Inquiry form */}
      <section className="glbm-inquiry" id="inquiry">
        <div className="glbm-inquiry-inner">
          <div className="glbm-inquiry-left">
            <div className="section-eyebrow">Get in touch</div>
            <h2 className="glbm-inquiry-title">Tell us about your product</h2>
            <p className="glbm-inquiry-sub">
              Fill in the form and we'll get back to you within one business day with a quote and timeline.
            </p>
            <div className="glbm-inquiry-details">
              <div className="glbm-inquiry-detail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Response within 1 business day
              </div>
              <div className="glbm-inquiry-detail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                Free quote, no commitment
              </div>
              <div className="glbm-inquiry-detail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                info@nordicrender.com
              </div>
            </div>
          </div>

          <div className="glbm-inquiry-right">
            {status === 'sent' ? (
              <div className="contact-success">
                <div className="contact-success-icon">✓</div>
                <h2>Inquiry sent!</h2>
                <p>Thank you — we'll review your request and get back to you within one business day.</p>
                <button className="btn-ghost" onClick={() => { setStatus(null); setForm({ name: '', email: '', company: '', description: '', deadline: '', budget: '' }) }}>
                  Send another
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="contact-form-row">
                  <div className="field-row">
                    <label className="field-label">Your name *</label>
                    <input className="field-input" required placeholder="Jane Smith" value={form.name} onChange={field('name')} />
                  </div>
                  <div className="field-row">
                    <label className="field-label">Email *</label>
                    <input className="field-input" type="email" required placeholder="jane@company.com" value={form.email} onChange={field('email')} />
                  </div>
                </div>
                <div className="field-row">
                  <label className="field-label">Company (optional)</label>
                  <input className="field-input" placeholder="Acme OÜ" value={form.company} onChange={field('company')} />
                </div>
                <div className="field-row">
                  <label className="field-label">Describe your product *</label>
                  <textarea className="field-input contact-textarea" required rows={5}
                    placeholder="What product needs a 3D model? Include dimensions, materials, colour variants, and any reference files you can link to (Google Drive, Dropbox, etc.)."
                    value={form.description} onChange={field('description')} />
                </div>
                <div className="contact-form-row">
                  <div className="field-row">
                    <label className="field-label">Deadline (optional)</label>
                    <input className="field-input" placeholder="e.g. end of May" value={form.deadline} onChange={field('deadline')} />
                  </div>
                  <div className="field-row">
                    <label className="field-label">Budget (optional)</label>
                    <input className="field-input" placeholder="e.g. €500–1 000" value={form.budget} onChange={field('budget')} />
                  </div>
                </div>
                {status === 'error' && (
                  <div className="auth-error">Something went wrong. Please try again or email us directly.</div>
                )}
                <button className="btn-primary btn-block" type="submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Send inquiry'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} Nordic Render OÜ · Reg. 16885822</span>
          <div className="landing-footer-legal">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
