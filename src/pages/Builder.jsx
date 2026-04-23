import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { getConfigurator, saveConfigurator, publishConfigurator, getPublishedCount } from '../firebase/db.js'
import { getEmbedLimit } from '../config/plans.js'
import { uploadFile, deleteFile } from '../firebase/storage.js'
import { ConfiguratorRenderer } from '../components/ConfiguratorRenderer.jsx'
import { ENV_PRESETS } from '../components/SaunaViewer3D.jsx'
import { extractGLBMaterials } from '../utils/glbMaterials.js'
import { MediaPickerModal } from '../components/MediaPickerModal.jsx'

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
  glbAmbientIntensity:   25,
  glbKeyIntensity:       40,
  glbFillIntensity:      20,
  glbEnvIntensity:       50,
  glbSurroundLighting:   false,
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

// Firestore rejects undefined values — strip them recursively before saving
function stripUndefined(val) {
  if (Array.isArray(val)) return val.map(stripUndefined)
  if (val !== null && typeof val === 'object') {
    return Object.fromEntries(
      Object.entries(val)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    )
  }
  return val
}

// ── Style themes ───────────────────────────────────────────────────

const THEMES = [
  { id: 'minimal', label: 'Minimal', bg: '#ffffff', accent: '#111111' },
  { id: 'slate',   label: 'Slate',   bg: '#edf0f6', accent: '#2a4080' },
  { id: 'warm',    label: 'Warm',    bg: '#faf5ee', accent: '#c05020' },
  { id: 'forest',  label: 'Forest',  bg: '#edf6ed', accent: '#2d7a2d' },
  { id: 'bold',    label: 'Bold',    bg: '#f4f0ff', accent: '#6820e0' },
]

const THEME_DEFAULTS = {
  minimal: { accent: '#111111', surface: '#ffffff', bg: '#f7f6f4', border: '#e8e6e3' },
  slate:   { accent: '#2a4080', surface: '#f8f9fb', bg: '#edf0f6', border: '#ccd5e6' },
  warm:    { accent: '#c05020', surface: '#fffdf9', bg: '#faf5ee', border: '#e8ddd0' },
  forest:  { accent: '#2d7a2d', surface: '#f5faf5', bg: '#edf6ed', border: '#c8dfc8' },
  bold:    { accent: '#6820e0', surface: '#ffffff',  bg: '#f4f0ff', border: '#ddd0ff' },
}

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

function VariantEditor({ variant, uid: userUid, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown }) {
  const [uploading, setUploading]     = useState(false)
  const [progress, setProgress]       = useState(0)
  const [uploadLabel, setUploadLabel] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [showSwatchPicker, setShowSwatchPicker] = useState(false)

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
              ? <img src={variant.swatchImageUrl} className="swatch-image-preview" alt=""
                  onClick={() => setShowSwatchPicker(true)} style={{ cursor: 'pointer' }} />
              : <div className="swatch-image-placeholder" style={{ cursor: 'pointer' }}
                  onClick={() => setShowSwatchPicker(true)}>img</div>
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
        <button className="btn-icon-move" title="Move up" onClick={onMoveUp} disabled={!onMoveUp}>↑</button>
        <button className="btn-icon-move" title="Move down" onClick={onMoveDown} disabled={!onMoveDown}>↓</button>
        <button className="btn-icon-dupe" title="Duplicate" onClick={onDuplicate}>⧉</button>
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
            ? <>
                <button className="btn-text-danger" onClick={() => setShowSwatchPicker(true)}>Change</button>
                <button className="btn-text-danger" onClick={async () => {
                  if (variant.swatchImagePath) await deleteFile(variant.swatchImagePath)
                  onChange({ ...variant, swatchImageUrl: null, swatchImagePath: null })
                }}>Remove</button>
              </>
            : <button className="btn-upload" style={{ flex: 'none', padding: '4px 10px', fontSize: 12 }}
                onClick={() => setShowSwatchPicker(true)}>Choose image</button>
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

      {/* Spinner upload — multiple sequential files, keep direct upload */}
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

      {/* GLB layers */}
      {variant.type === 'glb' && (
        <GlbLayersEditor
          layers={variant.glbLayers ?? []}
          uid={userUid}
          onChange={(layers) => onChange({ ...variant, glbLayers: layers })}
        />
      )}

      {/* Media pickers */}
      {showSwatchPicker && (
        <MediaPickerModal uid={userUid} accept="image/*"
          onSelect={({ url, storagePath }) => {
            setShowSwatchPicker(false)
            onChange({ ...variant, swatchImageUrl: url, swatchImagePath: storagePath })
          }}
          onClose={() => setShowSwatchPicker(false)} />
      )}
    </div>
  )
}

// ── GLB layers editor ──────────────────────────────────────────────

function GlbLayerEditor({ layer, uid: userUid, onChange, onDelete, onMoveUp, onMoveDown }) {
  const [showPicker, setShowPicker]     = useState(false)
  const [uploading, setUploading]       = useState(false)
  const [uploadLabel, setUploadLabel]   = useState('')

  async function handleSelect({ url, storagePath }) {
    setUploadLabel('Scanning materials…'); setUploading(true)
    let glbMaterials = []
    try { glbMaterials = await extractGLBMaterials(url) } catch { /* non-fatal */ }
    onChange({ ...layer, glbUrl: url, glbStoragePath: storagePath, glbMaterials, materialOverrides: {} })
    setUploading(false); setUploadLabel('')
  }

  return (
    <div className="glb-layer-block">
      <div className="glb-layer-header">
        <button
          className={`glb-layer-eye${layer.visible === false ? ' off' : ''}`}
          title={layer.visible === false ? 'Hidden' : 'Visible'}
          onClick={() => onChange({ ...layer, visible: layer.visible === false ? true : false })}
        >
          {layer.visible === false ? '○' : '●'}
        </button>
        <input
          className="field-input inline glb-layer-label"
          placeholder="Layer name"
          value={layer.label ?? ''}
          onChange={(e) => onChange({ ...layer, label: e.target.value })}
        />
        <button className="btn-icon-move" title="Move up"   onClick={onMoveUp}   disabled={!onMoveUp}>↑</button>
        <button className="btn-icon-move" title="Move down" onClick={onMoveDown} disabled={!onMoveDown}>↓</button>
        <button className="btn-icon-delete" onClick={onDelete}>✕</button>
      </div>

      <div className="upload-section" style={{ paddingLeft: 28 }}>
        {uploading
          ? <div className="upload-progress-label">{uploadLabel || 'Processing…'}</div>
          : layer.glbUrl
            ? <div className="upload-done">
                ✓ {layer.label || 'GLB'} loaded
                <button className="btn-text-danger" onClick={() => setShowPicker(true)}>Replace</button>
                <button className="btn-text-danger" onClick={async () => {
                  if (layer.glbStoragePath) await deleteFile(layer.glbStoragePath)
                  onChange({ ...layer, glbUrl: null, glbStoragePath: null, glbMaterials: [], materialOverrides: {} })
                }}>Remove</button>
              </div>
            : <button className="btn-upload" onClick={() => setShowPicker(true)}>
                Choose GLB from media library
              </button>
        }
      </div>

      {layer.glbUrl && (
        <MaterialsAccordion
          variant={{ glbUrl: layer.glbUrl, glbMaterials: layer.glbMaterials ?? [], materialOverrides: layer.materialOverrides ?? {} }}
          uid={userUid}
          onChange={(updated) => onChange({ ...layer, glbMaterials: updated.glbMaterials, materialOverrides: updated.materialOverrides })}
        />
      )}

      {showPicker && (
        <MediaPickerModal uid={userUid} accept=".glb"
          onSelect={(f) => { setShowPicker(false); handleSelect(f) }}
          onClose={() => setShowPicker(false)} />
      )}
    </div>
  )
}

function GlbLayersEditor({ layers, uid: userUid, onChange }) {
  function addLayer() {
    onChange([...layers, { id: uid(), label: `Layer ${layers.length + 1}`, visible: true, glbUrl: null, glbStoragePath: null, glbMaterials: [], materialOverrides: {} }])
  }

  function updateLayer(id, updated) {
    onChange(layers.map((l) => l.id === id ? updated : l))
  }

  function deleteLayer(id) {
    onChange(layers.filter((l) => l.id !== id))
  }

  function moveLayer(i, dir) {
    const next = [...layers]
    const j = i + dir
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="glb-layers-editor">
      <div className="glb-layers-header">
        <span className="glb-layers-label">GLB Layers ({layers.length})</span>
        <button className="btn-add" onClick={addLayer}>+ Add layer</button>
      </div>
      {layers.length === 0 && (
        <p className="builder-hint">Add one or more GLB files. They are rendered at the same origin — use this to layer parts (e.g. body + legs + cushion).</p>
      )}
      {layers.map((layer, i) => (
        <GlbLayerEditor
          key={layer.id}
          layer={layer}
          uid={userUid}
          onChange={(updated) => updateLayer(layer.id, updated)}
          onDelete={() => deleteLayer(layer.id)}
          onMoveUp={i > 0 ? () => moveLayer(i, -1) : null}
          onMoveDown={i < layers.length - 1 ? () => moveLayer(i, 1) : null}
        />
      ))}
    </div>
  )
}

// ── Material override accordion ────────────────────────────────────

function MaterialOverrideRow({ mat, override = {}, uid: userUid, onChange, onRename, onDelete }) {
  const [open, setOpen]               = useState(false)
  const [showTexturePicker, setShowTexturePicker] = useState(false)

  const type = override.type ?? 'none'

  const dot = type === 'color' && override.color
    ? <span className="mat-dot" style={{ background: override.color }} />
    : type === 'texture' && override.textureUrl
      ? <img src={override.textureUrl} className="mat-dot mat-dot-img" alt="" />
      : <span className="mat-dot mat-dot-empty" />

  return (
    <div className={`mat-row${open ? ' open' : ''}`}>
      <div className="mat-row-header-wrap">
        <button className="mat-row-header" onClick={() => setOpen((v) => !v)}>
          {dot}
          <span className="mat-row-name">{mat.name || <em style={{ opacity: 0.5 }}>unnamed</em>}</span>
          {type !== 'none' && <span className="mat-row-badge">{type}</span>}
          <span className="mat-row-chevron">{open ? '▲' : '▼'}</span>
        </button>
        <button className="btn-icon-delete mat-row-delete" onClick={onDelete}>✕</button>
      </div>

      {open && (
        <div className="mat-row-body">
          {/* Material name (must match exact name in GLB file) */}
          {onRename && (
            <div className="mat-name-row">
              <span className="mat-name-label">Layer name</span>
              <input
                className="field-input mat-name-input"
                placeholder="Exact material name in GLB"
                value={mat.name}
                onChange={(e) => onRename(e.target.value)} />
            </div>
          )}

          {/* Override type selector */}
          <div className="mat-type-tabs">
            {['none', 'color', 'texture'].map((t) => (
              <button key={t}
                className={`mat-type-tab${type === t ? ' active' : ''}`}
                onClick={() => onChange({ ...override, type: t })}>
                {t === 'none' ? 'Default' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {type === 'color' && (
            <div className="mat-color-row">
              <input type="color"
                className="color-picker"
                value={override.color ?? mat.baseColor}
                onChange={(e) => onChange({ ...override, type: 'color', color: e.target.value })} />
              <span className="mat-color-hex">{override.color ?? mat.baseColor}</span>
              <button className="btn-text-danger" onClick={() => onChange({ ...override, color: mat.baseColor })}>
                Reset
              </button>
            </div>
          )}

          {type === 'texture' && (
            <div className="mat-texture-row">
              {override.textureUrl ? (
                <div className="mat-texture-preview">
                  <img src={override.textureUrl} alt="" />
                  <button className="btn-text-danger" onClick={() => setShowTexturePicker(true)}>Change</button>
                  <button className="btn-text-danger" onClick={async () => {
                    if (override.texturePath) await deleteFile(override.texturePath)
                    onChange({ ...override, textureUrl: null, texturePath: null })
                  }}>Remove</button>
                </div>
              ) : (
                <button className="btn-upload" onClick={() => setShowTexturePicker(true)}>
                  Choose texture image
                </button>
              )}
            </div>
          )}
          {showTexturePicker && (
            <MediaPickerModal uid={userUid} accept="image/*"
              onSelect={({ url, storagePath }) => {
                setShowTexturePicker(false)
                onChange({ ...override, type: 'texture', textureUrl: url, texturePath: storagePath })
              }}
              onClose={() => setShowTexturePicker(false)} />
          )}
        </div>
      )}
    </div>
  )
}

function MaterialsAccordion({ variant, uid: userUid, onChange }) {
  const materials = variant.glbMaterials ?? []
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')

  function setOverride(matId, ov) {
    onChange({ ...variant, materialOverrides: { ...(variant.materialOverrides ?? {}), [matId]: ov } })
  }

  function addMat() {
    const newId = uid()
    onChange({ ...variant, glbMaterials: [...materials, { id: newId, name: '', baseColor: '#888888', hasMap: false }] })
  }

  function deleteMat(matId) {
    const newMats = materials.filter((m) => m.id !== matId)
    const { [matId]: _removed, ...rest } = variant.materialOverrides ?? {}
    onChange({ ...variant, glbMaterials: newMats, materialOverrides: rest })
  }

  function renameMat(oldId, newName) {
    const newMats = materials.map((m) => m.id === oldId ? { ...m, id: newName, name: newName } : m)
    const overrides = variant.materialOverrides ?? {}
    const newOverrides = Object.fromEntries(
      Object.entries(overrides).map(([k, v]) => [k === oldId ? newName : k, v])
    )
    onChange({ ...variant, glbMaterials: newMats, materialOverrides: newOverrides })
  }

  async function handleScan() {
    if (!variant.glbUrl) return
    setScanning(true); setScanError('')
    try {
      const found = await extractGLBMaterials(variant.glbUrl)
      // Merge: keep existing overrides, add newly discovered materials
      const existingIds = new Set(materials.map((m) => m.id))
      const merged = [
        ...materials,
        ...found.filter((m) => !existingIds.has(m.id)),
      ]
      onChange({ ...variant, glbMaterials: merged })
    } catch {
      setScanError('Could not read materials from GLB.')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="mat-accordion">
      <div className="mat-accordion-header">
        <span className="mat-accordion-label">Material layers ({materials.length})</span>
        <div className="mat-accordion-actions">
          <button className="btn-add" disabled={scanning} onClick={handleScan}>
            {scanning ? 'Scanning…' : 'Scan GLB'}
          </button>
          <button className="btn-add" onClick={addMat}>+ Add</button>
        </div>
      </div>
      {scanError && <p className="mat-scan-error">{scanError}</p>}
      {materials.map((mat) => (
        <MaterialOverrideRow
          key={mat.id}
          mat={mat}
          override={(variant.materialOverrides ?? {})[mat.id]}
          uid={userUid}
          onChange={(ov) => setOverride(mat.id, ov)}
          onRename={(newName) => renameMat(mat.id, newName)}
          onDelete={() => deleteMat(mat.id)}
        />
      ))}
      {materials.length === 0 && !scanning && (
        <p className="mat-empty-hint">Click "Scan GLB" to detect materials, or add manually.</p>
      )}
    </div>
  )
}

// ── Interior editor ────────────────────────────────────────────────

function InteriorEditor({ interior, uid: userUid, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown }) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="variant-block">
      <div className="variant-block-header">
        <input className="field-input inline" placeholder="Option name (e.g. Harvia)"
          value={interior.label}
          onChange={(e) => onChange({ ...interior, label: e.target.value })} />
        <button className="btn-icon-move" title="Move up" onClick={onMoveUp} disabled={!onMoveUp}>↑</button>
        <button className="btn-icon-move" title="Move down" onClick={onMoveDown} disabled={!onMoveDown}>↓</button>
        <button className="btn-icon-dupe" title="Duplicate" onClick={onDuplicate}>⧉</button>
        <button className="btn-icon-delete" onClick={onDelete}>✕</button>
      </div>
      <div className="upload-section">
        {interior.panoramaUrl ? (
          <div className="upload-done">✓ Panorama uploaded
            <button className="btn-text-danger" onClick={() => setShowPicker(true)}>Replace</button>
            <button className="btn-text-danger" onClick={async () => {
              await deleteFile(interior.panoramaStoragePath)
              onChange({ ...interior, panoramaUrl: null, panoramaStoragePath: null })
            }}>Remove</button>
          </div>
        ) : (
          <button className="btn-upload" onClick={() => setShowPicker(true)}>
            Choose 360° panorama image
          </button>
        )}
      </div>
      {showPicker && (
        <MediaPickerModal uid={userUid} accept="image/*"
          onSelect={({ url, storagePath }) => {
            setShowPicker(false)
            onChange({ ...interior, panoramaUrl: url, panoramaStoragePath: storagePath })
          }}
          onClose={() => setShowPicker(false)} />
      )}
    </div>
  )
}

// ── Background editor ──────────────────────────────────────────────

function BackgroundEditor({ bg, uid: userUid, onChange }) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="bg-editor">
      <div className="bg-type-row">
        {[{ val: 'none', label: 'None' }, { val: 'color', label: 'Color' }, { val: 'image', label: 'Image' }]
          .map(({ val, label }) => (
            <button key={val} className={`bg-type-btn${bg.type === val ? ' active' : ''}`}
              onClick={() => onChange({ ...bg, type: val })}>{label}</button>
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
          {bg.imageUrl ? (
            <div className="bg-image-preview-row">
              <img src={bg.imageUrl} className="bg-image-thumb" alt="" />
              <button className="btn-text-danger" onClick={() => setShowPicker(true)}>Change</button>
              <button className="btn-text-danger" onClick={async () => {
                if (bg.imagePath) await deleteFile(bg.imagePath)
                onChange({ ...bg, imageUrl: null, imagePath: null })
              }}>Remove</button>
            </div>
          ) : (
            <button className="btn-upload" onClick={() => setShowPicker(true)}>
              Choose background image
            </button>
          )}
        </div>
      )}

      {showPicker && (
        <MediaPickerModal uid={userUid} accept="image/*"
          onSelect={({ url, storagePath }) => {
            setShowPicker(false)
            onChange({ ...bg, imageUrl: url, imagePath: storagePath })
          }}
          onClose={() => setShowPicker(false)} />
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
        <label className="vs-label">Environment</label>
        <select className="vs-select"
          value={s.glbEnvironment ?? 'city'}
          onChange={(e) => set('glbEnvironment', e.target.value)}>
          {ENV_PRESETS.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="vs-row" style={{ marginTop: 12 }}>
        <label className="vs-label">Surround lighting</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbSurroundLighting ?? false}
            onChange={(e) => set('glbSurroundLighting', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>
      <p className="builder-hint" style={{ fontSize: 11, marginBottom: 8 }}>
        Places lights at all 4 corners — eliminates shadows.
      </p>

      <p className="vs-group-label" style={{ marginTop: 8 }}>Light strength</p>

      <div className="vs-row">
        <label className="vs-label">Ambient</label>
        <div className="vs-slider-wrap">
          <input type="range" min="0" max="100" step="1"
            value={s.glbAmbientIntensity ?? 25}
            onChange={(e) => set('glbAmbientIntensity', Number(e.target.value))} />
          <span className="vs-value">{s.glbAmbientIntensity ?? 25}</span>
        </div>
      </div>

      <div className="vs-row">
        <label className="vs-label">Key light</label>
        <div className="vs-slider-wrap">
          <input type="range" min="0" max="100" step="1"
            value={s.glbKeyIntensity ?? 40}
            onChange={(e) => set('glbKeyIntensity', Number(e.target.value))} />
          <span className="vs-value">{s.glbKeyIntensity ?? 40}</span>
        </div>
      </div>

      <div className="vs-row">
        <label className="vs-label">Fill light</label>
        <div className="vs-slider-wrap">
          <input type="range" min="0" max="100" step="1"
            value={s.glbFillIntensity ?? 20}
            onChange={(e) => set('glbFillIntensity', Number(e.target.value))} />
          <span className="vs-value">{s.glbFillIntensity ?? 20}</span>
        </div>
      </div>

      <div className="vs-row">
        <label className="vs-label">Env light</label>
        <div className="vs-slider-wrap">
          <input type="range" min="0" max="100" step="1"
            value={s.glbEnvIntensity ?? 50}
            onChange={(e) => set('glbEnvIntensity', Number(e.target.value))} />
          <span className="vs-value">{s.glbEnvIntensity ?? 50}</span>
        </div>
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
        <label className="vs-label">Notification email</label>
        <input className="field-input inline" type="email"
          value={orderForm.notificationEmail ?? ''}
          placeholder="you@example.com"
          onChange={(e) => onChange({ ...orderForm, notificationEmail: e.target.value })} />
      </div>
      <p className="builder-hint" style={{ fontSize: 11, marginTop: -6, marginBottom: 8 }}>
        Receive an email when someone submits this form. Requires email function deployed.
      </p>
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

// ── Sidebar accordion ──────────────────────────────────────────────

function BuilderAccordion({ title, onTitleChange, badge, right, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bacc">
      <div className="bacc-header">
        <button className="bacc-toggle" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Collapse' : 'Expand'}>
          <span className={`bacc-chevron${open ? ' open' : ''}`} />
        </button>
        {onTitleChange
          ? <input className="bacc-title-input" value={title} onChange={(e) => onTitleChange(e.target.value)} />
          : <span className="bacc-title">{title}</span>
        }
        {badge > 0 && <span className="bacc-badge">{badge}</span>}
        {right && <div className="bacc-right">{right}</div>}
      </div>
      {open && <div className="bacc-body">{children}</div>}
    </div>
  )
}

// ── Style editor ───────────────────────────────────────────────────

const COLOR_FIELDS = [
  { key: 'accent',  label: 'Accent'  },
  { key: 'surface', label: 'Panel'   },
  { key: 'bg',      label: 'Secondary' },
  { key: 'border',  label: 'Border'  },
]

function StyleEditor({ theme, darkMode, themeColors, onChange, onColorsChange }) {
  const defaults = THEME_DEFAULTS[theme] ?? THEME_DEFAULTS.minimal

  function setColor(key, value) {
    onColorsChange({ ...themeColors, [key]: value })
  }

  function resetColor(key) {
    const { [key]: _removed, ...rest } = themeColors
    onColorsChange(rest)
  }

  const hasOverrides = Object.keys(themeColors).length > 0

  return (
    <div className="style-editor">
      <div className="vs-row">
        <label className="vs-label">Dark mode</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={darkMode}
            onChange={(e) => onChange({ theme, darkMode: e.target.checked })} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      <p className="vs-group-label" style={{ marginTop: 12 }}>Theme</p>
      <div className="theme-grid">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`theme-card${theme === t.id ? ' selected' : ''}`}
            onClick={() => { onChange({ theme: t.id, darkMode }); onColorsChange({}) }}
          >
            <span className="theme-card-preview" style={{ background: t.bg }}>
              <span className="theme-card-accent" style={{ background: t.accent }} />
            </span>
            <span className="theme-card-label">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="theme-colors-header">
        <p className="vs-group-label" style={{ margin: 0 }}>Colors</p>
        {hasOverrides && (
          <button className="btn-text-danger" style={{ fontSize: 11 }}
            onClick={() => onColorsChange({})}>Reset</button>
        )}
      </div>
      <div className="theme-colors">
        {COLOR_FIELDS.map(({ key, label }) => {
          const value = themeColors[key] ?? defaults[key]
          const isCustom = !!themeColors[key]
          return (
            <div key={key} className="theme-color-row">
              <span className="theme-color-label">{label}</span>
              <div className="theme-color-input-wrap">
                <input
                  type="color"
                  className="theme-color-picker"
                  value={value}
                  onChange={(e) => setColor(key, e.target.value)}
                />
                <span className="theme-color-hex">{value}</span>
                {isCustom && (
                  <button className="theme-color-reset" title="Reset to default"
                    onClick={() => resetColor(key)}>↺</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
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
  const [theme, setTheme]                     = useState('minimal')
  const [darkMode, setDarkMode]               = useState(false)
  const [themeColors, setThemeColors]         = useState({})
  const [published, setPublished]             = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [dirty, setDirty]         = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [loading, setLoading]     = useState(true)
  const autoSaveTimer             = useRef(null)
  const initialLoad               = useRef(true)

  const historyRef  = useRef([])
  const historyIdx  = useRef(-1)
  const skipHistory = useRef(false)
  const [historyLen, setHistoryLen] = useState(0)

  const [settingsWidth, setSettingsWidth] = useState(360)
  const resizing    = useRef(false)
  const resizeStart = useRef(null)

  useEffect(() => {
    getConfigurator(id).then((cfg) => {
      if (!cfg) { navigate('/dashboard'); return }
      setName(cfg.name ?? '')
      // Migrate old single-glb variants to glbLayers
      const migratedVariants = (cfg.variants ?? []).map((v) => {
        if (v.type === 'glb' && v.glbUrl && !v.glbLayers) {
          // Destructure out the old top-level GLB fields so they're not saved back
          const { glbUrl, glbStoragePath, glbMaterials, materialOverrides, ...rest } = v
          return {
            ...rest,
            glbLayers: [{ id: uid(), label: 'Layer 1', visible: true, glbUrl, glbStoragePath: glbStoragePath ?? null, glbMaterials: glbMaterials ?? [], materialOverrides: materialOverrides ?? {} }],
          }
        }
        return v
      })
      setVariants(migratedVariants)
      setInteriors(cfg.interiors ?? [])
      setBackground(cfg.background ?? DEFAULT_BG)
      setViewerSettings({ ...DEFAULT_VIEWER_SETTINGS, ...(cfg.viewerSettings ?? {}) })
      setExteriorLabel(cfg.exteriorLabel ?? 'Exterior')
      setInteriorLabel(cfg.interiorLabel ?? 'Interior')
      setOrderForm({ ...DEFAULT_ORDER_FORM, ...(cfg.orderForm ?? {}), fields: cfg.orderForm?.fields ?? DEFAULT_ORDER_FORM.fields })
      setTheme(cfg.theme ?? 'minimal')
      setDarkMode(cfg.darkMode ?? false)
      setThemeColors(cfg.themeColors ?? {})
      setPublished(cfg.published ?? false)
      setLoading(false)
    })
  }, [id])

  const doSave = useCallback(async (n, v, i, bg, vs, el, il, of_, th, dm, tc) => {
    setSaving(true); setSaveError(null)
    try {
      await saveConfigurator(id, stripUndefined({ name: n, variants: v, interiors: i, background: bg, viewerSettings: vs, exteriorLabel: el, interiorLabel: il, orderForm: of_, theme: th, darkMode: dm, themeColors: tc }))
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
    autoSaveTimer.current = setTimeout(() => doSave(name, variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm, theme, darkMode, themeColors), 1500)
    return () => clearTimeout(autoSaveTimer.current)
  }, [name, variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm, theme, darkMode, themeColors, doSave])

  function applySnapshot(snap) {
    skipHistory.current = true
    setVariants(snap.variants)
    setInteriors(snap.interiors)
    setBackground(snap.background)
    setViewerSettings(snap.viewerSettings)
    setExteriorLabel(snap.exteriorLabel)
    setInteriorLabel(snap.interiorLabel)
    setOrderForm(snap.orderForm)
    setTheme(snap.theme)
    setDarkMode(snap.darkMode)
    setThemeColors(snap.themeColors)
    setHistoryLen(historyRef.current.length)
  }

  useEffect(() => {
    if (loading) return
    if (skipHistory.current) { skipHistory.current = false; return }
    const snapshot = { variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm, theme, darkMode, themeColors }
    historyRef.current = [...historyRef.current.slice(0, historyIdx.current + 1), snapshot].slice(-50)
    historyIdx.current = historyRef.current.length - 1
    setHistoryLen(historyRef.current.length)
  }, [variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm, theme, darkMode, themeColors])

  useEffect(() => {
    function onKey(e) {
      if (!e.ctrlKey && !e.metaKey) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (historyIdx.current > 0) {
          historyIdx.current -= 1
          applySnapshot(historyRef.current[historyIdx.current])
        }
      }
      if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault()
        if (historyIdx.current < historyRef.current.length - 1) {
          historyIdx.current += 1
          applySnapshot(historyRef.current[historyIdx.current])
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // applySnapshot uses closures over setters which are stable

  useEffect(() => {
    function onMouseMove(e) {
      if (!resizing.current) return
      const delta = e.clientX - resizeStart.current.x
      setSettingsWidth(Math.max(260, Math.min(560, resizeStart.current.w + delta)))
    }
    function onMouseUp() { resizing.current = false }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  async function handleSave() {
    clearTimeout(autoSaveTimer.current)
    await doSave(name, variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm, theme, darkMode, themeColors)
  }

  async function handlePublish() {
    const subOk = ['trial', 'active'].includes(profile?.subscriptionStatus)
    if (!subOk) { navigate('/billing'); return }
    if (!published) {
      const limit = getEmbedLimit(profile)
      const count = await getPublishedCount(user.uid)
      if (count >= limit) { navigate('/billing'); return }
    }
    await saveConfigurator(id, stripUndefined({ name, variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm, theme, darkMode, themeColors }))
    await publishConfigurator(id, !published)
    setPublished((v) => !v)
  }

  if (loading) return <div className="page-loading">Loading builder…</div>

  const config = { variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm, theme, darkMode, themeColors }

  return (
    <div className="builder">
      <div className="builder-inner">
        <div className="builder-topbar">
          <Link to="/dashboard" className="btn-ghost btn-sm builder-back-btn">← Back</Link>
          <input className="builder-name-input" value={name}
            onChange={(e) => setName(e.target.value)} placeholder="Configurator name" />
          <div className="builder-actions">
            {saveError && <span className="builder-save-error">{saveError}</span>}
            <button className="btn-ghost btn-sm" title="Undo (Ctrl+Z)"
              onClick={() => { if (historyIdx.current > 0) { historyIdx.current -= 1; applySnapshot(historyRef.current[historyIdx.current]) } }}
              disabled={historyIdx.current <= 0}>↩</button>
            <button className="btn-ghost btn-sm" title="Redo (Ctrl+Y)"
              onClick={() => { if (historyIdx.current < historyRef.current.length - 1) { historyIdx.current += 1; applySnapshot(historyRef.current[historyIdx.current]) } }}
              disabled={historyIdx.current >= historyLen - 1}>↪</button>
            <button className="btn-ghost btn-sm" onClick={handleSave} disabled={saving}>
              {saved ? '✓' : saving ? '…' : dirty ? 'Save*' : 'Save'}
            </button>
            <button className="btn-ghost btn-sm" onClick={() => window.open(`/embed/${id}`, '_blank')}>
              Preview
            </button>
            <button className={published ? 'btn-danger' : 'btn-primary'} onClick={handlePublish}>
              {published ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        </div>

      <div className="builder-body">
        <aside className="builder-settings" style={{ width: settingsWidth, minWidth: settingsWidth }}>

          {/* Exterior variants */}
          <BuilderAccordion
            title={exteriorLabel}
            onTitleChange={setExteriorLabel}
            badge={variants.length}
            right={
              <button className="btn-add" onClick={() =>
                setVariants((v) => [...v, { id: uid(), label: 'New Variant', swatch: '#888888', swatchType: 'color', price: null, type: 'spinner', frames: [], frameCount: 0, glbLayers: [] }])
              }>+ Add</button>
            }
          >
            {variants.length === 0
              ? <p className="builder-hint">Add a variant with rotation images or a 3D model.</p>
              : variants.map((v, i) => (
                <VariantEditor key={v.id} variant={v} uid={user.uid}
                  onChange={(u) => setVariants((vs) => vs.map((x) => x.id === v.id ? u : x))}
                  onDelete={() => setVariants((vs) => vs.filter((x) => x.id !== v.id))}
                  onDuplicate={() => setVariants((vs) => {
                    const idx = vs.findIndex((x) => x.id === v.id)
                    const copy = { ...v, id: uid(), label: v.label + ' Copy', frames: [], frameCount: 0, glbUrl: null, glbStoragePath: null }
                    return [...vs.slice(0, idx + 1), copy, ...vs.slice(idx + 1)]
                  })}
                  onMoveUp={i > 0 ? () => setVariants((vs) => { const a = [...vs]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a }) : null}
                  onMoveDown={i < variants.length - 1 ? () => setVariants((vs) => { const a = [...vs]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a }) : null}
                />
              ))
            }
          </BuilderAccordion>

          {/* Interior views */}
          <BuilderAccordion
            title={interiorLabel}
            onTitleChange={setInteriorLabel}
            badge={interiors.length}
            right={
              <button className="btn-add" onClick={() =>
                setInteriors((v) => [...v, { id: uid(), label: 'New Interior', panoramaUrl: null }])
              }>+ Add</button>
            }
          >
            {interiors.length === 0
              ? <p className="builder-hint">Add 360° panorama images for interior views.</p>
              : interiors.map((interior, i) => (
                <InteriorEditor key={interior.id} interior={interior} uid={user.uid}
                  onChange={(u) => setInteriors((vs) => vs.map((x) => x.id === interior.id ? u : x))}
                  onDelete={() => setInteriors((vs) => vs.filter((x) => x.id !== interior.id))}
                  onDuplicate={() => setInteriors((vs) => {
                    const idx = vs.findIndex((x) => x.id === interior.id)
                    const copy = { ...interior, id: uid(), label: interior.label + ' Copy', panoramaUrl: null, panoramaStoragePath: null }
                    return [...vs.slice(0, idx + 1), copy, ...vs.slice(idx + 1)]
                  })}
                  onMoveUp={i > 0 ? () => setInteriors((vs) => { const a = [...vs]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a }) : null}
                  onMoveDown={i < interiors.length - 1 ? () => setInteriors((vs) => { const a = [...vs]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a }) : null}
                />
              ))
            }
          </BuilderAccordion>

          {/* Background */}
          <BuilderAccordion title="Background" defaultOpen={false}>
            <BackgroundEditor bg={background} uid={user.uid} onChange={setBackground} />
          </BuilderAccordion>

          {/* Viewer settings */}
          <BuilderAccordion title="Viewer settings" defaultOpen={false}>
            <ViewerSettingsEditor settings={viewerSettings} onChange={setViewerSettings} />
          </BuilderAccordion>

          {/* Order form */}
          <BuilderAccordion
            title="Order form"
            defaultOpen={false}
            right={
              <label className="vs-toggle">
                <input type="checkbox" checked={orderForm.enabled}
                  onChange={(e) => setOrderForm({ ...orderForm, enabled: e.target.checked })} />
                <span className="vs-toggle-track" />
              </label>
            }
          >
            {orderForm.enabled
              ? <OrderFormEditor orderForm={orderForm} onChange={setOrderForm} />
              : <p className="builder-hint">Enable to add a submission form tab to the configurator.</p>
            }
          </BuilderAccordion>

          {/* Style */}
          <BuilderAccordion title="Style" defaultOpen={false}>
            <StyleEditor
              theme={theme}
              darkMode={darkMode}
              themeColors={themeColors}
              onChange={({ theme: t, darkMode: dm }) => { setTheme(t); setDarkMode(dm) }}
              onColorsChange={setThemeColors}
            />
          </BuilderAccordion>

          {/* Embed code */}
          {published && <EmbedSection id={id} origin={window.location.origin} />}
        </aside>

        <div
          className="builder-resize-handle"
          onMouseDown={(e) => {
            resizing.current = true
            resizeStart.current = { x: e.clientX, w: settingsWidth }
            e.preventDefault()
          }}
        />
        <div className="builder-preview">
          {variants.length === 0 && interiors.length === 0
            ? <div className="preview-empty">Add variants or interiors to preview</div>
            : <ConfiguratorRenderer config={config} />
          }
        </div>
      </div>
      </div>
    </div>
  )
}
