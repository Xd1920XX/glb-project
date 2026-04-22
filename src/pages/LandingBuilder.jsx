import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { getLandingPage, saveLandingPage, publishLandingPage, getUserConfigurators, getPublishedLandingPageCount } from '../firebase/db.js'
import { getLandingPageLimit } from '../config/plans.js'
import { uploadFile, deleteFile } from '../firebase/storage.js'
import { MediaPickerModal } from '../components/MediaPickerModal.jsx'
import { LandingRenderer } from '../components/LandingRenderer.jsx'

function uid() { return Math.random().toString(36).slice(2) }

const LAYOUTS = [
  { id: 'hero',     label: 'Hero',     hint: 'Centered hero + card grid' },
  { id: 'minimal',  label: 'Minimal',  hint: 'Clean header + list rows' },
  { id: 'magazine', label: 'Magazine', hint: 'Featured card + side grid' },
  { id: 'bento',    label: 'Bento',    hint: 'Mosaic bento box grid' },
  { id: 'split',    label: 'Split',    hint: 'Color panel + card list' },
]

const DEFAULT_PAGE = {
  siteName: '',
  tagline: '',
  description: '',
  logoUrl: null,
  logoPath: null,
  layout: 'hero',
  accentColor: '#111111',
  bgColor: '#ffffff',
  cardBg: '#f5f5f5',
  textColor: '#111111',
  items: [],
}

// ── Section accordion ──────────────────────────────────────────────

function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="lb-section">
      <button className="lb-section-toggle" onClick={() => setOpen((v) => !v)}>
        <span className={`bacc-chevron${open ? ' open' : ''}`} />
        <span className="lb-section-title">{title}</span>
      </button>
      {open && <div className="lb-section-body">{children}</div>}
    </div>
  )
}

// ── Item editor (one configurator entry in the list) ───────────────

function ItemEditor({ item, onChange, onDelete, onMoveUp, onMoveDown }) {
  return (
    <div className="lb-item">
      <div className="lb-item-header">
        <span className="lb-item-name">{item.label || 'Configurator'}</span>
        <div className="lb-item-actions">
          <button className="btn-icon-move" disabled={!onMoveUp} onClick={onMoveUp}>↑</button>
          <button className="btn-icon-move" disabled={!onMoveDown} onClick={onMoveDown}>↓</button>
          <button className="btn-icon-delete" onClick={onDelete}>✕</button>
        </div>
      </div>
      <input className="field-input" placeholder="Label (shown on card)"
        value={item.label} onChange={(e) => onChange({ ...item, label: e.target.value })} />
      <input className="field-input" placeholder="Short description (optional)"
        value={item.description} onChange={(e) => onChange({ ...item, description: e.target.value })} />
    </div>
  )
}

// ── Logo upload section ────────────────────────────────────────────

function LogoEditor({ logoUrl, logoPath, uid: userUid, onChange }) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="lb-logo-editor">
      {logoUrl ? (
        <div className="lb-logo-preview">
          <img src={logoUrl} alt="Logo" className="lb-logo-thumb" />
          <button className="btn-text-danger" onClick={() => setShowPicker(true)}>Change</button>
          <button className="btn-text-danger" onClick={async () => {
            if (logoPath) await deleteFile(logoPath)
            onChange({ logoUrl: null, logoPath: null })
          }}>Remove</button>
        </div>
      ) : (
        <button className="btn-upload" onClick={() => setShowPicker(true)}>Choose logo image</button>
      )}
      {showPicker && (
        <MediaPickerModal uid={userUid} accept="image/*"
          onSelect={({ url, storagePath }) => { setShowPicker(false); onChange({ logoUrl: url, logoPath: storagePath }) }}
          onClose={() => setShowPicker(false)} />
      )}
    </div>
  )
}

// ── Main builder ───────────────────────────────────────────────────

export default function LandingBuilder() {
  const { id }         = useParams()
  const { user, profile } = useAuth()
  const navigate       = useNavigate()

  const [name, setName]         = useState('')
  const [page, setPage]         = useState(DEFAULT_PAGE)
  const [published, setPublished] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [dirty, setDirty]       = useState(false)
  const [allConfigs, setAllConfigs] = useState([])
  const [showPicker, setShowPicker] = useState(false)

  const autoSave    = useRef(null)
  const initialLoad = useRef(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getLandingPage(id),
      getUserConfigurators(user.uid),
    ]).then(([lp, cfgs]) => {
      if (!lp) { navigate('/landing-pages'); return }
      setName(lp.name ?? '')
      setPage({
        siteName:    lp.siteName    ?? '',
        tagline:     lp.tagline     ?? '',
        description: lp.description ?? '',
        logoUrl:     lp.logoUrl     ?? null,
        logoPath:    lp.logoPath    ?? null,
        layout:      lp.layout      ?? 'hero',
        accentColor: lp.accentColor ?? '#111111',
        bgColor:     lp.bgColor     ?? '#ffffff',
        cardBg:      lp.cardBg      ?? '#f5f5f5',
        textColor:   lp.textColor   ?? '#111111',
        items:       lp.items       ?? [],
      })
      setPublished(lp.published ?? false)
      setAllConfigs(cfgs)
      setLoading(false)
    })
  }, [id, user])

  const doSave = useCallback(async (n, pg) => {
    setSaving(true)
    try {
      await saveLandingPage(id, { name: n, ...pg })
      setSaved(true); setDirty(false)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }, [id])

  useEffect(() => {
    if (loading) return
    if (initialLoad.current) { initialLoad.current = false; return }
    setDirty(true)
    clearTimeout(autoSave.current)
    autoSave.current = setTimeout(() => doSave(name, page), 1500)
    return () => clearTimeout(autoSave.current)
  }, [name, page])

  function setField(key, value) { setPage((p) => ({ ...p, [key]: value })) }

  function addConfig(cfg) {
    const already = page.items.some((x) => x.configId === cfg.id)
    if (already) return
    setPage((p) => ({
      ...p,
      items: [...p.items, { id: uid(), configId: cfg.id, label: cfg.name, description: '' }],
    }))
    setShowPicker(false)
  }

  function updateItem(itemId, updated) {
    setPage((p) => ({ ...p, items: p.items.map((x) => x.id === itemId ? updated : x) }))
  }

  function removeItem(itemId) {
    setPage((p) => ({ ...p, items: p.items.filter((x) => x.id !== itemId) }))
  }

  function moveItem(i, dir) {
    setPage((p) => {
      const arr = [...p.items]
      const j   = i + dir
      if (j < 0 || j >= arr.length) return p
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...p, items: arr }
    })
  }

  async function handlePublish() {
    const subOk = ['trial', 'active'].includes(profile?.subscriptionStatus)
    if (!subOk) { navigate('/billing'); return }
    if (!published) {
      const limit = getLandingPageLimit(profile)
      const count = await getPublishedLandingPageCount(user.uid)
      if (count >= limit) { navigate('/billing'); return }
    }
    clearTimeout(autoSave.current)
    await saveLandingPage(id, { name, ...page })
    await publishLandingPage(id, !published)
    setPublished((v) => !v)
  }

  const addedIds    = new Set(page.items.map((x) => x.configId))
  const available   = allConfigs.filter((c) => !addedIds.has(c.id))
  const publicUrl   = `${window.location.origin}/lp/${id}`

  if (loading) return <div className="page-loading">Loading…</div>

  return (
    <div className="builder lb-builder">
      <div className="builder-inner">

        {/* Top bar */}
        <div className="builder-topbar">
          <Link to="/landing-pages" className="btn-ghost btn-sm builder-back-btn">← Back</Link>
          <input className="builder-name-input" value={name}
            onChange={(e) => setName(e.target.value)} placeholder="Page name" />
          <div className="builder-actions">
            <button className="btn-ghost btn-sm" onClick={() => clearTimeout(autoSave.current) || doSave(name, page)} disabled={saving}>
              {saved ? '✓' : saving ? '…' : dirty ? 'Save*' : 'Save'}
            </button>
            <button className="btn-ghost btn-sm" onClick={() => window.open(publicUrl, '_blank')}>Preview</button>
            <button className={published ? 'btn-danger' : 'btn-primary'} onClick={handlePublish}>
              {published ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="builder-body">

          {/* Sidebar */}
          <aside className="builder-settings" style={{ width: 340, minWidth: 340 }}>

            {/* Branding */}
            <Section title="Branding">
              <label className="vs-label" style={{ display: 'block', marginBottom: 6 }}>Logo</label>
              <LogoEditor
                logoUrl={page.logoUrl} logoPath={page.logoPath} uid={user.uid}
                onChange={({ logoUrl, logoPath }) => setPage((p) => ({ ...p, logoUrl, logoPath }))}
              />
              <label className="vs-label" style={{ display: 'block', marginTop: 12, marginBottom: 4 }}>Site name</label>
              <input className="field-input" placeholder="Your Brand" value={page.siteName}
                onChange={(e) => setField('siteName', e.target.value)} />
              <label className="vs-label" style={{ display: 'block', marginTop: 10, marginBottom: 4 }}>Tagline</label>
              <input className="field-input" placeholder="Configure your perfect product" value={page.tagline}
                onChange={(e) => setField('tagline', e.target.value)} />
              <label className="vs-label" style={{ display: 'block', marginTop: 10, marginBottom: 4 }}>Description</label>
              <textarea className="field-input lb-textarea" rows={3} placeholder="A short intro paragraph…"
                value={page.description} onChange={(e) => setField('description', e.target.value)} />
            </Section>

            {/* Layout */}
            <Section title="Layout">
              <div className="lb-layout-grid">
                {LAYOUTS.map((l) => (
                  <button key={l.id} title={l.hint}
                    className={`lb-layout-card${page.layout === l.id ? ' active' : ''}`}
                    onClick={() => setField('layout', l.id)}>
                    <span className="lb-layout-thumb" data-layout={l.id}>
                      {/* SVG thumbnail sketches */}
                      {l.id === 'hero' && <HeroThumb />}
                      {l.id === 'minimal' && <MinimalThumb />}
                      {l.id === 'magazine' && <MagazineThumb />}
                      {l.id === 'bento' && <BentoThumb />}
                      {l.id === 'split' && <SplitThumb />}
                    </span>
                    <span className="lb-layout-label">{l.label}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* Colors */}
            <Section title="Colors" defaultOpen={false}>
              {[
                { key: 'accentColor', label: 'Accent' },
                { key: 'bgColor',     label: 'Background' },
                { key: 'cardBg',      label: 'Card fill' },
                { key: 'textColor',   label: 'Text' },
              ].map(({ key, label }) => (
                <div key={key} className="vs-row" style={{ marginBottom: 10 }}>
                  <label className="vs-label">{label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="color" className="color-picker" value={page[key]}
                      onChange={(e) => setField(key, e.target.value)} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{page[key]}</span>
                  </div>
                </div>
              ))}
            </Section>

            {/* Configurators */}
            <Section title={`Configurators (${page.items.length})`}>
              {page.items.length > 0 && page.items.map((item, i) => (
                <ItemEditor
                  key={item.id}
                  item={item}
                  onChange={(u) => updateItem(item.id, u)}
                  onDelete={() => removeItem(item.id)}
                  onMoveUp={i > 0 ? () => moveItem(i, -1) : null}
                  onMoveDown={i < page.items.length - 1 ? () => moveItem(i, 1) : null}
                />
              ))}

              {/* Configurator picker */}
              {showPicker ? (
                <div className="lb-config-picker">
                  <div className="lb-picker-header">
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Add configurator</span>
                    <button className="btn-icon-delete" onClick={() => setShowPicker(false)}>✕</button>
                  </div>
                  {available.length === 0
                    ? <p className="builder-hint">All configurators already added.</p>
                    : available.map((cfg) => (
                        <button key={cfg.id} className="lb-config-option" onClick={() => addConfig(cfg)}>
                          <span>{cfg.name}</span>
                          <span className="lb-config-add">+ Add</span>
                        </button>
                      ))
                  }
                </div>
              ) : (
                <button className="btn-add lb-add-btn" onClick={() => setShowPicker(true)}>+ Add configurator</button>
              )}
            </Section>

            {/* Share */}
            <Section title="Share" defaultOpen={false}>
              {published ? (
                <div className="lb-share">
                  <p className="builder-hint">Your landing page is live at:</p>
                  <div className="lb-share-url">
                    <code className="lb-share-code">/lp/{id}</code>
                    <button className="btn-ghost btn-sm"
                      onClick={() => navigator.clipboard.writeText(publicUrl)}>Copy</button>
                  </div>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="lb-share-open">
                    Open in new tab →
                  </a>
                </div>
              ) : (
                <p className="builder-hint">Publish the page to get a shareable link.</p>
              )}
            </Section>

          </aside>

          {/* Live preview */}
          <div className="builder-preview lb-preview">
            <LandingRenderer page={page} />
          </div>

        </div>
      </div>
    </div>
  )
}

// ── SVG layout thumbnail sketches ──────────────────────────────────

function HeroThumb() {
  return (
    <svg viewBox="0 0 60 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="6" width="20" height="4" rx="2" fill="currentColor" opacity=".5"/>
      <rect x="12" y="13" width="36" height="5" rx="2" fill="currentColor" opacity=".8"/>
      <rect x="16" y="20" width="28" height="3" rx="1.5" fill="currentColor" opacity=".35"/>
      <rect x="4"  y="28" width="16" height="11" rx="2" fill="currentColor" opacity=".2"/>
      <rect x="22" y="28" width="16" height="11" rx="2" fill="currentColor" opacity=".2"/>
      <rect x="40" y="28" width="16" height="11" rx="2" fill="currentColor" opacity=".2"/>
    </svg>
  )
}

function MinimalThumb() {
  return (
    <svg viewBox="0 0 60 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="12" height="5" rx="2" fill="currentColor" opacity=".5"/>
      <rect x="4" y="12" width="52" height="1" fill="currentColor" opacity=".2"/>
      <rect x="4" y="16" width="32" height="5" rx="2" fill="currentColor" opacity=".8"/>
      <rect x="4" y="24" width="52" height="5" rx="2" fill="currentColor" opacity=".18"/>
      <rect x="4" y="31" width="52" height="5" rx="2" fill="currentColor" opacity=".18"/>
      <rect x="4" y="38" width="52" height="5" rx="2" fill="currentColor" opacity=".18"/>
    </svg>
  )
}

function MagazineThumb() {
  return (
    <svg viewBox="0 0 60 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="10" height="4" rx="2" fill="currentColor" opacity=".5"/>
      <rect x="4" y="11" width="32" height="29" rx="3" fill="currentColor" opacity=".25"/>
      <rect x="38" y="11" width="18" height="13" rx="2" fill="currentColor" opacity=".18"/>
      <rect x="38" y="27" width="18" height="13" rx="2" fill="currentColor" opacity=".18"/>
    </svg>
  )
}

function BentoThumb() {
  return (
    <svg viewBox="0 0 60 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="24" height="5" rx="2" fill="currentColor" opacity=".8"/>
      <rect x="4" y="12" width="34" height="14" rx="3" fill="currentColor" opacity=".25"/>
      <rect x="40" y="12" width="16" height="14" rx="3" fill="currentColor" opacity=".18"/>
      <rect x="4" y="28" width="16" height="12" rx="3" fill="currentColor" opacity=".18"/>
      <rect x="22" y="28" width="16" height="12" rx="3" fill="currentColor" opacity=".18"/>
      <rect x="40" y="28" width="16" height="12" rx="3" fill="currentColor" opacity=".18"/>
    </svg>
  )
}

function SplitThumb() {
  return (
    <svg viewBox="0 0 60 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="20" height="36" rx="3" fill="currentColor" opacity=".25"/>
      <rect x="28" y="8" width="28" height="7" rx="2" fill="currentColor" opacity=".18"/>
      <rect x="28" y="18" width="28" height="7" rx="2" fill="currentColor" opacity=".18"/>
      <rect x="28" y="28" width="28" height="7" rx="2" fill="currentColor" opacity=".18"/>
    </svg>
  )
}
