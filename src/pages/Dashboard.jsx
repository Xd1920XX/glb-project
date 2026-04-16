import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.jsx'
import { getUserConfigurators, createConfigurator, deleteConfigurator } from '../firebase/db.js'
import { logOut } from '../firebase/auth.js'
import { getEmbedLimit } from '../config/plans.js'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [configs, setConfigs]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) return
    getUserConfigurators(user.uid).then((list) => {
      setConfigs(list)
      setLoading(false)
    })
  }, [user])

  async function handleCreate() {
    setCreating(true)
    const id = await createConfigurator(user.uid, 'Untitled Configurator')
    navigate(`/builder/${id}`)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this configurator?')) return
    await deleteConfigurator(id)
    setConfigs((c) => c.filter((x) => x.id !== id))
  }

  const sub         = profile?.subscriptionStatus ?? 'trial'
  const embedLimit  = getEmbedLimit(profile)
  const publishedCount = configs.filter((c) => c.published).length
  const atLimit     = publishedCount >= embedLimit

  const statusColor = { trial: '#d97706', active: '#16a34a', cancelled: '#dc2626', past_due: '#dc2626' }
  const statusLabel = { trial: 'Trial', active: 'Active', cancelled: 'Cancelled', past_due: 'Overdue' }

  return (
    <div className="dashboard">
      <header className="dash-header">
        <span className="dash-logo">Configurator</span>
        <nav className="dash-nav">
          <Link to="/dashboard" className="dash-nav-link active">Configurators</Link>
          <Link to="/media" className="dash-nav-link">Media</Link>
        </nav>
        <div className="dash-header-right">
          <Link to="/billing" className="dash-billing-link">
            <span className="sub-badge" style={{ background: statusColor[sub] }}>
              {statusLabel[sub] ?? sub}
            </span>
          </Link>
          <span className="dash-username">{profile?.name || profile?.email}</span>
          <button className="btn-ghost" onClick={() => { logOut(); navigate('/') }}>Sign out</button>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-title-row">
          <div>
            <h1>My Configurators</h1>
            {!loading && (
              <div className="dash-embed-usage">
                <div
                  className="dash-embed-bar"
                  style={{ '--pct': `${Math.min(publishedCount / Math.max(embedLimit, 1) * 100, 100)}%` }}
                />
                <span>
                  {publishedCount} / {embedLimit} embeds published
                  {atLimit && (
                    <Link to="/billing" className="dash-upgrade-link">Upgrade to publish more →</Link>
                  )}
                </span>
              </div>
            )}
          </div>
          <button className="btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : '+ New'}
          </button>
        </div>

        {loading ? (
          <div className="dash-empty">Loading…</div>
        ) : configs.length === 0 ? (
          <div className="dash-empty">
            <p>No configurators yet.</p>
            <button className="btn-primary" onClick={handleCreate}>Create your first</button>
          </div>
        ) : (
          <div className="config-grid">
            {configs.map((cfg) => (
              <div key={cfg.id} className="config-card" onClick={() => navigate(`/builder/${cfg.id}`)}>
                <div className="config-card-top">
                  <span className={`config-status ${cfg.published ? 'published' : ''}`}>
                    {cfg.published ? 'Published' : 'Draft'}
                  </span>
                  <button className="config-delete" onClick={(e) => handleDelete(cfg.id, e)} title="Delete">✕</button>
                </div>
                <div className="config-card-name">{cfg.name}</div>
                <div className="config-card-meta">
                  {cfg.variants?.length ?? 0} variants · {cfg.interiors?.length ?? 0} interiors
                </div>
                {cfg.published && (
                  <div className="config-card-embed">
                    <code>/embed/{cfg.id}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
