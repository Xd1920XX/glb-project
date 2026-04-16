import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { getConfigurator, saveConfigurator, publishConfigurator, getPublishedCount } from '../firebase/db.js'
import { getEmbedLimit } from '../config/plans.js'
import { uploadFile, deleteFile } from '../firebase/storage.js'
import { ConfiguratorRenderer } from '../components/ConfiguratorRenderer.jsx'
import { ENV_PRESETS } from '../components/SaunaViewer3D.jsx'

const DEFAULT_BG = { type: 'none', color: '#ffffff', imageUrl: null, imagePath: null }

const DEFAULT_VIEWER_SETTINGS = {
  spinnerSensitivity:    18,
  spinnerAutoRotate:     false,
  spinnerAutoRotateSpeed: 3,
  glbAutoRotate:         false,
  glbAutoRotateSpeed:    1,
  glbEnvironment:        'city',
  glbAllowZoom:          true,
  glbFov:                42,
}

const DEFAULT_ORDER_FORM = {
  enabled: false,
  submitLabel: 'Submit order',
  successMessage: 'Thank you! We will be in touch.',
  fields: [
    { id: 'of1', label: 'Name',    type: 'text',     required: true,  enabled: true },
    { id: 'of2', label: 'Email',   type: 'email',    required: true,  enabled: true },
    { id: 'of3', label: 'Phone',   type: 'tel',      required: false, enabled: true },
    { id: 'of4', label: 'Message', type: 'textarea', required: false, enabled: true },
  ],
}

function uid() { return Math.random().toString(36).slice(2) }

// ── Upload button ──────────────────────────────────────────────────

function UploadBtn({ label, accept, multiple, onFiles, uploading }) {
  const ref = useRef()
  return (
    <>
      <input ref={ref} type="file" accept={accept} multiple={multiple}
        style={{ display: 'none' }}
        onChange={(e) => { onFiles([...e.target.files]); ref.current.value = '' }} />
      <button className="btn-upload" disabled={uploading} onClick={() => ref.current.click()}>
        {label}
      </button>
    </>
  )
}

function UploadProgress({ progress, label }) {
  return (
    <div className="upload-progress">
      <div className="upload-progress-bar"><div style={{ width: `${progress}%` }} /></div>
      <span className="upload-progress-label">{label}</span>
    </div>
  )
}

// ── Variant editor ─────────────────────────────────────────────────

function VariantEditor({ variant, uid: userUid, onChange, onDelete }) {
  const [uploading, setUploading]     = useState(false)
  const [progress, setProgress]       = useState(0)
  const [uploadLabel, setUploadLabel] = useState('')
  const [uploadError, setUploadError] = useState('')

  const swatchType = variant.swatchType ?? 'color'

  function errMsg(err) {
    return err.code === 'storage/unauthorized'
      ? 'Upload failed: Storage rules not deployed. See Firebase Console → Storage → Rules.'
      : `Upload failed: ${err.code ?? err.message}`
  }

  async function handleFrameUpload(files) {
    setUploading(true); setUploadError(''); setProgress(0)
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    const frames = []
    try {
      for (let i = 0; i < sorted.length; i++) {
        setUploadLabel(`Uploading ${i + 1} of ${sorted.length}…`)
        setProgress(Math.round(i / sorted.length * 100))
        frames.push(await uploadFile(userUid, sorted[i], null))
      }
      setProgress(100)
      onChange({ ...variant, frames, frameCount: frames.length })
    } catch (err) { setUploadError(errMsg(err)) }
    finally { setUploading(false); setUploadLabel(''); setProgress(0) }
  }

  async function handleGlbUpload(files) {
    setUploading(true); setUploadError(''); setProgress(0)
    try {
      const result = await uploadFile(userUid, files[0], (p) => { setProgress(p); setUploadLabel(`Uploading… ${p}%`) })
      onChange({ ...variant, glbUrl: result.url, glbStoragePath: result.storagePath })
    } catch (err) { setUploadError(errMsg(err)) }
    finally { setUploading(false); setUploadLabel(''); setProgress(0) }
  }

  async function handleSwatchImageUpload(files) {
    setUploading(true); setUploadError(''); setProgress(0)
    try {
      const result = await uploadFile(userUid, files[0], (p) => { setProgress(p); setUploadLabel(`Uploading… ${p}%`) })
      onChange({ ...variant, swatchImageUrl: result.url, swatchImagePath: result.storagePath })
    } catch (err) { setUploadError(errMsg(err)) }
    finally { setUploading(false); setUploadLabel(''); setProgress(0) }
  }

  async function handleDeleteFrames() {
    if (!confirm('Remove all frames?')) return
    for (const f of variant.frames ?? []) if (f.storagePath) await deleteFile(f.storagePath)
    onChange({ ...variant, frames: [], frameCount: 0 })
  }

  return (
    <div className="variant-block">
      {/* Header row: swatch + name + price + delete */}
      <div className="variant-block-header">
        <div className="variant-swatch-area">
          {swatchType === 'color'
            ? <input type="color" className="color-picker" value={variant.swatch ?? '#888888'}
                onChange={(e) => onChange({ ...variant, swatch: e.target.value })} />
            : variant.swatchImageUrl
              ? <img src={variant.swatchImageUrl} className="swatch-image-preview" alt="" />
              : <div className="swatch-image-placeholder">img</div>
          }
        </div>
        <input className="field-input inline" placeholder="Variant name"
          value={variant.label}
          onChange={(e) => onChange({ ...variant, label: e.target.value })} />
        <div className="variant-price-wrap">
          <span className="variant-price-symbol">€</span>
          <input className="field-input variant-price-input" type="number" min="0" step="0.01"
            placeholder="0"
            value={variant.price ?? ''}
            onChange={(e) => onChange({ ...variant, price: e.target.value === '' ? null : parseFloat(e.target.value) })} />
        </div>
        <button className="btn-icon-delete" onClick={onDelete}>✕</button>
      </div>

      {/* Swatch type toggle */}
      <div className="swatch-type-row">
        <span className="swatch-type-label">Swatch:</span>
        <div className="swatch-type-btns">
          <button className={`swatch-type-btn${swatchType === 'color' ? ' active' : ''}`}
            onClick={() => onChange({ ...variant, swatchType: 'color' })}>Color</button>
          <button className={`swatch-type-btn${swatchType === 'image' ? ' active' : ''}`}
            onClick={() => onChange({ ...variant, swatchType: 'image' })}>Image</button>
        </div>
        {swatchType === 'image' && (
          variant.swatchImageUrl
            ? <button className="btn-text-danger" onClick={async () => {
                if (variant.swatchImagePath) await deleteFile(variant.swatchImagePath)
                onChange({ ...variant, swatchImageUrl: null, swatchImagePath: null })
              }}>Remove</button>
            : <UploadBtn label="Upload" accept="image/*" onFiles={handleSwatchImageUpload} uploading={uploading} />
        )}
      </div>

      {/* Model type */}
      <div className="variant-type-row">
        <label className="radio-label">
          <input type="radio" checked={variant.type === 'spinner'}
            onChange={() => onChange({ ...variant, type: 'spinner' })} /> Rotation images
        </label>
        <label className="radio-label">
          <input type="radio" checked={variant.type === 'glb'}
            onChange={() => onChange({ ...variant, type: 'glb' })} /> 3D model (GLB)
        </label>
      </div>

      {/* Spinner upload */}
      {variant.type === 'spinner' && (
        <div className="upload-section">
          {(variant.frames?.length ?? 0) > 0 && !uploading ? (
            <div className="upload-done">✓ {variant.frames.length} frames
              <button className="btn-text-danger" onClick={handleDeleteFrames}>Remove</button>
            </div>
          ) : (
            <UploadBtn label={uploading ? uploadLabel || 'Uploading…' : 'Upload rotation frames (JPG/PNG)'}
              accept="image/*" multiple onFiles={handleFrameUpload} uploading={uploading} />
          )}
          {uploading && <UploadProgress progress={progress} label={uploadLabel} />}
          {uploadError && <div className="upload-error">{uploadError}</div>}
        </div>
      )}

      {/* GLB upload */}
      {variant.type === 'glb' && (
        <div className="upload-section">
          {variant.glbUrl && !uploading ? (
            <div className="upload-done">✓ GLB uploaded
              <button className="btn-text-danger" onClick={async () => {
                await deleteFile(variant.glbStoragePath)
                onChange({ ...variant, glbUrl: null, glbStoragePath: null })
              }}>Remove</button>
            </div>
          ) : (
            <UploadBtn label={uploading ? uploadLabel || 'Uploading…' : 'Upload GLB file'}
              accept=".glb" onFiles={handleGlbUpload} uploading={uploading} />
          )}
          {uploading && <UploadProgress progress={progress} label={uploadLabel} />}
          {uploadError && <div className="upload-error">{uploadError}</div>}
        </div>
      )}
    </div>
  )
}

// ── Interior editor ────────────────────────────────────────────────

function InteriorEditor({ interior, uid: userUid, onChange, onDelete }) {
  const [uploading, setUploading]     = useState(false)
  const [progress, setProgress]       = useState(0)
  const [uploadLabel, setUploadLabel] = useState('')
  const [uploadError, setUploadError] = useState('')

  async function handleUpload(files) {
    setUploading(true); setUploadError(''); setProgress(0)
    try {
      const result = await uploadFile(userUid, files[0], (p) => { setProgress(p); setUploadLabel(`Uploading… ${p}%`) })
      onChange({ ...interior, panoramaUrl: result.url, panoramaStoragePath: result.storagePath })
    } catch (err) {
      setUploadError(err.code === 'storage/unauthorized'
        ? 'Upload failed: Storage rules not deployed. See Firebase Console → Storage → Rules.'
        : `Upload failed: ${err.code ?? err.message}`)
    } finally { setUploading(false); setUploadLabel(''); setProgress(0) }
  }

  return (
    <div className="variant-block">
      <div className="variant-block-header">
        <input className="field-input inline" placeholder="Option name (e.g. Harvia)"
          value={interior.label}
          onChange={(e) => onChange({ ...interior, label: e.target.value })} />
        <button className="btn-icon-delete" onClick={onDelete}>✕</button>
      </div>
      <div className="upload-section">
        {interior.panoramaUrl && !uploading ? (
          <div className="upload-done">✓ Panorama uploaded
            <button className="btn-text-danger" onClick={async () => {
              await deleteFile(interior.panoramaStoragePath)
              onChange({ ...interior, panoramaUrl: null, panoramaStoragePath: null })
            }}>Remove</button>
          </div>
        ) : (
          <UploadBtn label={uploading ? uploadLabel || 'Uploading…' : 'Upload 360° panorama image'}
            accept="image/*" onFiles={handleUpload} uploading={uploading} />
        )}
        {uploading && <UploadProgress progress={progress} label={uploadLabel} />}
        {uploadError && <div className="upload-error">{uploadError}</div>}
      </div>
    </div>
  )
}

// ── Background editor ──────────────────────────────────────────────

function BackgroundEditor({ bg, uid: userUid, onChange }) {
  const [uploading, setUploading]     = useState(false)
  const [progress, setProgress]       = useState(0)
  const [uploadLabel, setUploadLabel] = useState('')
  const [uploadError, setUploadError] = useState('')

  async function handleImageUpload(files) {
    setUploading(true); setUploadError(''); setProgress(0)
    try {
      const result = await uploadFile(userUid, files[0], (p) => { setProgress(p); setUploadLabel(`Uploading… ${p}%`) })
      onChange({ ...bg, imageUrl: result.url, imagePath: result.storagePath })
    } catch (err) {
      setUploadError(err.code === 'storage/unauthorized'
        ? 'Upload failed: Storage rules not deployed.'
        : `Upload failed: ${err.code ?? err.message}`)
    } finally { setUploading(false); setUploadLabel(''); setProgress(0) }
  }

  return (
    <div className="bg-editor">
      <div className="bg-type-row">
        {[
          { val: 'none',  label: 'None' },
          { val: 'color', label: 'Color' },
          { val: 'image', label: 'Image' },
        ].map(({ val, label }) => (
          <button key={val}
            className={`bg-type-btn${bg.type === val ? ' active' : ''}`}
            onClick={() => onChange({ ...bg, type: val })}>
            {label}
          </button>
        ))}
      </div>

      {bg.type === 'color' && (
        <div className="bg-color-row">
          <input type="color" className="color-picker" value={bg.color ?? '#ffffff'}
            onChange={(e) => onChange({ ...bg, color: e.target.value })} />
          <span className="bg-color-hex">{bg.color ?? '#ffffff'}</span>
        </div>
      )}

      {bg.type === 'image' && (
        <div className="upload-section">
          {bg.imageUrl && !uploading ? (
            <div className="bg-image-preview-row">
              <img src={bg.imageUrl} className="bg-image-thumb" alt="" />
              <button className="btn-text-danger" onClick={async () => {
                if (bg.imagePath) await deleteFile(bg.imagePath)
                onChange({ ...bg, imageUrl: null, imagePath: null })
              }}>Remove</button>
            </div>
          ) : (
            <UploadBtn label={uploading ? uploadLabel || 'Uploading…' : 'Upload background image'}
              accept="image/*" onFiles={handleImageUpload} uploading={uploading} />
          )}
          {uploading && <UploadProgress progress={progress} label={uploadLabel} />}
          {uploadError && <div className="upload-error">{uploadError}</div>}
        </div>
      )}
    </div>
  )
}

// ── Embed section ──────────────────────────────────────────────────

function EmbedSection({ id, origin }) {
  const [mode, setMode] = useState('iframe')

  const iframeCode = `<iframe\n  src="${origin}/embed/${id}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  allowfullscreen\n></iframe>`

  const widgetCode = `<!-- Place where you want the configurator -->\n<div\n  data-configurator="${id}"\n  data-height="600px"\n></div>\n\n<!-- Add once per page, before </body> -->\n<script src="${origin}/widget.js" async></script>`

  function copy(text) {
    navigator.clipboard.writeText(text)
  }

  return (
    <section className="builder-section">
      <div className="builder-section-header"><h3>Embed code</h3></div>

      <div className="embed-mode-tabs">
        <button className={`embed-mode-tab${mode === 'iframe' ? ' active' : ''}`}
          onClick={() => setMode('iframe')}>iFrame</button>
        <button className={`embed-mode-tab${mode === 'widget' ? ' active' : ''}`}
          onClick={() => setMode('widget')}>JS Widget</button>
      </div>

      <div className="embed-code-box">
        <code>{mode === 'iframe' ? iframeCode : widgetCode}</code>
        <button className="btn-ghost btn-sm"
          onClick={() => copy(mode === 'iframe' ? iframeCode : widgetCode)}>
          Copy
        </button>
      </div>

      {mode === 'widget' && (
        <p className="embed-widget-note">
          The widget script auto-resizes and avoids iframe cross-origin restrictions.
          Add <code>data-width</code> and <code>data-height</code> attributes to control size,
          and <code>data-radius</code> for rounded corners.
        </p>
      )}
    </section>
  )
}

// ── Viewer settings editor ─────────────────────────────────────────

function ViewerSettingsEditor({ settings, onChange }) {
  const s = settings
  function set(key, val) { onChange({ ...s, [key]: val }) }

  return (
    <div className="vs-editor">
      {/* ── Rotation images ── */}
      <p className="vs-group-label">Rotation images</p>

      <div className="vs-row">
        <label className="vs-label">Drag sensitivity</label>
        <div className="vs-slider-wrap">
          <input type="range" min="5" max="60" step="1"
            value={s.spinnerSensitivity ?? 18}
            onChange={(e) => set('spinnerSensitivity', Number(e.target.value))} />
          <span className="vs-value">{s.spinnerSensitivity ?? 18}</span>
        </div>
      </div>

      <div className="vs-row">
        <label className="vs-label">Auto-rotate</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.spinnerAutoRotate ?? false}
            onChange={(e) => set('spinnerAutoRotate', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      {s.spinnerAutoRotate && (
        <div className="vs-row">
          <label className="vs-label">Speed (fps)</label>
          <div className="vs-slider-wrap">
            <input type="range" min="0.5" max="15" step="0.5"
              value={s.spinnerAutoRotateSpeed ?? 3}
              onChange={(e) => set('spinnerAutoRotateSpeed', Number(e.target.value))} />
            <span className="vs-value">{s.spinnerAutoRotateSpeed ?? 3}</span>
          </div>
        </div>
      )}

      {/* ── 3D model ── */}
      <p className="vs-group-label" style={{ marginTop: 16 }}>3D model</p>

      <div className="vs-row">
        <label className="vs-label">Auto-rotate</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbAutoRotate ?? false}
            onChange={(e) => set('glbAutoRotate', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      {s.glbAutoRotate && (
        <div className="vs-row">
          <label className="vs-label">Rotate speed</label>
          <div className="vs-slider-wrap">
            <input type="range" min="0.2" max="5" step="0.2"
              value={s.glbAutoRotateSpeed ?? 1}
              onChange={(e) => set('glbAutoRotateSpeed', Number(e.target.value))} />
            <span className="vs-value">{s.glbAutoRotateSpeed ?? 1}</span>
          </div>
        </div>
      )}

      <div className="vs-row">
        <label className="vs-label">Allow zoom</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbAllowZoom ?? true}
            onChange={(e) => set('glbAllowZoom', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      <div className="vs-row">
        <label className="vs-label">Camera FOV</label>
        <div className="vs-slider-wrap">
          <input type="range" min="20" max="90" step="1"
            value={s.glbFov ?? 42}
            onChange={(e) => set('glbFov', Number(e.target.value))} />
          <span className="vs-value">{s.glbFov ?? 42}°</span>
        </div>
      </div>

      <div className="vs-row">
        <label className="vs-label">Lighting</label>
        <select className="vs-select"
          value={s.glbEnvironment ?? 'city'}
          onChange={(e) => set('glbEnvironment', e.target.value)}>
          {ENV_PRESETS.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ── Order form editor ──────────────────────────────────────────────

function OrderFormEditor({ orderForm, onChange }) {
  const fields = orderForm.fields ?? []

  function setField(id, updated) {
    onChange({ ...orderForm, fields: fields.map((f) => f.id === id ? updated : f) })
  }

  return (
    <div className="order-form-editor">
      <div className="vs-row">
        <label className="vs-label">Submit button label</label>
        <input className="field-input inline" value={orderForm.submitLabel ?? ''}
          placeholder="Submit order"
          onChange={(e) => onChange({ ...orderForm, submitLabel: e.target.value })} />
      </div>
      <div className="vs-row">
        <label className="vs-label">Success message</label>
        <input className="field-input inline" value={orderForm.successMessage ?? ''}
          placeholder="Thank you! We will be in touch."
          onChange={(e) => onChange({ ...orderForm, successMessage: e.target.value })} />
      </div>

      <div className="order-fields-header">
        <span className="vs-group-label">Form fields</span>
        <button className="btn-add" onClick={() =>
          onChange({ ...orderForm, fields: [...fields, { id: uid(), label: 'New field', type: 'text', required: false, enabled: true }] })
        }>+ Add</button>
      </div>

      {fields.map((field) => (
        <div key={field.id} className="order-field-row">
          <label className="vs-toggle" title="Show/hide field">
            <input type="checkbox" checked={field.enabled ?? true}
              onChange={(e) => setField(field.id, { ...field, enabled: e.target.checked })} />
            <span className="vs-toggle-track" />
          </label>
          <input className="field-input inline order-field-label-input" placeholder="Label" value={field.label}
            onChange={(e) => setField(field.id, { ...field, label: e.target.value })} />
          <select className="vs-select order-field-type-select" value={field.type}
            onChange={(e) => setField(field.id, { ...field, type: e.target.value })}>
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="tel">Phone</option>
            <option value="textarea">Textarea</option>
          </select>
          <label className="radio-label order-field-req" title="Required">
            <input type="checkbox" checked={field.required ?? false}
              onChange={(e) => setField(field.id, { ...field, required: e.target.checked })} />
            Req
          </label>
          <button className="btn-icon-delete" onClick={() =>
            onChange({ ...orderForm, fields: fields.filter((f) => f.id !== field.id) })
          }>✕</button>
        </div>
      ))}
    </div>
  )
}

// ── Main builder ───────────────────────────────────────────────────

export default function Builder() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [name, setName]                       = useState('')
  const [variants, setVariants]               = useState([])
  const [interiors, setInteriors]             = useState([])
  const [background, setBackground]           = useState(DEFAULT_BG)
  const [viewerSettings, setViewerSettings]   = useState(DEFAULT_VIEWER_SETTINGS)
  const [exteriorLabel, setExteriorLabel]     = useState('Exterior')
  const [interiorLabel, setInteriorLabel]     = useState('Interior')
  const [orderForm, setOrderForm]             = useState(DEFAULT_ORDER_FORM)
  const [published, setPublished]             = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [dirty, setDirty]         = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [loading, setLoading]     = useState(true)
  const autoSaveTimer             = useRef(null)
  const initialLoad               = useRef(true)

  useEffect(() => {
    getConfigurator(id).then((cfg) => {
      if (!cfg) { navigate('/dashboard'); return }
      setName(cfg.name ?? '')
      setVariants(cfg.variants ?? [])
      setInteriors(cfg.interiors ?? [])
      setBackground(cfg.background ?? DEFAULT_BG)
      setViewerSettings({ ...DEFAULT_VIEWER_SETTINGS, ...(cfg.viewerSettings ?? {}) })
      setExteriorLabel(cfg.exteriorLabel ?? 'Exterior')
      setInteriorLabel(cfg.interiorLabel ?? 'Interior')
      setOrderForm({ ...DEFAULT_ORDER_FORM, ...(cfg.orderForm ?? {}), fields: cfg.orderForm?.fields ?? DEFAULT_ORDER_FORM.fields })
      setPublished(cfg.published ?? false)
      setLoading(false)
    })
  }, [id])

  const doSave = useCallback(async (n, v, i, bg, vs, el, il, of_) => {
    setSaving(true); setSaveError(null)
    try {
      await saveConfigurator(id, { name: n, variants: v, interiors: i, background: bg, viewerSettings: vs, exteriorLabel: el, interiorLabel: il, orderForm: of_ })
      setSaved(true); setDirty(false)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setSaveError('Save failed — check connection')
      console.error('Save error:', err)
    } finally { setSaving(false) }
  }, [id])

  useEffect(() => {
    if (loading) return
    if (initialLoad.current) { initialLoad.current = false; return }
    setDirty(true)
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => doSave(name, variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm), 1500)
    return () => clearTimeout(autoSaveTimer.current)
  }, [name, variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm])

  async function handleSave() {
    clearTimeout(autoSaveTimer.current)
    await doSave(name, variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm)
  }

  async function handlePublish() {
    const subOk = ['trial', 'active'].includes(profile?.subscriptionStatus)
    if (!subOk) { navigate('/billing'); return }
    if (!published) {
      const limit = getEmbedLimit(profile)
      const count = await getPublishedCount(user.uid)
      if (count >= limit) { navigate('/billing'); return }
    }
    await saveConfigurator(id, { name, variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm })
    await publishConfigurator(id, !published)
    setPublished((v) => !v)
  }

  if (loading) return <div className="page-loading">Loading builder…</div>

  const config = { variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm }

  return (
    <div className="builder">
      <header className="builder-header">
        <Link to="/dashboard" className="btn-ghost btn-sm">← Back</Link>
        <input className="builder-name-input" value={name}
          onChange={(e) => setName(e.target.value)} placeholder="Configurator name" />
        <div className="builder-actions">
          {saveError && <span className="builder-save-error">{saveError}</span>}
          <button className="btn-ghost btn-sm" onClick={handleSave} disabled={saving}>
            {saved ? '✓' : saving ? '…' : dirty ? 'Save*' : 'Save'}
          </button>
          <button className={published ? 'btn-danger' : 'btn-primary'} onClick={handlePublish}>
            {published ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </header>

      <div className="builder-body">
        <aside className="builder-settings">

          {/* Exterior variants */}
          <section className="builder-section">
            <div className="builder-section-header">
              <div className="section-label-wrap">
                <input className="field-input section-tab-label" value={exteriorLabel}
                  title="Tab label shown in configurator"
                  onChange={(e) => setExteriorLabel(e.target.value)} />
              </div>
              <button className="btn-add" onClick={() =>
                setVariants((v) => [...v, { id: uid(), label: 'New Variant', swatch: '#888888', swatchType: 'color', price: null, type: 'spinner', frames: [], frameCount: 0 }])
              }>+ Add</button>
            </div>
            {variants.length === 0
              ? <p className="builder-hint">Add a variant with rotation images or a 3D model.</p>
              : variants.map((v) => (
                <VariantEditor key={v.id} variant={v} uid={user.uid}
                  onChange={(u) => setVariants((vs) => vs.map((x) => x.id === v.id ? u : x))}
                  onDelete={() => setVariants((vs) => vs.filter((x) => x.id !== v.id))} />
              ))
            }
          </section>

          {/* Interior views */}
          <section className="builder-section">
            <div className="builder-section-header">
              <div className="section-label-wrap">
                <input className="field-input section-tab-label" value={interiorLabel}
                  title="Tab label shown in configurator"
                  onChange={(e) => setInteriorLabel(e.target.value)} />
              </div>
              <button className="btn-add" onClick={() =>
                setInteriors((v) => [...v, { id: uid(), label: 'New Interior', panoramaUrl: null }])
              }>+ Add</button>
            </div>
            {interiors.length === 0
              ? <p className="builder-hint">Add 360° panorama images for interior views.</p>
              : interiors.map((interior) => (
                <InteriorEditor key={interior.id} interior={interior} uid={user.uid}
                  onChange={(u) => setInteriors((vs) => vs.map((x) => x.id === interior.id ? u : x))}
                  onDelete={() => setInteriors((vs) => vs.filter((x) => x.id !== interior.id))} />
              ))
            }
          </section>

          {/* Background */}
          <section className="builder-section">
            <div className="builder-section-header">
              <h3>Background</h3>
            </div>
            <BackgroundEditor bg={background} uid={user.uid} onChange={setBackground} />
          </section>

          {/* Viewer settings */}
          <section className="builder-section">
            <div className="builder-section-header">
              <h3>Viewer settings</h3>
            </div>
            <ViewerSettingsEditor settings={viewerSettings} onChange={setViewerSettings} />
          </section>

          {/* Order form */}
          <section className="builder-section">
            <div className="builder-section-header">
              <h3>Order form</h3>
              <label className="vs-toggle">
                <input type="checkbox" checked={orderForm.enabled}
                  onChange={(e) => setOrderForm({ ...orderForm, enabled: e.target.checked })} />
                <span className="vs-toggle-track" />
              </label>
            </div>
            {orderForm.enabled
              ? <OrderFormEditor orderForm={orderForm} onChange={setOrderForm} />
              : <p className="builder-hint">Enable to add a submission form tab to the configurator.</p>
            }
          </section>

          {/* Embed code */}
          {published && <EmbedSection id={id} origin={window.location.origin} />}
        </aside>

        <div className="builder-preview">
          {variants.length === 0 && interiors.length === 0
            ? <div className="preview-empty">Add variants or interiors to preview</div>
            : <ConfiguratorRenderer config={config} />
          }
        </div>
      </div>
    </div>
  )
}
