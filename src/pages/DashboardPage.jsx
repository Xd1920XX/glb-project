import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { api } from '../api/client.js'
import { FRAMES, LIDS } from '../config/models.js'

const EMBED_ORIGIN = window.location.origin

function EmbedModal({ configurator, onClose }) {
  const url = `${EMBED_ORIGIN}/embed/${configurator.id}`
  const code = `<iframe\n  src="${url}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  allowfullscreen\n></iframe>`
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Embed — {configurator.name}</span>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          Copy this snippet and paste it into your webpage HTML.
        </p>
        <textarea
          className="form-input form-textarea"
          readOnly
          value={code}
          style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 96 }}
        />
        <button className="order-btn" style={{ marginTop: 14 }} onClick={copy}>
          {copied ? 'Copied!' : 'Copy embed code'}
        </button>
      </div>
    </div>
  )
}

function ConfiguratorForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    default_frame: initial?.default_frame || 'B3',
    default_lid: initial?.default_lid || 'Bio',
    default_panels: initial !== undefined ? Boolean(initial.default_panels) : true,
    accent_color: initial?.accent_color || '#1a1a1a',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSave({ ...form, default_panels: form.default_panels ? 1 : 0 })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} style={{ gap: 12 }}>
      <div className="form-row">
        <label className="form-label">Name</label>
        <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="My configurator" />
      </div>
      <div className="form-grid">
        <div className="form-row">
          <label className="form-label">Default frame</label>
          <select className="form-input" value={form.default_frame} onChange={(e) => setForm({ ...form, default_frame: e.target.value })}>
            {FRAMES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label className="form-label">Default lid</label>
          <select className="form-input" value={form.default_lid} onChange={(e) => setForm({ ...form, default_lid: e.target.value })}>
            {LIDS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <input type="checkbox" id="dp" checked={form.default_panels} onChange={(e) => setForm({ ...form, default_panels: e.target.checked })} />
        <label htmlFor="dp" className="form-label" style={{ marginBottom: 0 }}>Front panels by default</label>
      </div>
      <div className="form-row">
        <label className="form-label">Accent color</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} style={{ width: 36, height: 36, border: 'none', padding: 0, cursor: 'pointer', background: 'none' }} />
          <input className="form-input" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} placeholder="#1a1a1a" style={{ flex: 1 }} />
        </div>
      </div>
      {error && <p className="auth-error">{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="order-btn" type="submit" disabled={loading} style={{ flex: 1 }}>
          {loading ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: '14px', border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'none', fontWeight: 600, fontSize: 14 }}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [configurators, setConfigurators] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [embedTarget, setEmbedTarget] = useState(null)

  useEffect(() => {
    api.getConfigurators()
      .then(setConfigurators)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(body) {
    const cfg = await api.createConfigurator(body)
    setConfigurators((prev) => [cfg, ...prev])
    setShowCreate(false)
  }

  async function handleUpdate(body) {
    const cfg = await api.updateConfigurator(editing.id, body)
    setConfigurators((prev) => prev.map((c) => (c.id === cfg.id ? cfg : c)))
    setEditing(null)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this configurator and all its orders?')) return
    await api.deleteConfigurator(id)
    setConfigurators((prev) => prev.filter((c) => c.id !== id))
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="dash-page">
      <header className="dash-header">
        <span className="dash-logo">Container Configurator</span>
        <div className="dash-header-right">
          <span className="dash-user">{user?.name}</span>
          <Link to="/dashboard/orders" className="dash-link">Orders</Link>
          <button className="dash-logout" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-section-header">
          <h2 className="dash-section-title">My Configurators</h2>
          {!showCreate && (
            <button className="order-btn" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => setShowCreate(true)}>
              + New configurator
            </button>
          )}
        </div>

        {showCreate && (
          <div className="dash-card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>New configurator</h3>
            <ConfiguratorForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
          </div>
        )}

        {loading ? (
          <p className="dash-empty">Loading…</p>
        ) : configurators.length === 0 ? (
          <p className="dash-empty">No configurators yet. Create your first one above.</p>
        ) : (
          <div className="dash-grid">
            {configurators.map((cfg) => (
              editing?.id === cfg.id ? (
                <div key={cfg.id} className="dash-card">
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Edit — {cfg.name}</h3>
                  <ConfiguratorForm initial={cfg} onSave={handleUpdate} onCancel={() => setEditing(null)} />
                </div>
              ) : (
                <div key={cfg.id} className="dash-card">
                  <div className="dash-card-top">
                    <span className="dash-card-name">{cfg.name}</span>
                    <span className="dash-card-accent" style={{ background: cfg.accent_color }} />
                  </div>
                  <div className="dash-card-meta">
                    <span>{cfg.default_frame}</span>
                    <span>·</span>
                    <span>{LIDS.find((l) => l.id === cfg.default_lid)?.label ?? cfg.default_lid}</span>
                    {cfg.default_panels ? <><span>·</span><span>Panels</span></> : null}
                  </div>
                  <div className="dash-card-actions">
                    <button className="dash-action" onClick={() => setEmbedTarget(cfg)}>Embed</button>
                    <button className="dash-action" onClick={() => setEditing(cfg)}>Edit</button>
                    <a className="dash-action" href={`/embed/${cfg.id}`} target="_blank" rel="noreferrer">Preview</a>
                    <button className="dash-action dash-action-danger" onClick={() => handleDelete(cfg.id)}>Delete</button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </main>

      {embedTarget && <EmbedModal configurator={embedTarget} onClose={() => setEmbedTarget(null)} />}
    </div>
  )
}
