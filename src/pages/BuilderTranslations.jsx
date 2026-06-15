import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { getConfigurator, saveConfigurator } from '../firebase/db.js'
import { CmsSidebar } from '../components/CmsSidebar.jsx'
import { MediaPickerModal } from '../components/MediaPickerModal.jsx'
import { extractTranslatable } from '../utils/configTranslations.js'
import { LOCALES } from '../i18n/index.jsx'

const DEFAULT_TARGETS = ['et', 'en', 'fi', 'lv', 'lt', 'ru', 'de', 'sv', 'pl']

function FieldRow({ label, original, value, onChange, multiline = false }) {
  return (
    <div className="tr-row">
      <div className="tr-label">{label}</div>
      <div className="tr-original" title="Original text">{original || <em style={{ opacity: 0.4 }}>(empty)</em>}</div>
      {multiline
        ? <textarea className="tr-input tr-input--multiline" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Translation…" />
        : <input className="tr-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Translation…" />
      }
    </div>
  )
}

function fileBasename(url) {
  if (!url) return ''
  try { return decodeURIComponent(url.split('/').pop().split('?')[0]) } catch { return url.split('/').pop() }
}

function AssetRow({ label, accept, original, value, storagePath, onChange, onClear, uid, kind = 'file' }) {
  const [picker, setPicker] = useState(false)
  const has = !!value
  const previewable = kind === 'image' && value
  return (
    <div className="tr-row tr-row--asset">
      <div className="tr-label">{label}</div>
      <div className="tr-original" title="Original asset">
        {original
          ? (kind === 'image'
              ? <img src={original} alt="" style={{ maxHeight: 40, maxWidth: 60, borderRadius: 3 }} />
              : <code style={{ fontSize: 11 }}>{fileBasename(original)}</code>)
          : <em style={{ opacity: 0.4 }}>(no original)</em>}
      </div>
      <div className="tr-asset-cell">
        {previewable && (
          <img src={value} alt="" style={{ maxHeight: 40, maxWidth: 60, borderRadius: 3, marginRight: 8 }} />
        )}
        {has && kind !== 'image' && <code style={{ fontSize: 11, marginRight: 8 }}>{fileBasename(value)}</code>}
        <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setPicker(true)}>
          {has ? 'Replace' : 'Choose…'}
        </button>
        {has && (
          <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px', marginLeft: 4, color: '#dc2626' }} onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      {picker && (
        <MediaPickerModal uid={uid} accept={accept}
          onSelect={(f) => { setPicker(false); onChange(f.url, f.storagePath) }}
          onClose={() => setPicker(false)} />
      )}
      {storagePath && false && null /* storagePath kept on parent state but not surfaced */}
    </div>
  )
}

export default function BuilderTranslations() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeLocale, setActiveLocale] = useState('et')
  const [translations, setTranslations] = useState({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [enabledLocales, setEnabledLocales] = useState(DEFAULT_TARGETS)

  useEffect(() => {
    if (!user) return
    getConfigurator(id).then((cfg) => {
      if (!cfg) { navigate('/dashboard'); return }
      if (cfg.ownerId !== user.uid) { navigate('/dashboard'); return }
      setConfig(cfg)
      setTranslations(cfg.translations || {})
      setLoading(false)
    })
  }, [id, user, navigate])

  const fields = useMemo(() => extractTranslatable(config), [config])

  const T = translations[activeLocale] || {}

  function setT(updater) {
    setTranslations((prev) => {
      const cur = prev[activeLocale] || {}
      const next = typeof updater === 'function' ? updater(cur) : updater
      return { ...prev, [activeLocale]: next }
    })
  }

  function setRoot(field, value) {
    setT((cur) => ({ ...cur, [field]: value }))
  }

  function setNested(path, value) {
    setT((cur) => {
      const next = { ...cur }
      let cursor = next
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i]
        cursor[key] = { ...(cursor[key] || {}) }
        cursor = cursor[key]
      }
      cursor[path[path.length - 1]] = value
      return next
    })
  }

  function getNested(obj, path) {
    let cursor = obj
    for (const k of path) {
      if (cursor == null) return undefined
      cursor = cursor[k]
    }
    return cursor
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Strip empty locales / empty fields to keep document compact
      const cleaned = {}
      for (const [loc, dict] of Object.entries(translations)) {
        const stripped = stripEmpty(dict)
        if (stripped && Object.keys(stripped).length) cleaned[loc] = stripped
      }
      await saveConfigurator(id, { translations: cleaned })
      setSavedAt(new Date())
      setConfig((c) => ({ ...c, translations: cleaned }))
    } catch (err) {
      console.error('Save translations failed', err)
      alert('Save failed: ' + (err.message || err.code || 'unknown error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading || !config || !fields) {
    return (
      <div className="cms-layout">
        <CmsSidebar active="configurators" />
        <main className="cms-content"><div className="dash-empty">Loading…</div></main>
      </div>
    )
  }

  return (
    <div className="cms-layout">
      <CmsSidebar active="configurators" />
      <main className="cms-content">
        <div className="builder-header">
          <div>
            <div className="builder-breadcrumb">
              <Link to="/dashboard">Configurators</Link> ›{' '}
              <Link to={`/builder/${id}`}>{config.name}</Link> ›{' '}
              <span>Translations</span>
            </div>
            <h1 style={{ margin: 0 }}>Translations</h1>
            <p className="builder-hint">Translate the text shown to your customers. Untranslated fields fall back to the original.</p>
          </div>
          <div className="builder-header-actions">
            <Link to={`/builder/${id}/api-demo`} className="btn-ghost">API Demo</Link>
            <Link to={`/builder/${id}`}  className="btn-ghost">Back to Builder</Link>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save translations'}
            </button>
          </div>
        </div>

        {savedAt && (
          <div className="builder-saved">Saved at {savedAt.toLocaleTimeString()}</div>
        )}

        <div className="tr-locale-tabs">
          {DEFAULT_TARGETS.map((loc) => {
            const meta = LOCALES[loc]
            if (!meta) return null
            const hasContent = !!(translations[loc] && Object.keys(stripEmpty(translations[loc]) || {}).length)
            const enabled = enabledLocales.includes(loc)
            return (
              <button key={loc}
                className={`tr-locale-tab${activeLocale === loc ? ' active' : ''}${hasContent ? ' has-content' : ''}`}
                onClick={() => { setActiveLocale(loc); if (!enabled) setEnabledLocales((arr) => [...arr, loc]) }}>
                {meta.name}
                {hasContent && <span className="tr-dot" />}
              </button>
            )
          })}
        </div>

        <div className="tr-content">
          <p className="tr-active-info">
            Editing: <strong>{LOCALES[activeLocale]?.name}</strong>
            {' · '}
            Preview: <a href={`/embed/${id}?lang=${activeLocale}`} target="_blank" rel="noopener noreferrer">/embed/{id}?lang={activeLocale}</a>
          </p>

          <section className="tr-section">
            <h3>General</h3>
            <FieldRow label="Configurator name"
              original={fields.name}
              value={T.name ?? ''}
              onChange={(v) => setRoot('name', v)} />
            <FieldRow label="Exterior tab label"
              original={fields.exteriorLabel}
              value={T.exteriorLabel ?? ''}
              onChange={(v) => setRoot('exteriorLabel', v)} />
            <FieldRow label="Interior tab label"
              original={fields.interiorLabel}
              value={T.interiorLabel ?? ''}
              onChange={(v) => setRoot('interiorLabel', v)} />
          </section>

          {fields.variantGroups.length > 0 && (
            <section className="tr-section">
              <h3>Variant groups</h3>
              {fields.variantGroups.map((g) => (
                <FieldRow key={g.id} label={`Group: ${g.label || g.id}`}
                  original={g.label}
                  value={getNested(T, ['variantGroups', g.id, 'label']) ?? ''}
                  onChange={(v) => setNested(['variantGroups', g.id, 'label'], v)} />
              ))}
            </section>
          )}

          {fields.variants.length > 0 && (
            <section className="tr-section">
              <h3>Variants</h3>
              {fields.variants.map((v) => (
                <div key={v.id} className="tr-variant">
                  <FieldRow label={`Variant: ${v.label || v.id}`}
                    original={v.label}
                    value={getNested(T, ['variants', v.id, 'label']) ?? ''}
                    onChange={(val) => setNested(['variants', v.id, 'label'], val)} />

                  {v.swatchImageUrl !== undefined && (
                    <AssetRow label="Variant swatch image" kind="image" accept="image/*" uid={user.uid}
                      original={v.swatchImageUrl}
                      value={getNested(T, ['variants', v.id, 'swatchImageUrl']) ?? ''}
                      storagePath={getNested(T, ['variants', v.id, 'swatchStoragePath']) ?? ''}
                      onChange={(url, path) => {
                        setNested(['variants', v.id, 'swatchImageUrl'], url)
                        setNested(['variants', v.id, 'swatchStoragePath'], path || '')
                      }}
                      onClear={() => {
                        setNested(['variants', v.id, 'swatchImageUrl'], '')
                        setNested(['variants', v.id, 'swatchStoragePath'], '')
                      }} />
                  )}

                  {v.glbLayers.length > 0 && (
                    <div className="tr-subgroup">
                      <h4>GLB layers</h4>
                      {v.glbLayers.map((l) => (
                        <div key={l.id} className="tr-layer-block">
                          <FieldRow label={`Layer name: ${l.label || l.id}`}
                            original={l.label}
                            value={getNested(T, ['variants', v.id, 'glbLayers', l.id, 'label']) ?? ''}
                            onChange={(val) => setNested(['variants', v.id, 'glbLayers', l.id, 'label'], val)} />
                          <AssetRow label="GLB file (this language)" accept=".glb" uid={user.uid}
                            original={l.glbUrl}
                            value={getNested(T, ['variants', v.id, 'glbLayers', l.id, 'glbUrl']) ?? ''}
                            storagePath={getNested(T, ['variants', v.id, 'glbLayers', l.id, 'glbStoragePath']) ?? ''}
                            onChange={(url, path) => {
                              setNested(['variants', v.id, 'glbLayers', l.id, 'glbUrl'], url)
                              setNested(['variants', v.id, 'glbLayers', l.id, 'glbStoragePath'], path || '')
                            }}
                            onClear={() => {
                              setNested(['variants', v.id, 'glbLayers', l.id, 'glbUrl'], '')
                              setNested(['variants', v.id, 'glbLayers', l.id, 'glbStoragePath'], '')
                            }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {v.colorOptions.length > 0 && (
                    <div className="tr-subgroup">
                      <h4>Colors</h4>
                      {v.colorOptions.map((c) => (
                        <div key={c.id} className="tr-color-block">
                          <FieldRow label={`Color: ${c.label || c.id}`}
                            original={c.label}
                            value={getNested(T, ['variants', v.id, 'colorOptions', c.id, 'label']) ?? ''}
                            onChange={(val) => setNested(['variants', v.id, 'colorOptions', c.id, 'label'], val)} />
                          <AssetRow label="Swatch image" kind="image" accept="image/*" uid={user.uid}
                            original={c.swatchImageUrl}
                            value={getNested(T, ['variants', v.id, 'colorOptions', c.id, 'swatchImageUrl']) ?? ''}
                            storagePath={getNested(T, ['variants', v.id, 'colorOptions', c.id, 'swatchStoragePath']) ?? ''}
                            onChange={(url, path) => {
                              setNested(['variants', v.id, 'colorOptions', c.id, 'swatchImageUrl'], url)
                              setNested(['variants', v.id, 'colorOptions', c.id, 'swatchStoragePath'], path || '')
                            }}
                            onClear={() => {
                              setNested(['variants', v.id, 'colorOptions', c.id, 'swatchImageUrl'], '')
                              setNested(['variants', v.id, 'colorOptions', c.id, 'swatchStoragePath'], '')
                            }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {v.partOptions.length > 0 && (
                    <div className="tr-subgroup">
                      <h4>Part options</h4>
                      {v.partOptions.map((g) => (
                        <div key={g.id} className="tr-partgroup">
                          <FieldRow label={`Group: ${g.label || g.id}`}
                            original={g.label}
                            value={getNested(T, ['variants', v.id, 'partOptions', g.id, 'label']) ?? ''}
                            onChange={(val) => setNested(['variants', v.id, 'partOptions', g.id, 'label'], val)} />
                          {g.options.map((o) => (
                            <div key={o.id} className="tr-option-block">
                              <FieldRow label={`Option: ${o.label || o.id}`}
                                original={o.label}
                                value={getNested(T, ['variants', v.id, 'partOptions', g.id, 'options', o.id, 'label']) ?? ''}
                                onChange={(val) => setNested(['variants', v.id, 'partOptions', g.id, 'options', o.id, 'label'], val)} />
                              <AssetRow label="Option swatch image" kind="image" accept="image/*" uid={user.uid}
                                original={o.swatchImageUrl}
                                value={getNested(T, ['variants', v.id, 'partOptions', g.id, 'options', o.id, 'swatchImageUrl']) ?? ''}
                                storagePath={getNested(T, ['variants', v.id, 'partOptions', g.id, 'options', o.id, 'swatchStoragePath']) ?? ''}
                                onChange={(url, path) => {
                                  setNested(['variants', v.id, 'partOptions', g.id, 'options', o.id, 'swatchImageUrl'], url)
                                  setNested(['variants', v.id, 'partOptions', g.id, 'options', o.id, 'swatchStoragePath'], path || '')
                                }}
                                onClear={() => {
                                  setNested(['variants', v.id, 'partOptions', g.id, 'options', o.id, 'swatchImageUrl'], '')
                                  setNested(['variants', v.id, 'partOptions', g.id, 'options', o.id, 'swatchStoragePath'], '')
                                }} />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {fields.interiors.length > 0 && (
            <section className="tr-section">
              <h3>Interiors</h3>
              {fields.interiors.map((i) => (
                <div key={i.id} className="tr-color-block">
                  <FieldRow label={`Interior: ${i.label || i.id}`}
                    original={i.label}
                    value={getNested(T, ['interiors', i.id, 'label']) ?? ''}
                    onChange={(v) => setNested(['interiors', i.id, 'label'], v)} />
                  <AssetRow label="Panorama (this language)" kind="image" accept="image/*" uid={user.uid}
                    original={i.panoramaUrl}
                    value={getNested(T, ['interiors', i.id, 'panoramaUrl']) ?? ''}
                    storagePath={getNested(T, ['interiors', i.id, 'panoramaStoragePath']) ?? ''}
                    onChange={(url, path) => {
                      setNested(['interiors', i.id, 'panoramaUrl'], url)
                      setNested(['interiors', i.id, 'panoramaStoragePath'], path || '')
                    }}
                    onClear={() => {
                      setNested(['interiors', i.id, 'panoramaUrl'], '')
                      setNested(['interiors', i.id, 'panoramaStoragePath'], '')
                    }} />
                </div>
              ))}
            </section>
          )}

          {fields.hotspots.length > 0 && (
            <section className="tr-section">
              <h3>Hotspots</h3>
              {fields.hotspots.map((h) => (
                <div key={h.id} className="tr-variant">
                  <FieldRow label={`Hotspot label: ${h.label || h.id}`}
                    original={h.label}
                    value={getNested(T, ['hotspots', h.id, 'label']) ?? ''}
                    onChange={(v) => setNested(['hotspots', h.id, 'label'], v)} />
                  <FieldRow label="Hotspot description" multiline
                    original={h.description}
                    value={getNested(T, ['hotspots', h.id, 'description']) ?? ''}
                    onChange={(v) => setNested(['hotspots', h.id, 'description'], v)} />
                </div>
              ))}
            </section>
          )}

          {fields.orderForm && (
            <section className="tr-section">
              <h3>Order form</h3>
              <FieldRow label="Submit button"
                original={fields.orderForm.submitLabel}
                value={getNested(T, ['orderForm', 'submitLabel']) ?? ''}
                onChange={(v) => setNested(['orderForm', 'submitLabel'], v)} />
              <FieldRow label="Success message" multiline
                original={fields.orderForm.successMessage}
                value={getNested(T, ['orderForm', 'successMessage']) ?? ''}
                onChange={(v) => setNested(['orderForm', 'successMessage'], v)} />
              {fields.orderForm.fields.length > 0 && (
                <div className="tr-subgroup">
                  <h4>Fields</h4>
                  {fields.orderForm.fields.map((f) => (
                    <FieldRow key={f.id} label={`Field: ${f.label || f.id}`}
                      original={f.label}
                      value={getNested(T, ['orderForm', 'fields', f.id, 'label']) ?? ''}
                      onChange={(v) => setNested(['orderForm', 'fields', f.id, 'label'], v)} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

function stripEmpty(obj) {
  if (obj == null) return null
  if (typeof obj === 'string') return obj.trim() ? obj : null
  if (typeof obj !== 'object') return obj
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const stripped = stripEmpty(v)
    if (stripped == null) continue
    if (typeof stripped === 'object' && Object.keys(stripped).length === 0) continue
    out[k] = stripped
  }
  return out
}
