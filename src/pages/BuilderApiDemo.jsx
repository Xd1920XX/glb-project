import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { getConfigurator } from '../firebase/db.js'
import { CmsSidebar } from '../components/CmsSidebar.jsx'
import { LOCALES } from '../i18n/index.jsx'
import { selectionToQuery } from '../embed/embedApi.js'

const DEVICE_PRESETS = [
  { id: 'full',    label: 'Full',    width: null },
  { id: 'laptop',  label: 'Laptop',  width: 1024 },
  { id: 'tablet',  label: 'Tablet',  width: 768 },
  { id: 'mobile',  label: 'Mobile',  width: 375 },
]

function formatRelativeTime(then, now) {
  const s = Math.max(0, Math.floor((now - then) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

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
  const [panel, setPanel] = useState('')
  const [custom, setCustom] = useState('{"selection":{}}')
  const [reloadNonce, setReloadNonce] = useState(0)
  const [device, setDevice] = useState('full')
  const [urlMode, setUrlMode] = useState('flat') // 'flat' | 'state'
  const [now, setNow] = useState(Date.now())
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

  // Frame URL — adds ?lang=<code> and ?panel=<mode> for live preview
  const frameSrc = useMemo(() => {
    if (!id) return ''
    const params = new URLSearchParams()
    if (lang) params.set('lang', lang)
    if (panel) params.set('panel', panel)
    const qs = params.toString()
    return `${origin}/embed/${id}${qs ? '?' + qs : ''}`
  }, [id, lang, panel, origin])

  // Live URL from current selection (for copy/share)
  const liveUrl = useMemo(() => {
    if (!id) return ''
    if (urlMode === 'state') {
      const base = `${origin}/embed/${id}`
      const stateQs = selection ? selectionToQuery(selection).replace(/^\?/, '') : ''
      const extra = []
      if (lang) extra.push(`lang=${encodeURIComponent(lang)}`)
      if (panel) extra.push(`panel=${encodeURIComponent(panel)}`)
      const all = [stateQs, ...extra].filter(Boolean).join('&')
      return `${base}${all ? '?' + all : ''}`
    }
    const params = new URLSearchParams()
    if (lang) params.set('lang', lang)
    if (panel) params.set('panel', panel)
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
  }, [id, selection, lang, panel, urlMode, origin])

  const embedSnippet = useMemo(() => {
    const w = DEVICE_PRESETS.find((d) => d.id === device)?.width
    const widthAttr = w ? `${w}` : `100%`
    return `<iframe src="${liveUrl}" width="${widthAttr}" height="720" frameborder="0" allow="xr-spatial-tracking" style="border:0"></iframe>`
  }, [liveUrl, device])

  const postToFrame = useCallback((type, payload) => {
    if (!frameRef.current?.contentWindow) return
    frameRef.current.contentWindow.postMessage({ type: 'glbc:' + type, payload }, '*')
  }, [])

  // Listen for iframe events
  useEffect(() => {
    function onMessage(event) {
      const data = event.data
      if (!data || typeof data.type !== 'string' || !data.type.startsWith('glbc:')) return
      setLog((arr) => [{ type: data.type, payload: data.payload, at: Date.now() }, ...arr].slice(0, 50))
      if (data.type === 'glbc:ready') setReady(data.payload)
      if (data.type === 'glbc:selectionChanged') setSelection(data.payload.selection)
      if (data.type === 'glbc:orderSubmitted') setOrder(data.payload)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Tick clock so relative timestamps in the log stay fresh
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  function resetIframeState() {
    setReady(null)
    setSelection(null)
    setOrder(null)
    setLog([])
  }

  function changeLang(next) {
    setLang(next)
    resetIframeState()
  }

  function changePanel(next) {
    setPanel(next)
    resetIframeState()
  }

  function reloadFrame() {
    setReloadNonce((n) => n + 1)
    resetIframeState()
  }

  function resetSelection() {
    postToFrame('setSelection', { selection: {} })
  }

  function submitOrderProgrammatic() {
    let formData = {}
    try {
      const parsed = JSON.parse(custom)
      if (parsed && typeof parsed === 'object' && parsed.formData) formData = parsed.formData
    } catch { /* ignore — send empty */ }
    postToFrame('submitOrder', { formData })
  }

  function clearLog() {
    setLog([])
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {})
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
  const deviceWidth = DEVICE_PRESETS.find((d) => d.id === device)?.width
  const frameStyle = deviceWidth
    ? { width: `${deviceWidth}px`, maxWidth: '100%', margin: '0 auto' }
    : undefined

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
          <iframe
            key={reloadNonce}
            ref={frameRef}
            src={frameSrc}
            className="api-demo-frame"
            title="Embed preview"
            style={frameStyle}
          />

          <div className="api-demo-panel">
            <h2>Iframe</h2>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
              {DEVICE_PRESETS.map((d) => (
                <button key={d.id}
                  className={`api-demo-btn${device === d.id ? '' : ' secondary'}`}
                  onClick={() => setDevice(d.id)}>
                  {d.label}{d.width ? ` (${d.width})` : ''}
                </button>
              ))}
            </div>
            <button className="api-demo-btn secondary" onClick={reloadFrame}>↻ Reload iframe</button>
            <button className="api-demo-btn secondary" onClick={resetSelection} disabled={!ready}>Reset selection</button>

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

            <h2>Control panel</h2>
            <select value={panel} onChange={(e) => changePanel(e.target.value)} style={{ width: '100%', padding: '5px 7px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border)' }}>
              <option value="">Visible (default)</option>
              <option value="hidden">Hidden (?panel=hidden)</option>
            </select>
            <p className="builder-hint" style={{ marginTop: 4, fontSize: 11 }}>
              End user can re-open panel with the ‹ button on the viewer edge.
              Aliases <code>?panel=collapsed</code> and <code>?panel=none</code> also work.
            </p>

            <h2>From glbc:ready</h2>
            {!ready
              ? <div style={{ color: 'var(--text-muted)' }}>Waiting for ready event…</div>
              : (
                <div style={{ fontSize: 12 }}>
                  <div><strong>Config:</strong> {ready.name || '(unnamed)'}</div>
                  <div><strong>Groups:</strong> {ready.groups.length} · <strong>Interiors:</strong> {(ready.interiors || []).length}</div>
                  <details style={{ marginTop: 4 }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11 }}>Show full ready payload</summary>
                    <pre style={{ fontSize: 10, background: 'var(--bg)', padding: 6, borderRadius: 3, marginTop: 4, maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(ready, null, 2)}</pre>
                  </details>
                </div>
              )}

            <h2>URL / Share</h2>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <button className={`api-demo-btn${urlMode === 'flat' ? '' : ' secondary'}`} onClick={() => setUrlMode('flat')}>Flat</button>
              <button className={`api-demo-btn${urlMode === 'state' ? '' : ' secondary'}`} onClick={() => setUrlMode('state')}>?state=…</button>
            </div>
            <div className="api-demo-url">{liveUrl}</div>
            <button className="api-demo-btn secondary" onClick={() => copyToClipboard(liveUrl)}>Copy URL</button>
            <button className="api-demo-btn secondary" onClick={() => window.open(liveUrl, '_blank')}>Open in tab</button>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>Embed HTML snippet:</div>
            <div className="api-demo-url" style={{ fontSize: 10 }}>{embedSnippet}</div>
            <button className="api-demo-btn secondary" onClick={() => copyToClipboard(embedSnippet)}>Copy embed HTML</button>

            <h2>Selection (live)</h2>
            {selection
              ? <pre style={{ fontSize: 10, background: 'var(--bg)', padding: 6, borderRadius: 3, maxHeight: 200, overflow: 'auto', margin: 0 }}>{JSON.stringify(selection, null, 2)}</pre>
              : <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</div>}

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
            <button disabled={!ready} className="api-demo-btn" onClick={() => sendCustom('setSelection')}>setSelection</button>
            <button disabled={!ready} className="api-demo-btn" onClick={() => sendCustom('patchSelection')}>patchSelection</button>
            <button disabled={!ready} className="api-demo-btn" onClick={submitOrderProgrammatic}>submitOrder</button>
            <p className="builder-hint" style={{ marginTop: 4, fontSize: 11 }}>
              submitOrder reads <code>formData</code> from the textarea payload (or sends an empty object).
            </p>

            <h2>
              Event log
              <button className="api-demo-btn secondary" style={{ float: 'right', padding: '2px 8px', fontSize: 11 }} onClick={clearLog} disabled={log.length === 0}>Clear</button>
            </h2>
            <div className="api-demo-log">
              {log.length === 0
                ? <div style={{ color: '#888' }}>No events yet…</div>
                : log.map((e, i) => (
                  <div key={i} className="entry">
                    <div className="type" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{e.type}</span>
                      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 'normal' }}>{formatRelativeTime(e.at, now)}</span>
                        <button className="api-demo-btn secondary" style={{ padding: '1px 6px', fontSize: 10 }} onClick={() => copyToClipboard(JSON.stringify(e.payload, null, 2))}>copy</button>
                      </span>
                    </div>
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
