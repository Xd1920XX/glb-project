import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.jsx'
import { getUserConfigurators, createConfigurator, deleteConfigurator, duplicateConfigurator, getAnalyticsBatch } from '../firebase/db.js'
import { getEmbedLimit } from '../config/plans.js'
import { CmsSidebar } from '../components/CmsSidebar.jsx'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [configs, setConfigs]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [analytics, setAnalytics] = useState({})

  useEffect(() => {
    if (!user) return
    getUserConfigurators(user.uid).then(async (list) => {
      setConfigs(list)
      setLoading(false)
      const ids = list.map((c) => c.id)
      if (ids.length) getAnalyticsBatch(ids).then(setAnalytics)
    })
  }, [user])

  async function handleCreate() {
    setCreating(true)
    const id = await createConfigurator(user.uid, 'Untitled Configurator')
    navigate(`/builder/${id}`)
  }

  async function handleDuplicate(cfg, e) {
    e.stopPropagation()
    const newId = await duplicateConfigurator(user.uid, cfg)
    const newCfg = { ...cfg, id: newId, name: cfg.name + ' (Copy)', published: false }
    setConfigs((c) => [newCfg, ...c])
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
    <div className="cms-layout dashboard">
      <CmsSidebar active="configurators" />
      <main className="cms-content dash-main">
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
                  {cfg._isTeamOwned && (
                    <span className="config-team-badge">Shared</span>
                  )}
                  {!cfg._isTeamOwned && (
                    <>
                      <button className="config-dupe" onClick={(e) => handleDuplicate(cfg, e)} title="Duplicate">⧉</button>
                      <button className="config-delete" onClick={(e) => handleDelete(cfg.id, e)} title="Delete">✕</button>
                    </>
                  )}
                </div>
                <div className="config-card-name">{cfg.name}</div>
                <div className="config-card-meta">
                  {cfg.variants?.length ?? 0} variants · {cfg.interiors?.length ?? 0} interiors · {analytics[cfg.id]?.views ?? 0} views
                </div>
                {cfg.published && (
                  <div className="config-card-embed">
                    <code>/embed/{cfg.id}</code>
                    <button className="config-copy-link" title="Copy embed URL"
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/embed/${cfg.id}`) }}>
                      ⧉ Copy
                    </button>
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

