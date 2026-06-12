import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { getConfigurator } from '../firebase/db.js'
import { CmsSidebar } from '../components/CmsSidebar.jsx'
import { LOCALES } from '../i18n/index.jsx'

export default function BuilderApiDemo() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(null)
  const [selection, setSelection] = useState(null)
  const [order, setOrder] = useState(null)
  const [log, setLog] = useState([])
  const [lang, setLang] = useState('')
  const [custom, setCustom] = useState('{"selection":{}}')
  const frameRef = useRef(null)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    if (!user) return
    getConfigurator(id).then((cfg) => {
      if (!cfg) { navigate('/dashboard'); return }
      if (cfg.ownerId !== user.uid) { navigate('/dashboard'); return }
      setConfig(cfg)
      setLoading(false)
    })
  }, [id, user, navigate])

  // Frame URL — adds ?lang=<code> for live language preview
  const frameSrc = useMemo(() => {
    if (!id) return ''
    return `${origin}/embed/${id}${lang ? `?lang=${lang}` : ''}`
  }, [id, lang, origin])

  // Live URL from current selection (for copy/share)
  const liveUrl = useMemo(() => {
    if (!id) return ''
    const params = new URLSearchParams()
    if (lang) params.set('lang', lang)
    if (selection?.variants) {
      for (const [gid, vid] of Object.entries(selection.variants)) {
        if (vid) params.set(`variants.${gid}`, vid)
      }
    }
    if (selection?.color) params.set('color', selection.color)
    if (selection?.partOptions) {
      for (const [label, opt] of Object.entries(selection.partOptions)) {
        if (opt) params.set(`part.${label}`, opt)
      }
    }
    if (selection?.interiorId) params.set('interior', selection.interiorId)
    if (selection?.view) params.set('view', selection.view)
    if (selection?.layers) {
      for (const [lid, on] of Object.entries(selection.layers)) {
        params.set(`layer.${lid}`, on ? 'true' : 'false')
      }
    }
    const qs = params.toString()
    return `${origin}/embed/${id}${qs ? '?' + qs : ''}`
  }, [id, selection, lang, origin])

  const postToFrame = useCallback((type, payload) => {
    if (!frameRef.current?.contentWindow) return
    frameRef.current.contentWindow.postMessage({ type: 'glbc:' + type, payload }, '*')
  }, [])

  // Listen for iframe events
  useEffect(() => {
    function onMessage(event) {
      const data = event.data
      if (!data || typeof data.type !== 'string' || !data.type.startsWith('glbc:')) return
      setLog((arr) => [{ type: data.type, payload: data.payload, at: Date.now() }, ...arr].slice(0, 30))
      if (data.type === 'glbc:ready') setReady(data.payload)
      if (data.type === 'glbc:selectionChanged') setSelection(data.payload.selection)
      if (data.type === 'glbc:orderSubmitted') setOrder(data.payload)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // When user switches language, reset and reload
  function changeLang(next) {
    setLang(next)
    setReady(null)
    setSelection(null)
    setOrder(null)
    setLog([])
  }

  function sendCustom(type) {
    let payload
    try { payload = JSON.parse(custom) }
    catch (e) { alert('Invalid JSON: ' + e.message); return }
    postToFrame(type, payload)
  }

  function getActiveVariant() {
    if (!ready || !selection?.variants) return null
    for (const g of ready.groups) {
      const vid = selection.variants[g.id]
      if (!vid) continue
      const v = g.variants.find((x) => x.id === vid)
      if (v) return { group: g, variant: v }
    }
    return null
  }

  if (loading || !config) {
    return (
      <div className="cms-layout">
        <CmsSidebar active="configurators" />
        <main className="cms-content"><div className="dash-empty">Loading…</div></main>
      </div>
    )
  }

  const active = getActiveVariant()

  return (
    <div className="cms-layout">
      <CmsSidebar active="configurators" />
      <main className="cms-content">
        <div className="builder-header">
          <div>
            <div className="builder-breadcrumb">
              <Link to="/dashboard">Configurators</Link> ›{' '}
              <Link to={`/builder/${id}`}>{config.name}</Link> ›{' '}
              <span>API Demo</span>
            </div>
            <h1 style={{ margin: 0 }}>API Demo</h1>
            <p className="builder-hint">Live test of the embed postMessage API. Click options on the right to push them into the iframe.</p>
          </div>
          <div className="builder-header-actions">
            <Link to={`/builder/${id}/translations`} className="btn-ghost">Translations</Link>
            <Link to={`/builder/${id}`} className="btn-ghost">Back to Builder</Link>
          </div>
        </div>

        <div className="api-demo-layout">
          <iframe ref={frameRef} src={frameSrc} className="api-demo-frame" title="Embed preview" />

          <div className="api-demo-panel">
            <h2>Language</h2>
            <select value={lang} onChange={(e) => changeLang(e.target.value)} style={{ width: '100%', padding: '5px 7px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border)' }}>
              <option value="">(default — no ?lang)</option>
              {Object.entries(LOCALES).map(([code, meta]) => (
                <option key={code} value={code}>{meta.name} ({code})</option>
              ))}
            </select>
            {config.translations && (
              <p className="builder-hint" style={{ marginTop: 4, fontSize: 11 }}>
                Translations available for: {Object.keys(config.translations).join(', ') || '(none)'}
              </p>
            )}

            <h2>From glbc:ready</h2>
            {!ready
              ? <div style={{ color: 'var(--text-muted)' }}>Waiting for ready event…</div>
              : (
                <div style={{ fontSize: 12 }}>
                  <div><strong>Config:</strong> {ready.name || '(unnamed)'}</div>
                  <div><strong>Groups:</strong> {ready.groups.length} · <strong>Interiors:</strong> {(ready.interiors || []).length}</div>
                </div>
              )}

            <h2>Current URL (live)</h2>
            <div className="api-demo-url">{liveUrl}</div>
            <button className="api-demo-btn secondary" onClick={() => navigator.clipboard.writeText(liveUrl)}>Copy URL</button>
            <button className="api-demo-btn secondary" onClick={() => window.open(liveUrl, '_blank')}>Open in tab</button>

            <h2>Variants / Colors / Parts</h2>
            {!ready
              ? <div style={{ color: 'var(--text-muted)' }}>—</div>
              : (
                <>
                  {ready.groups.map((g) => (
                    <div key={g.id} className="api-demo-group">
                      <strong>{g.label || 'Default group'} ({g.variants.length})</strong>
                      {g.variants.map((v) => {
                        const sel = selection?.variants?.[g.id] === v.id
                        return (
                          <button key={v.id}
                            className={`api-demo-btn${sel ? '' : ' secondary'}`}
                            title={v.id}
                            onClick={() => postToFrame('patchSelection', { selection: { variants: { [g.id]: v.id } } })}>
                            {v.label}
                          </button>
                        )
                      })}
                    </div>
                  ))}

                  {active && active.variant.colorOptions?.length > 0 && (
                    <div className="api-demo-group">
                      <strong>Colors — {active.variant.label}</strong>
                      {active.variant.colorOptions.map((c) => {
                        const sel = selection?.color === c.label
                        return (
                          <button key={c.id}
                            className={`api-demo-btn${sel ? '' : ' secondary'}`}
                            title={c.id}
                            onClick={() => postToFrame('patchSelection', { selection: { color: c.label } })}>
                            <span className="api-demo-swatch" style={{ background: c.swatch || '#888' }} />
                            {c.label}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {active && (active.variant.partOptions || []).map((grp) => (
                    <div key={grp.id} className="api-demo-group">
                      <strong>{grp.label} — part group</strong>
                      {(grp.options || []).map((o) => {
                        const sel = selection?.partOptions?.[grp.label] === o.label
                        return (
                          <button key={o.id}
                            className={`api-demo-btn${sel ? '' : ' secondary'}`}
                            title={o.id}
                            onClick={() => postToFrame('patchSelection', { selection: { partOptions: { [grp.label]: o.label } } })}>
                            {o.swatch ? <span className="api-demo-swatch" style={{ background: o.swatch }} /> : null}
                            {o.label}
                          </button>
                        )
                      })}
                    </div>
                  ))}

                  {active && active.variant.layers?.length > 0 && (
                    <div className="api-demo-group">
                      <strong>Layer toggles</strong>
                      {active.variant.layers.map((l) => {
                        const cur = selection?.layers?.[l.id] ?? l.defaultOn
                        return (
                          <button key={l.id}
                            className={`api-demo-btn toggle ${cur ? 'on' : 'off'}`}
                            onClick={() => postToFrame('patchSelection', { selection: { layers: { [l.id]: !cur } } })}>
                            {l.label} {cur ? 'ON' : 'OFF'}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

            <h2>View tab</h2>
            {(ready?.tabs || ['exterior', 'interior', 'order']).map((v) => {
              const sel = selection?.view === v
              return (
                <button key={v}
                  className={`api-demo-btn${sel ? '' : ' secondary'}`}
                  onClick={() => postToFrame('patchSelection', { selection: { view: v } })}>
                  {v}
                </button>
              )
            })}

            {(ready?.interiors || []).length > 0 && (
              <>
                <h2>Interiors</h2>
                {ready.interiors.map((i) => {
                  const sel = selection?.interiorId === i.id
                  return (
                    <button key={i.id}
                      className={`api-demo-btn${sel ? '' : ' secondary'}`}
                      onClick={() => postToFrame('patchSelection', { selection: { interiorId: i.id, view: 'interior' } })}>
                      {i.label}
                    </button>
                  )
                })}
              </>
            )}

            <h2>Custom postMessage</h2>
            <textarea value={custom} onChange={(e) => setCustom(e.target.value)}
              style={{ width: '100%', height: 60, padding: 6, fontFamily: 'monospace', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text)' }} />
            <button className="api-demo-btn" onClick={() => sendCustom('setSelection')}>setSelection</button>
            <button className="api-demo-btn" onClick={() => sendCustom('patchSelection')}>patchSelection</button>

            <h2>Event log</h2>
            <div className="api-demo-log">
              {log.length === 0
                ? <div style={{ color: '#888' }}>No events yet…</div>
                : log.map((e, i) => (
                  <div key={i} className="entry">
                    <div className="type">{e.type}</div>
                    <div style={{ wordBreak: 'break-all' }}>{JSON.stringify(e.payload)}</div>
                  </div>
                ))}
            </div>

            {order && (
              <>
                <h2>Last order</h2>
                <div style={{ fontSize: 12 }}>
                  <div><strong>Order ID:</strong> <code>{order.orderId || 'null'}</code></div>
                  <div><strong>State URL:</strong></div>
                  <div className="api-demo-url">{order.stateUrl || '(none)'}</div>
                  <div><strong>Snapshot:</strong></div>
                  <div className="api-demo-url">{order.snapshotUrl || '(uploading or unavailable)'}</div>
                  {order.snapshotUrl && (
                    <img src={order.snapshotUrl} alt="snapshot" style={{ width: '100%', marginTop: 6, border: '1px solid var(--border)', borderRadius: 4 }} />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
