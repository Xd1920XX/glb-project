import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { getConfigurator, saveConfigurator, publishConfigurator, getPublishedCount } from '../firebase/db.js'
import { getEmbedLimit } from '../config/plans.js'
import { uploadFile, deleteFile } from '../firebase/storage.js'
import { ConfiguratorRenderer } from '../components/ConfiguratorRenderer.jsx'

const DEFAULT_BG = { type: 'none', color: '#ffffff', imageUrl: null, imagePath: null }

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

// ── Main builder ───────────────────────────────────────────────────

export default function Builder() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [name, setName]           = useState('')
  const [variants, setVariants]   = useState([])
  const [interiors, setInteriors] = useState([])
  const [background, setBackground] = useState(DEFAULT_BG)
  const [published, setPublished] = useState(false)
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
      setPublished(cfg.published ?? false)
      setLoading(false)
    })
  }, [id])

  const doSave = useCallback(async (n, v, i, bg) => {
    setSaving(true); setSaveError(null)
    try {
      await saveConfigurator(id, { name: n, variants: v, interiors: i, background: bg })
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
    autoSaveTimer.current = setTimeout(() => doSave(name, variants, interiors, background), 1500)
    return () => clearTimeout(autoSaveTimer.current)
  }, [name, variants, interiors, background])

  async function handleSave() {
    clearTimeout(autoSaveTimer.current)
    await doSave(name, variants, interiors, background)
  }

  async function handlePublish() {
    const subOk = ['trial', 'active'].includes(profile?.subscriptionStatus)
    if (!subOk) { navigate('/billing'); return }
    if (!published) {
      const limit = getEmbedLimit(profile)
      const count = await getPublishedCount(user.uid)
      if (count >= limit) { navigate('/billing'); return }
    }
    await saveConfigurator(id, { name, variants, interiors, background })
    await publishConfigurator(id, !published)
    setPublished((v) => !v)
  }

  if (loading) return <div className="page-loading">Loading builder…</div>

  const config = { variants, interiors, background }

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
              <h3>Exterior variants</h3>
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
              <h3>Interior views</h3>
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

          {/* Embed code */}
          {published && (
            <section className="builder-section">
              <div className="builder-section-header"><h3>Embed code</h3></div>
              <div className="embed-code-box">
                <code>{`<iframe src="${window.location.origin}/embed/${id}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`}</code>
                <button className="btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(
                  `<iframe src="${window.location.origin}/embed/${id}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`
                )}>Copy</button>
              </div>
            </section>
          )}
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
