import { useEffect, useMemo, useRef, useState, useCallback } from 'react'

const FRAME_PATH = '/prygikast'

export default function PrygikastApiDemo() {
  const [ready, setReady] = useState(null)
  const [selection, setSelection] = useState(null)
  const [order, setOrder] = useState(null)
  const [log, setLog] = useState([])
  const [custom, setCustom] = useState('{"selection":{}}')
  const frameRef = useRef(null)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const liveUrl = useMemo(() => {
    const params = new URLSearchParams()
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
    return `${origin}${FRAME_PATH}${qs ? '?' + qs : ''}`
  }, [selection, origin])

  const postToFrame = useCallback((type, payload) => {
    if (!frameRef.current?.contentWindow) return
    frameRef.current.contentWindow.postMessage({ type: 'glbc:' + type, payload }, '*')
  }, [])

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
  const active = getActiveVariant()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', height: '100dvh', overflow: 'hidden' }}>
      <iframe ref={frameRef} src={FRAME_PATH} title="Prügikast preview"
        style={{ width: '100%', height: '100%', border: 0 }} />
      <div style={{ padding: 16, overflowY: 'auto', borderLeft: '1px solid #ddd', fontFamily: 'system-ui, sans-serif', fontSize: 13 }}>
        <h1 style={{ fontSize: 18, marginBottom: 12 }}>Prügikast API demo</h1>

        <h2 style={{ fontSize: 13, marginTop: 14 }}>From glbc:ready</h2>
        {!ready
          ? <div style={{ color: '#888' }}>Waiting for ready event…</div>
          : (
            <div style={{ fontSize: 12 }}>
              <div><strong>Config:</strong> {ready.name || '(unnamed)'}</div>
              <div><strong>Groups:</strong> {ready.groups.length} · <strong>Interiors:</strong> {(ready.interiors || []).length}</div>
            </div>
          )}

        <h2 style={{ fontSize: 13, marginTop: 14 }}>Current URL (live)</h2>
        <div style={{ fontFamily: 'monospace', fontSize: 11, padding: 6, background: '#f4f4f4', borderRadius: 4, wordBreak: 'break-all' }}>{liveUrl}</div>
        <Btn onClick={() => navigator.clipboard.writeText(liveUrl)}>Copy URL</Btn>
        <Btn onClick={() => window.open(liveUrl, '_blank')}>Open in tab</Btn>

        <h2 style={{ fontSize: 13, marginTop: 14 }}>Variants / Colors / Parts</h2>
        {!ready
          ? <div style={{ color: '#888' }}>—</div>
          : (
            <>
              {ready.groups.map((g) => (
                <Group key={g.id} title={`${g.label || 'Default'} (${g.variants.length})`}>
                  {g.variants.map((v) => (
                    <Btn key={v.id}
                      sel={selection?.variants?.[g.id] === v.id}
                      onClick={() => postToFrame('patchSelection', { selection: { variants: { [g.id]: v.id } } })}>
                      {v.label}
                    </Btn>
                  ))}
                </Group>
              ))}

              {active && active.variant.colorOptions?.length > 0 && (
                <Group title={`Colors — ${active.variant.label}`}>
                  {active.variant.colorOptions.map((c) => (
                    <Btn key={c.id}
                      sel={selection?.color === c.label}
                      onClick={() => postToFrame('patchSelection', { selection: { color: c.label } })}>
                      <Swatch color={c.swatch} />{c.label}
                    </Btn>
                  ))}
                </Group>
              )}

              {active && (active.variant.partOptions || []).map((grp) => (
                <Group key={grp.id} title={`${grp.label} — part group`}>
                  {(grp.options || []).map((o) => (
                    <Btn key={o.id}
                      sel={selection?.partOptions?.[grp.label] === o.label}
                      onClick={() => postToFrame('patchSelection', { selection: { partOptions: { [grp.label]: o.label } } })}>
                      {o.swatch ? <Swatch color={o.swatch} /> : null}
                      {o.label}
                    </Btn>
                  ))}
                </Group>
              ))}

              {active && active.variant.layers?.length > 0 && (
                <Group title="Layer toggles">
                  {active.variant.layers.map((l) => {
                    const cur = selection?.layers?.[l.id] ?? l.defaultOn
                    return (
                      <Btn key={l.id} sel={cur}
                        onClick={() => postToFrame('patchSelection', { selection: { layers: { [l.id]: !cur } } })}>
                        {l.label} {cur ? 'ON' : 'OFF'}
                      </Btn>
                    )
                  })}
                </Group>
              )}
            </>
          )}

        <h2 style={{ fontSize: 13, marginTop: 14 }}>View tab</h2>
        {(ready?.tabs || ['exterior', 'interior', 'order']).map((v) => (
          <Btn key={v}
            sel={selection?.view === v}
            onClick={() => postToFrame('patchSelection', { selection: { view: v } })}>
            {v}
          </Btn>
        ))}

        <h2 style={{ fontSize: 13, marginTop: 14 }}>Custom postMessage</h2>
        <textarea value={custom} onChange={(e) => setCustom(e.target.value)}
          style={{ width: '100%', height: 60, padding: 6, fontFamily: 'monospace', fontSize: 11, border: '1px solid #ddd', borderRadius: 4 }} />
        <Btn onClick={() => sendCustom('setSelection')}>setSelection</Btn>
        <Btn onClick={() => sendCustom('patchSelection')}>patchSelection</Btn>

        <h2 style={{ fontSize: 13, marginTop: 14 }}>Event log</h2>
        <div style={{ maxHeight: 260, overflowY: 'auto', fontSize: 11, fontFamily: 'monospace', background: '#f4f4f4', padding: 8, borderRadius: 4 }}>
          {log.length === 0
            ? <div style={{ color: '#888' }}>No events yet…</div>
            : log.map((e, i) => (
              <div key={i} style={{ marginBottom: 6, borderBottom: '1px solid #e3e3e3', paddingBottom: 4 }}>
                <div style={{ fontWeight: 600 }}>{e.type}</div>
                <div style={{ wordBreak: 'break-all' }}>{JSON.stringify(e.payload)}</div>
              </div>
            ))}
        </div>

        {order && (
          <>
            <h2 style={{ fontSize: 13, marginTop: 14 }}>Last order</h2>
            <div style={{ fontSize: 12 }}>
              <div><strong>Order ID:</strong> <code>{order.orderId || 'null'}</code></div>
              <div><strong>State URL:</strong></div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, background: '#f4f4f4', padding: 6, borderRadius: 4, wordBreak: 'break-all' }}>{order.stateUrl || '(none)'}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Btn({ children, onClick, sel = false }) {
  return (
    <button onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', margin: '3px 4px 3px 0',
        fontSize: 12, borderRadius: 4, cursor: 'pointer',
        border: `1px solid ${sel ? '#111' : '#ccc'}`,
        background: sel ? '#111' : '#fff',
        color: sel ? '#fff' : '#111',
      }}>
      {children}
    </button>
  )
}

function Group({ title, children }) {
  return (
    <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #eee' }}>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{title}</div>
      <div>{children}</div>
    </div>
  )
}

function Swatch({ color }) {
  return <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: color || '#888', border: '1px solid rgba(0,0,0,0.15)' }} />
}
