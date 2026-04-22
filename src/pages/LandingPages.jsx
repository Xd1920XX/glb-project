import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { getUserLandingPages, createLandingPage, deleteLandingPage } from '../firebase/db.js'
import { getLandingPageLimit } from '../config/plans.js'
import { CmsSidebar } from '../components/CmsSidebar.jsx'

const LAYOUT_LABELS = {
  hero:     'Hero',
  minimal:  'Minimal',
  magazine: 'Magazine',
  bento:    'Bento',
  split:    'Split',
}

export default function LandingPages() {
  const { user, profile } = useAuth()
  const navigate  = useNavigate()
  const [pages, setPages]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) return
    getUserLandingPages(user.uid)
      .then((list) => { setPages(list); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [user])

  async function handleCreate() {
    setCreating(true)
    const id = await createLandingPage(user.uid, 'Untitled Landing Page')
    navigate(`/landing/${id}`)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this landing page?')) return
    await deleteLandingPage(id)
    setPages((p) => p.filter((x) => x.id !== id))
  }

  return (
    <div className="cms-layout dashboard">
      <CmsSidebar active="landing" />
      <main className="cms-content dash-main">
        <div className="dash-title-row">
          <div>
            <h1>Landing Pages</h1>
            {!loading && (() => {
              const limit      = getLandingPageLimit(profile)
              const published  = pages.filter((p) => p.published).length
              const atLimit    = published >= limit
              return (
                <div className="dash-embed-usage">
                  <div className="dash-embed-bar"
                    style={{ '--pct': `${Math.min(published / Math.max(limit, 1) * 100, 100)}%` }} />
                  <span>
                    {published} / {limit} landing pages published
                    {atLimit && <Link to="/billing" className="dash-upgrade-link">Upgrade to publish more →</Link>}
                  </span>
                </div>
              )
            })()}
          </div>
          <button className="btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : '+ New'}
          </button>
        </div>

        {loading ? (
          <div className="dash-empty">Loading…</div>
        ) : error ? (
          <div className="dash-empty" style={{ flexDirection: 'column', gap: 8 }}>
            <p style={{ color: 'var(--danger)' }}>Failed to load: {error}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              If this mentions an index, wait ~1 minute and refresh — the Firestore index may still be building.
            </p>
          </div>
        ) : pages.length === 0 ? (
          <div className="dash-empty">
            <p>No landing pages yet.</p>
            <button className="btn-primary" onClick={handleCreate}>Create your first</button>
          </div>
        ) : (
          <div className="lp-page-grid">
            {pages.map((pg) => (
              <div key={pg.id} className="lp-page-card" onClick={() => navigate(`/landing/${pg.id}`)}>
                <div className="lp-page-card-top">
                  <span className={`config-status${pg.published ? ' published' : ''}`}>
                    {pg.published ? 'Published' : 'Draft'}
                  </span>
                  <button className="config-delete" title="Delete"
                    onClick={(e) => handleDelete(pg.id, e)}>✕</button>
                </div>
                <div className="lp-page-card-name">{pg.name || 'Untitled'}</div>
                <div className="lp-page-card-meta">
                  {LAYOUT_LABELS[pg.layout] ?? pg.layout} · {pg.items?.length ?? 0} configurators
                </div>
                {pg.published && (
                  <div className="config-card-embed">
                    <code>/lp/{pg.id}</code>
                    <button className="config-copy-link" title="Copy URL"
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/lp/${pg.id}`) }}>
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
