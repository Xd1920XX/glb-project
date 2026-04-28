import { useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config.js'

const SUBJECTS = [
  'General question',
  'Technical support',
  'Billing & pricing',
  'Feature request',
  'Partnership',
  'Other',
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' })
  const [status, setStatus] = useState(null) // null | 'sending' | 'sent' | 'error'

  function field(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    try {
      await addDoc(collection(db, 'contact_messages'), {
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
        <Link to="/" className="landing-logo" style={{ textDecoration: 'none', color: 'inherit' }}>Configurator</Link>
        <div className="landing-nav-links">
          <Link to="/login">Log in</Link>
          <Link to="/signup" className="btn-primary">Get started</Link>
        </div>
      </nav>

      <div className="contact-page">
        <div className="contact-inner">

          <div className="contact-left">
            <div className="section-eyebrow">Contact</div>
            <h1 className="contact-heading">Let's talk</h1>
            <p className="contact-sub">Have a question, need support, or want to explore a partnership? Send us a message and we'll get back to you within one business day.</p>

            <div className="contact-details">
              <div className="contact-detail-item">
                <div className="contact-detail-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <div>
                  <div className="contact-detail-label">Email</div>
                  <div className="contact-detail-value">info@nordicrender.com</div>
                </div>
              </div>
              <div className="contact-detail-item">
                <div className="contact-detail-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <div className="contact-detail-label">Response time</div>
                  <div className="contact-detail-value">Within 1 business day</div>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-right">
            {status === 'sent' ? (
              <div className="contact-success">
                <div className="contact-success-icon">✓</div>
                <h2>Message sent!</h2>
                <p>Thanks for reaching out. We'll get back to you within one business day.</p>
                <button className="btn-ghost" onClick={() => { setStatus(null); setForm({ name: '', email: '', subject: SUBJECTS[0], message: '' }) }}>
                  Send another
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="contact-form-row">
                  <div className="field-row">
                    <label className="field-label">Your name</label>
                    <input className="field-input" required placeholder="Jane Smith"
                      value={form.name} onChange={field('name')} />
                  </div>
                  <div className="field-row">
                    <label className="field-label">Email address</label>
                    <input className="field-input" type="email" required placeholder="jane@company.com"
                      value={form.email} onChange={field('email')} />
                  </div>
                </div>
                <div className="field-row">
                  <label className="field-label">Subject</label>
                  <select className="field-input" value={form.subject} onChange={field('subject')}>
                    {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field-row">
                  <label className="field-label">Message</label>
                  <textarea className="field-input contact-textarea" required rows={6}
                    placeholder="Tell us how we can help…"
                    value={form.message} onChange={field('message')} />
                </div>
                {status === 'error' && (
                  <div className="auth-error">Something went wrong. Please try again or email us directly.</div>
                )}
                <button className="btn-primary btn-block" type="submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Send message'}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>

      <footer className="landing-footer">
        <div className="landing-footer-bottom">
          © {new Date().getFullYear()} Configurator. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
