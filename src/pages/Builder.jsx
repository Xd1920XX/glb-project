import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { getConfigurator, saveConfigurator, publishConfigurator, getPublishedCount, saveRevision, getRevisions, createTeamInvite } from '../firebase/db.js'
import { getEmbedLimit } from '../config/plans.js'
import { uploadFile, deleteFile } from '../firebase/storage.js'
import { ConfiguratorRenderer } from '../components/ConfiguratorRenderer.jsx'
import { ENV_PRESETS } from '../components/SaunaViewer3D.jsx'
import { extractGLBMaterials } from '../utils/glbMaterials.js'
import { MediaPickerModal } from '../components/MediaPickerModal.jsx'
import { ClaudeChat } from '../components/ClaudeChat.jsx'
import { checkConfigHealth } from '../utils/configHealth.js'

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
  glbEnableAR:           false,
  // ── orbit controls ──
  glbEnablePan:          false,
  glbMinPolarDeg:        22.5,
  glbMaxPolarDeg:        81.8,
  glbMinAzimuthDeg:      null,
  glbMaxAzimuthDeg:      null,
  glbMinDistance:        2,
  glbMaxDistance:        30,
  glbRotateSpeed:        1,
  glbDampingFactor:      0.07,
  glbSnapRotationDeg:    0,
  // ── camera ──
  glbOrthographic:       false,
  // ── render ──
  glbBackgroundColor:    null,
  glbToneMapping:        'aces',
  glbDpr:                2,
  glbWireframe:          false,
  // ── ground / shadows ──
  glbContactShadows:     false,
  glbContactShadowOpacity: 0.55,
  glbContactShadowBlur:  2.2,
  glbGroundPlane:        false,
  glbGroundColor:        '#cccccc',
  glbGridHelper:         false,
  glbShowResetView:      false,
  // ── auto-rotate behaviour ──
  glbAutoRotateAxis:     'y',
  glbPauseAutoRotateOnHover: true,
  glbAutoRotateIdleDelayMs: 0,
  // ── light colors / shadows ──
  glbAmbientColor:       '#ffffff',
  glbKeyColor:           '#ffffff',
  glbFillColor:          '#ffffff',
  glbShadowMapSize:      1024,
  glbShadowRadius:       1,
  // ── fog ──
  glbFogEnabled:         false,
  glbFogColor:           '#ffffff',
  glbFogDensity:         0.02,
  glbFogType:            'exp2',
  glbFogNear:            1,
  glbFogFar:             50,
  // ── UX overlays ──
  glbShowFps:            false,
  glbShowScreenshotButton: false,
  glbCursorStyle:        'grab',
  // ── render mode ──
  glbRenderMode:         'solid',
  glbXrayOpacity:        0.35,
  glbFlatShading:        false,
  // ── animation ──
  glbAnimationCrossfade: 0,
}

const TONE_MAPPING_OPTIONS = ['aces', 'linear', 'reinhard', 'cineon', 'neutral', 'none']

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

const DEFAULT_WATERMARK = {
  enabled: false,
  imageUrl: null,
  imagePath: null,
  position: 'bottom-right',
  opacity: 80,
  size: 15,
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

function VariantEditor({ variant, uid: userUid, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown, variantGroups = [] }) {
  const [uploading, setUploading]     = useState(false)
  const [progress, setProgress]       = useState(0)
  const [uploadLabel, setUploadLabel] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [showSwatchPicker, setShowSwatchPicker] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(`variant-collapsed-${variant.id}`)
      return stored === '1'
    } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem(`variant-collapsed-${variant.id}`, collapsed ? '1' : '0') } catch { /* ignore */ }
  }, [collapsed, variant.id])

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
    <div className={`variant-block${collapsed ? ' collapsed' : ''}`}>
      {/* Header row: swatch + name + price + delete */}
      <div className="variant-block-header">
        <button className="variant-collapse-btn" title={collapsed ? 'Expand' : 'Collapse'}
          onClick={() => setCollapsed((v) => !v)}>
          <span className={`bacc-chevron${collapsed ? '' : ' open'}`} />
        </button>
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

      {!collapsed && <>
      {/* Group assignment */}
      {variantGroups.length > 0 && (
        <div className="variant-group-row">
          <span className="variant-group-label">Group</span>
          <select className="vs-select variant-group-select"
            value={variant.groupId ?? ''}
            onChange={(e) => onChange({ ...variant, groupId: e.target.value || null })}>
            <option value="">No group</option>
            {variantGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </div>
      )}

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
        <>
          <GlbLayersEditor
            layers={variant.glbLayers ?? []}
            uid={userUid}
            onChange={(layers) => onChange({ ...variant, glbLayers: layers })}
          />
          {(variant.glbLayers?.length ?? 0) > 0 && (
            <StackTransformEditor
              transform={variant.transform}
              onChange={(transform) => onChange({ ...variant, transform })} />
          )}
          <PartOptionsEditor
            variant={variant}
            uid={userUid}
            onChange={onChange}
          />
        </>
      )}

      </>}

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

function StackTransformEditor({ transform, onChange }) {
  const t = transform ?? {}
  const [open, setOpen] = useState(false)
  const offset = t.offset ?? { x: 0, y: 0, z: 0 }
  const rotation = t.rotation ?? { x: 0, y: 0, z: 0 }
  const scaleVal = typeof t.scale === 'number' ? t.scale : (t.scale?.x ?? 1)
  const autoCenter = !!t.autoCenter

  const setOffset = (axis, v) => onChange({ ...t, offset: { ...offset, [axis]: Number(v) || 0 } })
  const setRotation = (axis, v) => onChange({ ...t, rotation: { ...rotation, [axis]: Number(v) || 0 } })
  const setScale = (v) => onChange({ ...t, scale: Number(v) || 1 })
  const setAutoCenter = (v) => onChange({ ...t, autoCenter: !!v })

  const targetOffset = t.targetOffset ?? null
  const initialCam = t.initialCameraPosition ?? null
  const defaultYaw = t.defaultYaw ?? 0
  const defaultPitch = t.defaultPitch ?? 0
  const setTargetOffset = (axis, v) => {
    const next = { ...(targetOffset ?? { x: 0, y: 0, z: 0 }), [axis]: Number(v) || 0 }
    const isZero = !next.x && !next.y && !next.z
    onChange({ ...t, targetOffset: isZero ? null : next })
  }
  const setInitialCam = (axis, v) => {
    const next = { ...(initialCam ?? { x: 8, y: 4, z: 12 }), [axis]: Number(v) || 0 }
    onChange({ ...t, initialCameraPosition: next })
  }
  const clearInitialCam = () => onChange({ ...t, initialCameraPosition: null })
  const setDefaultYaw = (v) => onChange({ ...t, defaultYaw: Number(v) || 0 })
  const setDefaultPitch = (v) => onChange({ ...t, defaultPitch: Number(v) || 0 })

  function reset() {
    onChange(null)
  }

  const hasAny = !!(t.offset || t.rotation || (t.scale != null && t.scale !== 1) || t.autoCenter || t.targetOffset || t.initialCameraPosition || t.defaultYaw || t.defaultPitch || t.fov || (t.initialZoomMul != null && t.initialZoomMul !== 1))

  return (
    <div className="layer-transform" style={{ marginTop: 10 }}>
      <button className="btn-link" style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}
        onClick={() => setOpen((v) => !v)}>
        {open ? '▾' : '▸'} Stack Position & Centering {hasAny && <span style={{ color: '#16a34a' }}>●</span>}
      </button>

      {open && (
        <div style={{ marginTop: 8, padding: 10, background: 'var(--hover-bg)', borderRadius: 6, fontSize: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={autoCenter} onChange={(e) => setAutoCenter(e.target.checked)} />
            <span>Auto-center entire stack (combined bounding box → origin)</span>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(3, 1fr)', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Offset</span>
            <AxisInput axis="X" value={offset.x} onChange={(v) => setOffset('x', v)} step={0.05} />
            <AxisInput axis="Y" value={offset.y} onChange={(v) => setOffset('y', v)} step={0.05} />
            <AxisInput axis="Z" value={offset.z} onChange={(v) => setOffset('z', v)} step={0.05} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(3, 1fr)', gap: 6, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-muted)' }}>Rotation°</span>
            <AxisInput axis="X" value={rotation.x} onChange={(v) => setRotation('x', v)} step={5} />
            <AxisInput axis="Y" value={rotation.y} onChange={(v) => setRotation('y', v)} step={5} />
            <AxisInput axis="Z" value={rotation.z} onChange={(v) => setRotation('z', v)} step={5} />
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>Quick rotate</div>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 6, alignItems: 'center', rowGap: 4 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>X axis</span>
              <RotateButtons axis="x" current={rotation.x} onChange={(v) => setRotation('x', v)} />
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Y axis</span>
              <RotateButtons axis="y" current={rotation.y} onChange={(v) => setRotation('y', v)} />
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Z axis</span>
              <RotateButtons axis="z" current={rotation.z} onChange={(v) => setRotation('z', v)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Scale</span>
            <AxisInput axis="" value={scaleVal} onChange={setScale} step={0.05} min={0.01} />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0 8px' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 6 }}>Camera pose (applied after fit)</div>

          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Yaw / Pitch°</span>
            <AxisInput axis="Y" value={defaultYaw} onChange={setDefaultYaw} step={5} />
            <AxisInput axis="P" value={defaultPitch} onChange={setDefaultPitch} step={5} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(3, 1fr)', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Target +</span>
            <AxisInput axis="X" value={targetOffset?.x ?? 0} onChange={(v) => setTargetOffset('x', v)} step={0.05} />
            <AxisInput axis="Y" value={targetOffset?.y ?? 0} onChange={(v) => setTargetOffset('y', v)} step={0.05} />
            <AxisInput axis="Z" value={targetOffset?.z ?? 0} onChange={(v) => setTargetOffset('z', v)} step={0.05} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(3, 1fr) auto', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Init cam</span>
            <AxisInput axis="X" value={initialCam?.x ?? 8} onChange={(v) => setInitialCam('x', v)} step={0.5} />
            <AxisInput axis="Y" value={initialCam?.y ?? 4} onChange={(v) => setInitialCam('y', v)} step={0.5} />
            <AxisInput axis="Z" value={initialCam?.z ?? 12} onChange={(v) => setInitialCam('z', v)} step={0.5} />
            {initialCam && <button className="btn-text-danger" style={{ fontSize: 10 }} onClick={clearInitialCam}>×</button>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>FOV / Zoom×</span>
            <AxisInput axis="" value={t.fov ?? ''} onChange={(v) => onChange({ ...t, fov: v === '' ? null : (Number(v) || null) })} step={1} />
            <AxisInput axis="" value={t.initialZoomMul ?? 1} onChange={(v) => onChange({ ...t, initialZoomMul: Number(v) || 1 })} step={0.05} min={0.1} />
          </div>

          {hasAny && (
            <button className="btn-text-danger" style={{ fontSize: 11 }} onClick={reset}>Reset transform</button>
          )}
          <p className="builder-hint" style={{ marginTop: 8, fontSize: 11 }}>
            Applies to all GLB layers in this variant as a single group. Auto-center uses the combined bounding box. Yaw/Pitch and Target+ shift the camera/orbit pivot after fit. Init cam overrides starting position.
          </p>
        </div>
      )}
    </div>
  )
}

function RotateButtons({ axis, current, onChange }) {
  function snap(deg) {
    let next = ((Number(current) || 0) + deg) % 360
    if (next > 180) next -= 360
    if (next <= -180) next += 360
    onChange(next)
  }
  const btnStyle = { all: 'unset', cursor: 'pointer', padding: '5px 8px', borderRadius: 4, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 11, fontWeight: 500, color: 'var(--text)', textAlign: 'center', minWidth: 0, flex: '1 1 0' }
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 }}>
      <button title={`Rotate ${axis.toUpperCase()} -90°`} style={btnStyle} onClick={() => snap(-90)}>-90°</button>
      <button title={`Rotate ${axis.toUpperCase()} +90°`} style={btnStyle} onClick={() => snap(90)}>+90°</button>
      <button title={`Rotate ${axis.toUpperCase()} 180°`} style={btnStyle} onClick={() => snap(180)}>180°</button>
    </div>
  )
}

function AxisInput({ axis, value, onChange, step = 1, min = -1000 }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {axis && <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 12 }}>{axis}</span>}
      <input
        type="number"
        step={step}
        min={min}
        className="field-input inline"
        style={{ width: '100%', padding: '4px 6px', fontSize: 12 }}
        value={value ?? 0}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function GlbLayerEditor({ layer, uid: userUid, onChange, onDelete, onMoveUp, onMoveDown }) {
  const [showPicker, setShowPicker]     = useState(false)
  const [uploading, setUploading]       = useState(false)
  const [uploadLabel, setUploadLabel]   = useState('')
  const [scannedNoAnims, setScannedNoAnims] = useState(false)

  // Backfill: existing GLB uploaded before animation support — scan once.
  useEffect(() => {
    if (!layer.glbUrl) return
    if (layer.glbAnimations !== undefined) return
    let cancelled = false
    extractGLBMaterials(layer.glbUrl).then((info) => {
      if (cancelled) return
      onChange({ ...layer, glbAnimations: info.animations })
      if (info.animations.length === 0) setScannedNoAnims(true)
    }).catch(() => {})
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer.glbUrl])

  async function handleSelect({ url, storagePath }) {
    setUploadLabel('Scanning GLB…'); setUploading(true)
    let glbMaterials = []
    let glbAnimations = []
    try {
      const info = await extractGLBMaterials(url)
      glbMaterials = info.materials
      glbAnimations = info.animations
    } catch { /* non-fatal */ }
    onChange({
      ...layer,
      glbUrl: url,
      glbStoragePath: storagePath,
      glbMaterials,
      glbAnimations,
      materialOverrides: {},
      animationConfig: glbAnimations.length > 0
        ? { enabled: true, clipName: glbAnimations[0].name, loop: 'repeat', speed: 1 }
        : null,
    })
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
                  onChange({ ...layer, glbUrl: null, glbStoragePath: null, glbMaterials: [], glbAnimations: [], materialOverrides: {}, animationConfig: null })
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

      {layer.glbUrl && (layer.glbAnimations?.length ?? 0) > 0 && (
        <AnimationEditor
          animations={layer.glbAnimations}
          config={layer.animationConfig}
          onChange={(animationConfig) => onChange({ ...layer, animationConfig })}
        />
      )}
      {layer.glbUrl && (layer.glbAnimations?.length ?? 0) === 0 && scannedNoAnims && (
        <p className="builder-hint" style={{ marginTop: 8 }}>No animations found in this GLB.</p>
      )}

      {layer.glbUrl && (
        <LayerTransformEditor layer={layer} onChange={onChange} />
      )}

      {showPicker && (
        <MediaPickerModal uid={userUid} accept=".glb"
          onSelect={(f) => { setShowPicker(false); handleSelect(f) }}
          onClose={() => setShowPicker(false)} />
      )}
    </div>
  )
}

function AnimationEditor({ animations, config, onChange }) {
  const enabled = !!config?.enabled
  const clipName = config?.clipName ?? animations[0].name
  const loop = config?.loop ?? 'repeat'
  const speed = config?.speed ?? 1

  function update(patch) {
    onChange({ enabled, clipName, loop, speed, ...config, ...patch })
  }

  return (
    <div className="anim-editor">
      <div className="anim-editor-header">
        <span className="anim-editor-label">Animation ({animations.length})</span>
        <label className="vs-toggle">
          <input type="checkbox" checked={enabled}
            onChange={(e) => update({ enabled: e.target.checked })} />
          <span className="vs-toggle-track" />
        </label>
      </div>
      {enabled && (
        <div className="anim-editor-body">
          <div className="vs-row">
            <label className="vs-label">Clip</label>
            <select className="vs-select" value={clipName}
              onChange={(e) => update({ clipName: e.target.value })}>
              {animations.length > 1 && <option value="__all__">All clips</option>}
              {animations.map((a) => (
                <option key={a.name} value={a.name}>{a.name} ({a.duration.toFixed(1)}s)</option>
              ))}
            </select>
          </div>
          <div className="vs-row">
            <label className="vs-label">Loop</label>
            <select className="vs-select" value={loop}
              onChange={(e) => update({ loop: e.target.value })}>
              <option value="repeat">Repeat</option>
              <option value="pingpong">Ping-pong</option>
              <option value="once">Play once</option>
            </select>
          </div>
          <div className="vs-row">
            <label className="vs-label">Speed</label>
            <div className="vs-slider-wrap">
              <input type="range" min="0.1" max="3" step="0.1"
                value={speed}
                onChange={(e) => update({ speed: parseFloat(e.target.value) })} />
              <span className="vs-value">{speed.toFixed(1)}×</span>
            </div>
          </div>
          <div className="vs-row">
            <label className="vs-label">Reverse</label>
            <label className="vs-toggle">
              <input type="checkbox" checked={!!config?.reverse}
                onChange={(e) => update({ reverse: e.target.checked })} />
              <span className="vs-toggle-track" />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

function LayerTransformEditor({ layer, onChange }) {
  const [open, setOpen] = useState(false)
  const t = layer.transform ?? {}
  const offset = t.offset ?? { x: 0, y: 0, z: 0 }
  const rotation = t.rotation ?? { x: 0, y: 0, z: 0 }
  const scl = typeof t.scale === 'number' ? t.scale : (t.scale?.x ?? 1)
  const cs = layer.castShadow !== false
  const rs = layer.receiveShadow !== false
  const hasAny = !!(t.offset || t.rotation || (t.scale != null && t.scale !== 1) || layer.castShadow === false || layer.receiveShadow === false)

  function setT(patch) { onChange({ ...layer, transform: { ...t, ...patch } }) }
  function setOff(axis, v) { setT({ offset: { ...offset, [axis]: Number(v) || 0 } }) }
  function setRot(axis, v) { setT({ rotation: { ...rotation, [axis]: Number(v) || 0 } }) }
  function setScale(v) { setT({ scale: Number(v) || 1 }) }
  function reset() { onChange({ ...layer, transform: null, castShadow: true, receiveShadow: true }) }

  return (
    <div style={{ marginTop: 8 }}>
      <button className="btn-link" style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}
        onClick={() => setOpen((v) => !v)}>
        {open ? '▾' : '▸'} Layer transform & shadows {hasAny && <span style={{ color: '#16a34a' }}>●</span>}
      </button>
      {open && (
        <div style={{ marginTop: 6, padding: 10, background: 'var(--hover-bg)', borderRadius: 6, fontSize: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(3, 1fr)', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Offset</span>
            <AxisInput axis="X" value={offset.x} onChange={(v) => setOff('x', v)} step={0.05} />
            <AxisInput axis="Y" value={offset.y} onChange={(v) => setOff('y', v)} step={0.05} />
            <AxisInput axis="Z" value={offset.z} onChange={(v) => setOff('z', v)} step={0.05} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(3, 1fr)', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Rotation°</span>
            <AxisInput axis="X" value={rotation.x} onChange={(v) => setRot('x', v)} step={5} />
            <AxisInput axis="Y" value={rotation.y} onChange={(v) => setRot('y', v)} step={5} />
            <AxisInput axis="Z" value={rotation.z} onChange={(v) => setRot('z', v)} step={5} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 6, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)' }}>Scale</span>
            <AxisInput axis="" value={scl} onChange={setScale} step={0.05} min={0.01} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <input type="checkbox" checked={cs} onChange={(e) => onChange({ ...layer, castShadow: e.target.checked })} />
            <span>Cast shadow</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <input type="checkbox" checked={rs} onChange={(e) => onChange({ ...layer, receiveShadow: e.target.checked })} />
            <span>Receive shadow</span>
          </label>
          {hasAny && <button className="btn-text-danger" style={{ fontSize: 11 }} onClick={reset}>Reset</button>}
          <p className="builder-hint" style={{ marginTop: 6, fontSize: 11 }}>Per-layer transform applies INSIDE the stack group — useful if individual GLBs are misaligned in Blender.</p>
        </div>
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

// ── Part options editor ────────────────────────────────────────────

function csvToArray(s) {
  return String(s ?? '')
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean)
}
function arrayToCsv(arr) { return Array.isArray(arr) ? arr.join(', ') : '' }

function PartOptionEditor({ option, uid: userUid, onChange, onDelete, onMoveUp, onMoveDown, availableGroupLabels }) {
  const [showPicker, setShowPicker] = useState(false)
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className="part-option-block" style={{ border: '1px solid #e0e0e0', borderRadius: 4, padding: 8, marginBottom: 6 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button className="variant-collapse-btn" onClick={() => setCollapsed((v) => !v)}>
          <span className={`bacc-chevron${collapsed ? '' : ' open'}`} />
        </button>
        <input className="field-input inline" placeholder="Option label"
          value={option.label ?? ''}
          onChange={(e) => onChange({ ...option, label: e.target.value })} />
        <button className="btn-icon-move" onClick={onMoveUp} disabled={!onMoveUp}>↑</button>
        <button className="btn-icon-move" onClick={onMoveDown} disabled={!onMoveDown}>↓</button>
        <button className="btn-icon-delete" onClick={onDelete}>✕</button>
      </div>
      {!collapsed && (
        <div style={{ paddingLeft: 28, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={!!option.hidden}
              onChange={(e) => onChange({ ...option, hidden: e.target.checked })} />
            <span style={{ fontSize: 12 }}>Hide entire matched layer when selected</span>
          </label>

          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Option GLB (overrides layer GLB)</div>
            {option.glbUrl ? (
              <div className="upload-done" style={{ fontSize: 12 }}>
                ✓ GLB selected
                <button className="btn-text-danger" onClick={() => setShowPicker(true)}>Replace</button>
                <button className="btn-text-danger" onClick={() => onChange({ ...option, glbUrl: null, glbStoragePath: null })}>Remove</button>
              </div>
            ) : (
              <button className="btn-upload" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => setShowPicker(true)}>Choose GLB</button>
            )}
          </div>

          <label style={{ fontSize: 12 }}>
            <div>visibleNodes (CSV substrings — mesh visible if ancestor name matches any)</div>
            <input className="field-input" value={arrayToCsv(option.visibleNodes)}
              onChange={(e) => onChange({ ...option, visibleNodes: csvToArray(e.target.value) })} />
          </label>

          <label style={{ fontSize: 12 }}>
            <div>hideNodes (CSV substrings — mesh hidden if ancestor name matches any)</div>
            <input className="field-input" value={arrayToCsv(option.hideNodes)}
              onChange={(e) => onChange({ ...option, hideNodes: csvToArray(e.target.value) })} />
          </label>

          <label style={{ fontSize: 12 }}>
            <div>hidesGroups (CSV — group labels to suppress when this option active)</div>
            <input className="field-input" value={arrayToCsv(option.hidesGroups)}
              onChange={(e) => onChange({ ...option, hidesGroups: csvToArray(e.target.value) })}
              list={`hides-groups-${option.id}`} />
            {availableGroupLabels?.length > 0 && (
              <datalist id={`hides-groups-${option.id}`}>
                {availableGroupLabels.map((l) => <option key={l} value={l} />)}
              </datalist>
            )}
          </label>
        </div>
      )}
      {showPicker && (
        <MediaPickerModal uid={userUid} accept=".glb"
          onSelect={({ url, storagePath }) => { setShowPicker(false); onChange({ ...option, glbUrl: url, glbStoragePath: storagePath }) }}
          onClose={() => setShowPicker(false)} />
      )}
    </div>
  )
}

function PartOptionGroupEditor({ group, glbLayers, allGroups, uid: userUid, onChange, onDelete, onMoveUp, onMoveDown }) {
  const [collapsed, setCollapsed] = useState(true)
  const options = group.options ?? []
  const layerLabels = (glbLayers ?? []).map((l) => l.label).filter(Boolean)
  const otherGroupLabels = (allGroups ?? []).filter((g) => g.id !== group.id).map((g) => g.label).filter(Boolean)

  function updateOptions(next) { onChange({ ...group, options: next }) }
  function addOption() {
    updateOptions([...options, { id: uid(), label: `Option ${options.length + 1}` }])
  }
  function updateOption(i, updated) { updateOptions(options.map((o, idx) => idx === i ? updated : o)) }
  function deleteOption(i) { updateOptions(options.filter((_, idx) => idx !== i)) }
  function moveOption(i, dir) {
    const next = [...options]
    ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
    updateOptions(next)
  }
  function toggleLayerMatch(label) {
    const cur = group.matchLayerLabels ?? []
    const next = cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label]
    onChange({ ...group, matchLayerLabels: next })
  }

  return (
    <div className="part-option-group-block" style={{ border: '1px solid #ccc', borderRadius: 4, padding: 8, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button className="variant-collapse-btn" onClick={() => setCollapsed((v) => !v)}>
          <span className={`bacc-chevron${collapsed ? '' : ' open'}`} />
        </button>
        <input className="field-input inline" placeholder="Group label (e.g. Pos 1 kaas)"
          value={group.label ?? ''}
          onChange={(e) => onChange({ ...group, label: e.target.value })} />
        <span style={{ fontSize: 11, color: '#666' }}>{options.length} option{options.length === 1 ? '' : 's'}</span>
        <button className="btn-icon-move" onClick={onMoveUp} disabled={!onMoveUp}>↑</button>
        <button className="btn-icon-move" onClick={onMoveDown} disabled={!onMoveDown}>↓</button>
        <button className="btn-icon-delete" onClick={onDelete}>✕</button>
      </div>
      {!collapsed && (
        <div style={{ paddingLeft: 28, marginTop: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>matchLayerLabels (which GLB layers this group controls)</div>
            {layerLabels.length === 0 ? (
              <p className="builder-hint">Add GLB layers first to bind this group to them.</p>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {layerLabels.map((l) => (
                  <label key={l} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <input type="checkbox"
                      checked={(group.matchLayerLabels ?? []).includes(l)}
                      onChange={() => toggleLayerMatch(l)} />
                    {l}
                  </label>
                ))}
              </div>
            )}
          </div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            <div>Default option (optional)</div>
            <select className="vs-select" value={group.defaultOptionId ?? ''}
              onChange={(e) => onChange({ ...group, defaultOptionId: e.target.value || null })}>
              <option value="">First option</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Options</span>
            <button className="btn-add" onClick={addOption}>+ Add option</button>
          </div>
          {options.map((opt, i) => (
            <PartOptionEditor
              key={opt.id}
              option={opt}
              uid={userUid}
              availableGroupLabels={otherGroupLabels}
              onChange={(updated) => updateOption(i, updated)}
              onDelete={() => deleteOption(i)}
              onMoveUp={i > 0 ? () => moveOption(i, -1) : null}
              onMoveDown={i < options.length - 1 ? () => moveOption(i, 1) : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PartOptionsEditor({ variant, uid: userUid, onChange }) {
  const groups = variant.partOptions ?? []
  const glbLayers = variant.glbLayers ?? []

  function updateGroups(next) { onChange({ ...variant, partOptions: next }) }
  function addGroup() {
    updateGroups([...groups, { id: uid(), label: `Group ${groups.length + 1}`, matchLayerLabels: [], options: [] }])
  }
  function updateGroup(i, updated) { updateGroups(groups.map((g, idx) => idx === i ? updated : g)) }
  function deleteGroup(i) {
    if (!confirm('Delete this option group?')) return
    updateGroups(groups.filter((_, idx) => idx !== i))
  }
  function moveGroup(i, dir) {
    const next = [...groups]
    ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
    updateGroups(next)
  }

  return (
    <div className="part-options-editor" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>Part options ({groups.length})</span>
        <button className="btn-add" onClick={addGroup}>+ Add group</button>
      </div>
      {groups.length === 0 && (
        <p className="builder-hint">Groups let viewers pick between interchangeable parts. Each group targets one or more GLB layers via matchLayerLabels.</p>
      )}
      {groups.map((g, i) => (
        <PartOptionGroupEditor
          key={g.id}
          group={g}
          glbLayers={glbLayers}
          allGroups={groups}
          uid={userUid}
          onChange={(updated) => updateGroup(i, updated)}
          onDelete={() => deleteGroup(i)}
          onMoveUp={i > 0 ? () => moveGroup(i, -1) : null}
          onMoveDown={i < groups.length - 1 ? () => moveGroup(i, 1) : null}
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
          {type === 'texture' && override.textureUrl && (
            <div className="mat-texture-tiling" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
              <label style={{ fontSize: 12 }}>
                <div>Repeat X (larger = more tiles, smaller = zoom in)</div>
                <input className="field-input" type="number" step="0.1"
                  placeholder="1"
                  value={override.textureRepeatX ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : Number(e.target.value)
                    onChange({ ...override, textureRepeatX: v })
                  }} />
              </label>
              <label style={{ fontSize: 12 }}>
                <div>Repeat Y</div>
                <input className="field-input" type="number" step="0.1"
                  placeholder="1"
                  value={override.textureRepeatY ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : Number(e.target.value)
                    onChange({ ...override, textureRepeatY: v })
                  }} />
              </label>
              <label style={{ fontSize: 12 }}>
                <div>Offset X</div>
                <input className="field-input" type="number" step="0.05"
                  placeholder="0"
                  value={override.textureOffsetX ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : Number(e.target.value)
                    onChange({ ...override, textureOffsetX: v })
                  }} />
              </label>
              <label style={{ fontSize: 12 }}>
                <div>Offset Y</div>
                <input className="field-input" type="number" step="0.05"
                  placeholder="0"
                  value={override.textureOffsetY ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : Number(e.target.value)
                    onChange({ ...override, textureOffsetY: v })
                  }} />
              </label>
              <label style={{ fontSize: 12, gridColumn: '1 / -1' }}>
                <div>Rotation (degrees)</div>
                <input className="field-input" type="number" step="5"
                  placeholder="0"
                  value={override.textureRotation ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : Number(e.target.value)
                    onChange({ ...override, textureRotation: v })
                  }} />
              </label>
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
      const info = await extractGLBMaterials(variant.glbUrl)
      // Merge: keep existing overrides, add newly discovered materials
      const existingIds = new Set(materials.map((m) => m.id))
      const merged = [
        ...materials,
        ...info.materials.filter((m) => !existingIds.has(m.id)),
      ]
      onChange({ ...variant, glbMaterials: merged, glbAnimations: info.animations })
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
  const mode = interior.mode ?? 'pano'

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
      <div className="variant-type-row">
        <label className="radio-label">
          <input type="radio" checked={mode === 'pano'}
            onChange={() => onChange({ ...interior, mode: 'pano' })} /> 360° panorama
        </label>
        <label className="radio-label">
          <input type="radio" checked={mode === 'flat'}
            onChange={() => onChange({ ...interior, mode: 'flat' })} /> Flat image
        </label>
      </div>
      <div className="upload-section">
        {interior.panoramaUrl ? (
          <div className="upload-done">✓ Image uploaded
            <button className="btn-text-danger" onClick={() => setShowPicker(true)}>Replace</button>
            <button className="btn-text-danger" onClick={async () => {
              await deleteFile(interior.panoramaStoragePath)
              onChange({ ...interior, panoramaUrl: null, panoramaStoragePath: null })
            }}>Remove</button>
          </div>
        ) : (
          <button className="btn-upload" onClick={() => setShowPicker(true)}>
            {mode === 'flat' ? 'Choose flat interior image' : 'Choose 360° panorama image'}
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
        <label className="vs-label">AR / LiDAR (mobile)</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbEnableAR ?? false}
            onChange={(e) => set('glbEnableAR', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>
      <p className="builder-hint" style={{ fontSize: 11, marginBottom: 8 }}>
        Shows a "View in AR" button on iOS (AR Quick Look + LiDAR on Pro devices) and Android (Scene Viewer / ARCore). Hidden on desktop.
      </p>

      <div className="vs-row">
        <label className="vs-label">Animation controls</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbEnableAnimationControls ?? false}
            onChange={(e) => set('glbEnableAnimationControls', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>
      <p className="builder-hint" style={{ fontSize: 11, marginBottom: 8 }}>
        Show play/pause/speed controls over the viewer when a layer has animations enabled.
      </p>

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

      {/* ── Orbit controls ── */}
      <p className="vs-group-label" style={{ marginTop: 16 }}>Orbit controls</p>

      <div className="vs-row">
        <label className="vs-label">Enable pan (drag)</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbEnablePan ?? false}
            onChange={(e) => set('glbEnablePan', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      <div className="vs-row">
        <label className="vs-label">Reset view button</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbShowResetView ?? false}
            onChange={(e) => set('glbShowResetView', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      <div className="vs-row">
        <label className="vs-label">Min polar °</label>
        <div className="vs-slider-wrap">
          <input type="range" min="0" max="89" step="0.5"
            value={s.glbMinPolarDeg ?? 22.5}
            onChange={(e) => set('glbMinPolarDeg', Number(e.target.value))} />
          <span className="vs-value">{s.glbMinPolarDeg ?? 22.5}°</span>
        </div>
      </div>

      <div className="vs-row">
        <label className="vs-label">Max polar °</label>
        <div className="vs-slider-wrap">
          <input type="range" min="91" max="180" step="0.5"
            value={s.glbMaxPolarDeg ?? 81.8}
            onChange={(e) => set('glbMaxPolarDeg', Number(e.target.value))} />
          <span className="vs-value">{s.glbMaxPolarDeg ?? 81.8}°</span>
        </div>
      </div>

      <div className="vs-row">
        <label className="vs-label">Min azimuth °</label>
        <input className="field-input inline" type="number" step="1"
          placeholder="(unlimited)"
          value={s.glbMinAzimuthDeg ?? ''}
          onChange={(e) => set('glbMinAzimuthDeg', e.target.value === '' ? null : Number(e.target.value))} />
      </div>

      <div className="vs-row">
        <label className="vs-label">Max azimuth °</label>
        <input className="field-input inline" type="number" step="1"
          placeholder="(unlimited)"
          value={s.glbMaxAzimuthDeg ?? ''}
          onChange={(e) => set('glbMaxAzimuthDeg', e.target.value === '' ? null : Number(e.target.value))} />
      </div>

      <div className="vs-row">
        <label className="vs-label">Min distance</label>
        <div className="vs-slider-wrap">
          <input type="range" min="0.1" max="20" step="0.1"
            value={s.glbMinDistance ?? 2}
            onChange={(e) => set('glbMinDistance', Number(e.target.value))} />
          <span className="vs-value">{s.glbMinDistance ?? 2}</span>
        </div>
      </div>

      <div className="vs-row">
        <label className="vs-label">Max distance</label>
        <div className="vs-slider-wrap">
          <input type="range" min="5" max="200" step="1"
            value={s.glbMaxDistance ?? 30}
            onChange={(e) => set('glbMaxDistance', Number(e.target.value))} />
          <span className="vs-value">{s.glbMaxDistance ?? 30}</span>
        </div>
      </div>

      <div className="vs-row">
        <label className="vs-label">Rotate speed</label>
        <div className="vs-slider-wrap">
          <input type="range" min="0.1" max="3" step="0.1"
            value={s.glbRotateSpeed ?? 1}
            onChange={(e) => set('glbRotateSpeed', Number(e.target.value))} />
          <span className="vs-value">{s.glbRotateSpeed ?? 1}</span>
        </div>
      </div>

      <div className="vs-row">
        <label className="vs-label">Damping</label>
        <div className="vs-slider-wrap">
          <input type="range" min="0" max="0.3" step="0.01"
            value={s.glbDampingFactor ?? 0.07}
            onChange={(e) => set('glbDampingFactor', Number(e.target.value))} />
          <span className="vs-value">{s.glbDampingFactor ?? 0.07}</span>
        </div>
      </div>

      <div className="vs-row">
        <label className="vs-label">Snap rotation °</label>
        <div className="vs-slider-wrap">
          <input type="range" min="0" max="90" step="1"
            value={s.glbSnapRotationDeg ?? 0}
            onChange={(e) => set('glbSnapRotationDeg', Number(e.target.value))} />
          <span className="vs-value">{s.glbSnapRotationDeg ?? 0}°</span>
        </div>
      </div>

      {/* ── Camera ── */}
      <p className="vs-group-label" style={{ marginTop: 16 }}>Camera mode</p>

      <div className="vs-row">
        <label className="vs-label">Orthographic</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbOrthographic ?? false}
            onChange={(e) => set('glbOrthographic', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      {/* ── Render ── */}
      <p className="vs-group-label" style={{ marginTop: 16 }}>Rendering</p>

      <div className="vs-row">
        <label className="vs-label">Background color</label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="color"
            value={s.glbBackgroundColor ?? '#ffffff'}
            onChange={(e) => set('glbBackgroundColor', e.target.value)} />
          <button className="btn-text-danger" style={{ fontSize: 11 }} onClick={() => set('glbBackgroundColor', null)}>Clear</button>
        </div>
      </div>

      <div className="vs-row">
        <label className="vs-label">Tone mapping</label>
        <select className="vs-select"
          value={s.glbToneMapping ?? 'aces'}
          onChange={(e) => set('glbToneMapping', e.target.value)}>
          {TONE_MAPPING_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="vs-row">
        <label className="vs-label">Resolution (DPR)</label>
        <div className="vs-slider-wrap">
          <input type="range" min="0.5" max="3" step="0.1"
            value={s.glbDpr ?? 2}
            onChange={(e) => set('glbDpr', Number(e.target.value))} />
          <span className="vs-value">{s.glbDpr ?? 2}</span>
        </div>
      </div>

      <div className="vs-row">
        <label className="vs-label">Wireframe (debug)</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbWireframe ?? false}
            onChange={(e) => set('glbWireframe', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      {/* ── Ground & shadows ── */}
      <p className="vs-group-label" style={{ marginTop: 16 }}>Ground &amp; shadows</p>

      <div className="vs-row">
        <label className="vs-label">Contact shadows</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbContactShadows ?? false}
            onChange={(e) => set('glbContactShadows', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      {s.glbContactShadows && (
        <>
          <div className="vs-row">
            <label className="vs-label">Shadow opacity</label>
            <div className="vs-slider-wrap">
              <input type="range" min="0" max="1" step="0.05"
                value={s.glbContactShadowOpacity ?? 0.55}
                onChange={(e) => set('glbContactShadowOpacity', Number(e.target.value))} />
              <span className="vs-value">{s.glbContactShadowOpacity ?? 0.55}</span>
            </div>
          </div>
          <div className="vs-row">
            <label className="vs-label">Shadow blur</label>
            <div className="vs-slider-wrap">
              <input type="range" min="0" max="10" step="0.1"
                value={s.glbContactShadowBlur ?? 2.2}
                onChange={(e) => set('glbContactShadowBlur', Number(e.target.value))} />
              <span className="vs-value">{s.glbContactShadowBlur ?? 2.2}</span>
            </div>
          </div>
        </>
      )}

      <div className="vs-row">
        <label className="vs-label">Ground plane</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbGroundPlane ?? false}
            onChange={(e) => set('glbGroundPlane', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      {s.glbGroundPlane && (
        <div className="vs-row">
          <label className="vs-label">Ground color</label>
          <input type="color"
            value={s.glbGroundColor ?? '#cccccc'}
            onChange={(e) => set('glbGroundColor', e.target.value)} />
        </div>
      )}

      <div className="vs-row">
        <label className="vs-label">Grid helper</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbGridHelper ?? false}
            onChange={(e) => set('glbGridHelper', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      {/* ── Auto-rotate behaviour ── */}
      <p className="vs-group-label" style={{ marginTop: 16 }}>Auto-rotate behaviour</p>

      <div className="vs-row">
        <label className="vs-label">Axis</label>
        <select className="vs-select"
          value={s.glbAutoRotateAxis ?? 'y'}
          onChange={(e) => set('glbAutoRotateAxis', e.target.value)}>
          <option value="x">X</option>
          <option value="y">Y (default)</option>
          <option value="z">Z</option>
        </select>
      </div>

      <div className="vs-row">
        <label className="vs-label">Pause on hover</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbPauseAutoRotateOnHover ?? true}
            onChange={(e) => set('glbPauseAutoRotateOnHover', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      <div className="vs-row">
        <label className="vs-label">Idle delay (ms)</label>
        <input className="field-input inline" type="number" step="100" min="0"
          value={s.glbAutoRotateIdleDelayMs ?? 0}
          onChange={(e) => set('glbAutoRotateIdleDelayMs', Number(e.target.value) || 0)} />
      </div>

      {/* ── Light colors / shadow softness ── */}
      <p className="vs-group-label" style={{ marginTop: 16 }}>Light colors</p>

      <div className="vs-row">
        <label className="vs-label">Ambient color</label>
        <input type="color"
          value={s.glbAmbientColor ?? '#ffffff'}
          onChange={(e) => set('glbAmbientColor', e.target.value)} />
      </div>

      <div className="vs-row">
        <label className="vs-label">Key light color</label>
        <input type="color"
          value={s.glbKeyColor ?? '#ffffff'}
          onChange={(e) => set('glbKeyColor', e.target.value)} />
      </div>

      <div className="vs-row">
        <label className="vs-label">Fill light color</label>
        <input type="color"
          value={s.glbFillColor ?? '#ffffff'}
          onChange={(e) => set('glbFillColor', e.target.value)} />
      </div>

      <div className="vs-row">
        <label className="vs-label">Shadow map size</label>
        <select className="vs-select"
          value={s.glbShadowMapSize ?? 1024}
          onChange={(e) => set('glbShadowMapSize', Number(e.target.value))}>
          <option value={512}>512</option>
          <option value={1024}>1024</option>
          <option value={2048}>2048</option>
          <option value={4096}>4096</option>
        </select>
      </div>

      <div className="vs-row">
        <label className="vs-label">Shadow softness</label>
        <div className="vs-slider-wrap">
          <input type="range" min="0" max="10" step="0.5"
            value={s.glbShadowRadius ?? 1}
            onChange={(e) => set('glbShadowRadius', Number(e.target.value))} />
          <span className="vs-value">{s.glbShadowRadius ?? 1}</span>
        </div>
      </div>

      {/* ── Fog ── */}
      <p className="vs-group-label" style={{ marginTop: 16 }}>Fog</p>

      <div className="vs-row">
        <label className="vs-label">Enable fog</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbFogEnabled ?? false}
            onChange={(e) => set('glbFogEnabled', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      {s.glbFogEnabled && (
        <>
          <div className="vs-row">
            <label className="vs-label">Fog type</label>
            <select className="vs-select"
              value={s.glbFogType ?? 'exp2'}
              onChange={(e) => set('glbFogType', e.target.value)}>
              <option value="exp2">Exponential</option>
              <option value="linear">Linear</option>
            </select>
          </div>
          <div className="vs-row">
            <label className="vs-label">Fog color</label>
            <input type="color"
              value={s.glbFogColor ?? '#ffffff'}
              onChange={(e) => set('glbFogColor', e.target.value)} />
          </div>
          {s.glbFogType === 'linear' ? (
            <>
              <div className="vs-row">
                <label className="vs-label">Near</label>
                <input className="field-input inline" type="number" step="0.5"
                  value={s.glbFogNear ?? 1}
                  onChange={(e) => set('glbFogNear', Number(e.target.value) || 0)} />
              </div>
              <div className="vs-row">
                <label className="vs-label">Far</label>
                <input className="field-input inline" type="number" step="1"
                  value={s.glbFogFar ?? 50}
                  onChange={(e) => set('glbFogFar', Number(e.target.value) || 0)} />
              </div>
            </>
          ) : (
            <div className="vs-row">
              <label className="vs-label">Density</label>
              <div className="vs-slider-wrap">
                <input type="range" min="0" max="0.3" step="0.005"
                  value={s.glbFogDensity ?? 0.02}
                  onChange={(e) => set('glbFogDensity', Number(e.target.value))} />
                <span className="vs-value">{s.glbFogDensity ?? 0.02}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Render mode ── */}
      <p className="vs-group-label" style={{ marginTop: 16 }}>Render mode</p>

      <div className="vs-row">
        <label className="vs-label">Mode</label>
        <select className="vs-select"
          value={s.glbRenderMode ?? 'solid'}
          onChange={(e) => set('glbRenderMode', e.target.value)}>
          <option value="solid">Solid</option>
          <option value="wireframe">Wireframe</option>
          <option value="xray">X-ray</option>
        </select>
      </div>

      {s.glbRenderMode === 'xray' && (
        <div className="vs-row">
          <label className="vs-label">X-ray opacity</label>
          <div className="vs-slider-wrap">
            <input type="range" min="0.05" max="1" step="0.05"
              value={s.glbXrayOpacity ?? 0.35}
              onChange={(e) => set('glbXrayOpacity', Number(e.target.value))} />
            <span className="vs-value">{s.glbXrayOpacity ?? 0.35}</span>
          </div>
        </div>
      )}

      <div className="vs-row">
        <label className="vs-label">Flat shading</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbFlatShading ?? false}
            onChange={(e) => set('glbFlatShading', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      {/* ── UX overlays ── */}
      <p className="vs-group-label" style={{ marginTop: 16 }}>Overlays &amp; cursor</p>

      <div className="vs-row">
        <label className="vs-label">FPS overlay</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbShowFps ?? false}
            onChange={(e) => set('glbShowFps', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      <div className="vs-row">
        <label className="vs-label">Screenshot button</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.glbShowScreenshotButton ?? false}
            onChange={(e) => set('glbShowScreenshotButton', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      <div className="vs-row">
        <label className="vs-label">Cursor style</label>
        <select className="vs-select"
          value={s.glbCursorStyle ?? 'grab'}
          onChange={(e) => set('glbCursorStyle', e.target.value)}>
          <option value="default">Default</option>
          <option value="grab">Grab</option>
          <option value="pointer">Pointer</option>
          <option value="crosshair">Crosshair</option>
          <option value="move">Move</option>
        </select>
      </div>

      {/* ── Panel behaviour ── */}
      <p className="vs-group-label" style={{ marginTop: 16 }}>Panel behaviour</p>

      <div className="vs-row">
        <label className="vs-label" title="Show all colour + part options immediately, without progressive disclosure gates.">Expand all options</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.expandAllOptions ?? false}
            onChange={(e) => set('expandAllOptions', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      <div className="vs-row">
        <label className="vs-label" title="Keep the 3D viewer mounted when switching variants — smoother variant swap, camera preserved.">Keep viewer mounted on variant switch</label>
        <label className="vs-toggle">
          <input type="checkbox" checked={s.keepViewerMounted ?? false}
            onChange={(e) => set('keepViewerMounted', e.target.checked)} />
          <span className="vs-toggle-track" />
        </label>
      </div>

      {/* ── Animation ── */}
      <p className="vs-group-label" style={{ marginTop: 16 }}>Animation</p>

      <div className="vs-row">
        <label className="vs-label">Crossfade (s)</label>
        <div className="vs-slider-wrap">
          <input type="range" min="0" max="3" step="0.1"
            value={s.glbAnimationCrossfade ?? 0}
            onChange={(e) => set('glbAnimationCrossfade', Number(e.target.value))} />
          <span className="vs-value">{s.glbAnimationCrossfade ?? 0}s</span>
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
        <label className="vs-label">Webhook URL</label>
        <input className="field-input inline" type="url"
          value={orderForm.webhookUrl ?? ''}
          placeholder="https://your-server.example.com/orders"
          onChange={(e) => onChange({ ...orderForm, webhookUrl: e.target.value })} />
      </div>
      <div className="vs-row">
        <label className="vs-label">Webhook secret</label>
        <input className="field-input inline" type="text"
          value={orderForm.webhookSecret ?? ''}
          placeholder="optional — enables HMAC signature"
          onChange={(e) => onChange({ ...orderForm, webhookSecret: e.target.value })} />
      </div>
      <p className="builder-hint" style={{ fontSize: 11, marginTop: -6, marginBottom: 8 }}>
        Server-to-server POST with the full order payload. Two events per order: <code>orderCreated</code> immediately, then <code>orderSnapshotReady</code> when the snapshot uploads.
        If a secret is set, requests include an <code>x-glbc-signature: sha256=&lt;hex&gt;</code> header — verify by HMAC-SHA256 of the raw body with the secret.
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

// ── Custom view editor ────────────────────────────────────────────

function CustomViewEditor({ view, onChange, onDelete, onMoveUp, onMoveDown }) {
  return (
    <div className="variant-block">
      <div className="variant-block-header">
        <input className="field-input inline" value={view.label ?? ''} placeholder="Tab label"
          onChange={(e) => onChange({ ...view, label: e.target.value })} />
        <select className="vs-select" value={view.type ?? 'iframe'}
          onChange={(e) => onChange({ ...view, type: e.target.value })}>
          <option value="iframe">iframe (external URL)</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="html">Raw HTML</option>
        </select>
        {onMoveUp && <button className="btn-icon" onClick={onMoveUp} title="Move up">↑</button>}
        {onMoveDown && <button className="btn-icon" onClick={onMoveDown} title="Move down">↓</button>}
        <button className="btn-icon-delete" onClick={onDelete} title="Delete">✕</button>
      </div>
      <div style={{ padding: 12 }}>
        {view.type === 'html' ? (
          <textarea className="field-input" style={{ minHeight: 120, fontFamily: 'monospace', fontSize: 12 }}
            value={view.html ?? ''}
            placeholder="<div>Hello</div>"
            onChange={(e) => onChange({ ...view, html: e.target.value })} />
        ) : (
          <div className="vs-row">
            <label className="vs-label">URL</label>
            <input className="field-input inline" type="url"
              value={view.url ?? ''}
              placeholder={
                view.type === 'video' ? 'https://example.com/video.mp4' :
                view.type === 'image' ? 'https://example.com/image.jpg' :
                'https://example.com/page'
              }
              onChange={(e) => onChange({ ...view, url: e.target.value })} />
          </div>
        )}
        {view.type === 'iframe' && (
          <p className="builder-hint" style={{ fontSize: 11 }}>
            Target site must allow embedding (X-Frame-Options / CSP frame-ancestors).
          </p>
        )}
      </div>
    </div>
  )
}

// ── Revision panel ─────────────────────────────────────────────────

function RevisionPanel({ configuratorId, ownerId, onRestore, onClose }) {
  const [revisions, setRevisions] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [restoring, setRestoring] = useState(null)

  useEffect(() => {
    getRevisions(configuratorId, ownerId)
      .then(setRevisions)
      .catch((err) => { console.error('getRevisions:', err); setLoadError(err.message ?? 'Failed to load') })
  }, [configuratorId, ownerId])

  function formatDate(ts) {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  async function handleRestore(rev) {
    if (!confirm(`Restore to save from ${formatDate(rev.savedAt)}? Current changes will be overwritten.`)) return
    setRestoring(rev.id)
    await onRestore(rev.data)
    setRestoring(null)
  }

  return (
    <div className="rev-backdrop" onClick={onClose}>
      <div className="rev-panel" onClick={(e) => e.stopPropagation()}>
        <div className="rev-header">
          <div>
            <div className="rev-title">Revision history</div>
            <div className="rev-sub">Manual saves only · Max 30 kept</div>
          </div>
          <button className="rev-close" onClick={onClose}>✕</button>
        </div>

        <div className="rev-list">
          {revisions === null && !loadError && <div className="rev-loading">Loading…</div>}
          {loadError && <div className="rev-empty" style={{ color: '#dc2626' }}>Error: {loadError}</div>}
          {revisions?.length === 0 && (
            <div className="rev-empty">
              No saved revisions yet. Click <strong>Save</strong> in the toolbar to create one.
            </div>
          )}
          {revisions?.map((rev, i) => (
            <div key={rev.id} className="rev-item">
              <div className="rev-item-info">
                <div className="rev-item-name">{rev.name || 'Untitled'}</div>
                <div className="rev-item-meta">
                  {formatDate(rev.savedAt)}
                  {rev.variantCount != null && <span className="rev-item-count"> · {rev.variantCount} variant{rev.variantCount !== 1 ? 's' : ''}</span>}
                  {i === 0 && <span className="rev-item-badge">latest</span>}
                </div>
              </div>
              <button
                className="btn-ghost btn-sm rev-restore-btn"
                disabled={restoring === rev.id}
                onClick={() => handleRestore(rev)}
              >
                {restoring === rev.id ? '…' : 'Restore'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sidebar accordion ──────────────────────────────────────────────

function BuilderAccordion({ id, title, onTitleChange, badge, right, defaultOpen = true, children }) {
  const storageKey = id ? `builder-acc-${id}` : null
  const [open, setOpen] = useState(() => {
    if (!storageKey) return defaultOpen
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored === null) return defaultOpen
      return stored === '1'
    } catch { return defaultOpen }
  })
  useEffect(() => {
    if (!storageKey) return
    try { localStorage.setItem(storageKey, open ? '1' : '0') } catch { /* ignore */ }
  }, [open, storageKey])
  useEffect(() => {
    function handler(e) { setOpen(!!e.detail) }
    window.addEventListener('bacc-set-all', handler)
    return () => window.removeEventListener('bacc-set-all', handler)
  }, [])
  return (
    <div className="bacc">
      <div className="bacc-header" onClick={() => setOpen((v) => !v)} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v) } }}>
        <span className="bacc-toggle" aria-label={open ? 'Collapse' : 'Expand'}>
          <span className={`bacc-chevron${open ? ' open' : ''}`} />
        </span>
        {onTitleChange
          ? <input className="bacc-title-input" value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()} />
          : <span className="bacc-title">{title}</span>
        }
        {badge > 0 && <span className="bacc-badge">{badge}</span>}
        {right && <div className="bacc-right" onClick={(e) => e.stopPropagation()}>{right}</div>}
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

// ── Variant groups manager ─────────────────────────────────────────

function VariantGroupsManager({ groups, variants, onChange }) {
  function addGroup() {
    onChange([...groups, { id: uid(), label: 'Group', dependsOnVariantId: null }])
  }

  function updateGroup(id, updated) {
    onChange(groups.map((g) => g.id === id ? updated : g))
  }

  function deleteGroup(id) {
    onChange(groups.filter((g) => g.id !== id))
  }

  if (groups.length === 0) {
    return (
      <div className="groups-empty-row">
        <button className="btn-add" onClick={addGroup}>+ Add group</button>
        <span className="builder-hint" style={{ margin: 0 }}>Groups organize variants into named sections (e.g. "Color", "Size").</span>
      </div>
    )
  }

  // All variants except those in this group are candidates for dependency
  const allVariants = variants

  return (
    <div className="groups-manager">
      {groups.map((g) => (
        <div key={g.id} className="group-row">
          <input className="field-input inline group-label-input" placeholder="Group name" value={g.label}
            onChange={(e) => updateGroup(g.id, { ...g, label: e.target.value })} />
          <select className="vs-select group-dep-select"
            value={g.dependsOnVariantId ?? ''}
            onChange={(e) => updateGroup(g.id, { ...g, dependsOnVariantId: e.target.value || null })}>
            <option value="">Always visible</option>
            <optgroup label="Show only when selected:">
              {allVariants.map((v) => (
                <option key={v.id} value={v.id}>{v.label || 'Unnamed variant'}</option>
              ))}
            </optgroup>
          </select>
          <button className="btn-icon-delete" onClick={() => deleteGroup(g.id)}>✕</button>
        </div>
      ))}
      <button className="btn-add" style={{ marginTop: 6 }} onClick={addGroup}>+ Add group</button>
    </div>
  )
}

// ── Hotspots editor ────────────────────────────────────────────────

function HotspotsEditor({ hotspots, onChange, placingId, onPlaceId }) {
  function addHotspot() {
    onChange([...hotspots, { id: uid(), label: 'Feature', description: '', x: 50, y: 50 }])
  }

  function updateHotspot(id, updated) {
    onChange(hotspots.map((h) => h.id === id ? updated : h))
  }

  return (
    <div className="hotspots-editor">
      {hotspots.length === 0 && (
        <p className="builder-hint">Hotspots appear as clickable pins on the viewer, revealing a label and description.</p>
      )}
      {hotspots.map((hs) => (
        <div key={hs.id} className="hotspot-block">
          <div className="hotspot-block-header">
            <input className="field-input inline" placeholder="Label"
              value={hs.label}
              onChange={(e) => updateHotspot(hs.id, { ...hs, label: e.target.value })} />
            <button
              className={`btn-ghost btn-sm hotspot-place-btn${placingId === hs.id ? ' active' : ''}`}
              onClick={() => onPlaceId(placingId === hs.id ? null : hs.id)}
              title="Click the preview to position this hotspot">
              {placingId === hs.id ? '✓ Click preview' : 'Place'}
            </button>
            <button className="btn-icon-delete" onClick={() => onChange(hotspots.filter((h) => h.id !== hs.id))}>✕</button>
          </div>
          <div className="vs-row">
            <label className="vs-label">Description</label>
            <input className="field-input inline" placeholder="Optional description shown on click"
              value={hs.description ?? ''}
              onChange={(e) => updateHotspot(hs.id, { ...hs, description: e.target.value })} />
          </div>
          <div className="vs-row">
            <label className="vs-label">Position</label>
            <span className="builder-hint" style={{ margin: 0, fontSize: 11 }}>
              X: {hs.x ?? 50}% · Y: {hs.y ?? 50}%
              {placingId === hs.id && ' — click the preview to reposition'}
            </span>
          </div>
        </div>
      ))}
      <button className="btn-add" onClick={addHotspot}>+ Add hotspot</button>
    </div>
  )
}

// ── Watermark editor ───────────────────────────────────────────────

function WatermarkEditor({ watermark, uid: userUid, onChange }) {
  const [showPicker, setShowPicker] = useState(false)
  const wm = watermark ?? DEFAULT_WATERMARK

  return (
    <div className="watermark-editor">
      <div className="vs-row">
        <label className="vs-label">Position</label>
        <select className="vs-select" value={wm.position ?? 'bottom-right'}
          onChange={(e) => onChange({ ...wm, position: e.target.value })}>
          <option value="top-left">Top left</option>
          <option value="top-right">Top right</option>
          <option value="bottom-left">Bottom left</option>
          <option value="bottom-right">Bottom right</option>
        </select>
      </div>
      <div className="vs-row">
        <label className="vs-label">Opacity</label>
        <div className="vs-slider-wrap">
          <input type="range" min="10" max="100" step="5"
            value={wm.opacity ?? 80}
            onChange={(e) => onChange({ ...wm, opacity: Number(e.target.value) })} />
          <span className="vs-value">{wm.opacity ?? 80}%</span>
        </div>
      </div>
      <div className="vs-row">
        <label className="vs-label">Size</label>
        <div className="vs-slider-wrap">
          <input type="range" min="5" max="40" step="1"
            value={wm.size ?? 15}
            onChange={(e) => onChange({ ...wm, size: Number(e.target.value) })} />
          <span className="vs-value">{wm.size ?? 15}%</span>
        </div>
      </div>
      <div className="upload-section">
        {wm.imageUrl ? (
          <div className="watermark-preview-row">
            <img src={wm.imageUrl} className="watermark-thumb" alt="" />
            <button className="btn-text-danger" onClick={() => setShowPicker(true)}>Change</button>
            <button className="btn-text-danger" onClick={async () => {
              if (wm.imagePath) await deleteFile(wm.imagePath)
              onChange({ ...wm, imageUrl: null, imagePath: null })
            }}>Remove</button>
          </div>
        ) : (
          <button className="btn-upload" onClick={() => setShowPicker(true)}>
            Choose logo / watermark image
          </button>
        )}
      </div>
      {showPicker && (
        <MediaPickerModal uid={userUid} accept="image/*"
          onSelect={({ url, storagePath }) => {
            setShowPicker(false)
            onChange({ ...wm, imageUrl: url, imagePath: storagePath })
          }}
          onClose={() => setShowPicker(false)} />
      )}
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
  const [variantGroups, setVariantGroups]     = useState([])
  const [hotspots, setHotspots]               = useState([])
  const [watermark, setWatermark]             = useState(DEFAULT_WATERMARK)
  const [customViews, setCustomViews]         = useState([])
  const [hotspotPlaceId, setHotspotPlaceId]   = useState(null)
  const [published, setPublished]             = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [dirty, setDirty]             = useState(false)
  const [saveError, setSaveError]     = useState(null)
  const [loading, setLoading]         = useState(true)
  const [loadError, setLoadError]     = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const autoSaveTimer             = useRef(null)
  const initialLoad               = useRef(true)

  const historyRef  = useRef([])
  const historyIdx  = useRef(-1)
  const skipHistory = useRef(false)
  const [historyLen, setHistoryLen] = useState(0)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [inviteOpen, setInviteOpen]   = useState(false)
  const [healthOpen, setHealthOpen]   = useState(false)
  const [embedOpen, setEmbedOpen]     = useState(false)

  const [settingsWidth, setSettingsWidth] = useState(() => {
    try {
      const stored = localStorage.getItem('builder-settings-width')
      const n = stored ? parseInt(stored, 10) : NaN
      if (Number.isFinite(n) && n >= 280 && n <= 720) return n
    } catch { /* ignore */ }
    return 400
  })
  const resizing    = useRef(false)
  const resizeStart = useRef(null)

  useEffect(() => {
    let active = true
    getConfigurator(id).then((cfg) => {
      if (!active) return
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
      setVariantGroups(cfg.variantGroups ?? [])
      setHotspots(cfg.hotspots ?? [])
      setWatermark({ ...DEFAULT_WATERMARK, ...(cfg.watermark ?? {}) })
      setCustomViews(cfg.customViews ?? [])
      setPublished(cfg.published ?? false)
      setLoading(false)
    }).catch((err) => {
      if (!active) return
      console.error('Builder load failed:', err)
      setLoadError('Failed to load configurator — check your connection and try again.')
      setLoading(false)
    })
    return () => { active = false }
  }, [id, navigate])

  const doSave = useCallback(async (cfg, opts = {}) => {
    setSaving(true); setSaveError(null)
    try {
      const payload = stripUndefined(cfg)
      await saveConfigurator(id, payload)
      if (opts.createRevision) {
        saveRevision(id, opts.ownerId, payload).catch((err) => console.error('saveRevision:', err))
      }
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
    const cfg = { name, variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm, theme, darkMode, themeColors, variantGroups, hotspots, watermark, customViews }
    autoSaveTimer.current = setTimeout(() => doSave(cfg), 1500)
    return () => clearTimeout(autoSaveTimer.current)
  }, [name, variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm, theme, darkMode, themeColors, variantGroups, hotspots, watermark, customViews, loading, doSave])

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
    setVariantGroups(snap.variantGroups ?? [])
    setHotspots(snap.hotspots ?? [])
    setWatermark(snap.watermark ?? DEFAULT_WATERMARK)
    setCustomViews(snap.customViews ?? [])
    setHistoryLen(historyRef.current.length)
  }

  async function handleRestoreRevision(revData) {
    const d = { ...DEFAULT_VIEWER_SETTINGS, ...(revData.viewerSettings ?? {}) }
    setName(revData.name ?? '')
    applySnapshot({
      variants:       revData.variants      ?? [],
      interiors:      revData.interiors     ?? [],
      background:     revData.background    ?? DEFAULT_BG,
      viewerSettings: d,
      exteriorLabel:  revData.exteriorLabel ?? 'Exterior',
      interiorLabel:  revData.interiorLabel ?? 'Interior',
      orderForm:      { ...DEFAULT_ORDER_FORM, ...(revData.orderForm ?? {}), fields: revData.orderForm?.fields ?? DEFAULT_ORDER_FORM.fields },
      theme:          revData.theme         ?? 'minimal',
      darkMode:       revData.darkMode      ?? false,
      themeColors:    revData.themeColors   ?? {},
    })
    setShowHistory(false)
    // Auto-save the restored state so it persists
    setTimeout(() => handleSave(), 100)
  }

  useEffect(() => {
    if (loading) return
    if (skipHistory.current) { skipHistory.current = false; return }
    const snapshot = { variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm, theme, darkMode, themeColors, variantGroups, hotspots, watermark, customViews }
    historyRef.current = [...historyRef.current.slice(0, historyIdx.current + 1), snapshot].slice(-50)
    historyIdx.current = historyRef.current.length - 1
    setHistoryLen(historyRef.current.length)
  }, [variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm, theme, darkMode, themeColors, variantGroups, hotspots, watermark, customViews])

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
      const next = Math.max(280, Math.min(720, resizeStart.current.w + delta))
      setSettingsWidth(next)
      try { localStorage.setItem('builder-settings-width', String(next)) } catch { /* ignore */ }
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
    const cfg = { name, variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm, theme, darkMode, themeColors, variantGroups, hotspots, watermark, customViews }
    await doSave(cfg, { createRevision: true, ownerId: user.uid })
  }

  async function handlePublish() {
    const subOk = ['trial', 'active'].includes(profile?.subscriptionStatus)
    if (!subOk) { navigate('/billing'); return }
    if (!published) {
      // Gate publish on health check — errors block, warnings prompt.
      const { errors, warnings } = checkConfigHealth({ variants, variantGroups, interiors, hotspots, orderForm, translations: config.translations ?? {} })
      if (errors.length > 0) {
        setHealthOpen(true)
        alert(`Cannot publish: ${errors.length} error${errors.length === 1 ? '' : 's'} found. Fix them first.`)
        return
      }
      if (warnings.length > 0) {
        const ok = confirm(`Health check found ${warnings.length} warning${warnings.length === 1 ? '' : 's'}. Publish anyway?`)
        if (!ok) { setHealthOpen(true); return }
      }
      const limit = getEmbedLimit(profile)
      const count = await getPublishedCount(user.uid)
      if (count >= limit) { navigate('/billing'); return }
    }
    const cfg = { name, variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm, theme, darkMode, themeColors, variantGroups, hotspots, watermark, customViews }
    await saveConfigurator(id, stripUndefined(cfg))
    await publishConfigurator(id, !published)
    setPublished((v) => !v)
  }

  if (loading) return <div className="page-loading">Loading builder…</div>
  if (loadError) return <div className="page-loading">{loadError}</div>

  const config = { variants, interiors, background, viewerSettings, exteriorLabel, interiorLabel, orderForm, theme, darkMode, themeColors, variantGroups, hotspots, watermark, customViews }

  function handleClaudeTool(name, input) {
    switch (name) {
      case 'add_variant': {
        const newVariant = {
          id: uid(),
          label: input.label,
          swatch: input.swatch || '#888888',
          swatchType: 'color',
          price: input.price ?? null,
          type: input.type || 'spinner',
          frames: [],
          frameCount: 0,
          glbLayers: [],
        }
        setVariants((v) => [...v, newVariant])
        return
      }
      case 'update_variant': {
        const allowed = ['label', 'swatch', 'price', 'type']
        const patch = Object.fromEntries(
          Object.entries(input.fields ?? {}).filter(([k]) => allowed.includes(k))
        )
        setVariants((v) => v.map((x) => x.id === input.variantId ? { ...x, ...patch } : x))
        return
      }
      case 'delete_variant':
        setVariants((v) => v.filter((x) => x.id !== input.variantId))
        return
      case 'set_background': {
        const patch = { type: input.type }
        if (input.color) patch.color = input.color
        setBackground((b) => ({ ...b, ...patch }))
        return
      }
      case 'set_theme':
        if (input.theme) setTheme(input.theme)
        if (typeof input.darkMode === 'boolean') setDarkMode(input.darkMode)
        return
      case 'set_viewer_setting':
        setViewerSettings((s) => ({ ...s, [input.key]: input.value }))
        return
      case 'set_order_form_enabled':
        setOrderForm((o) => ({ ...o, enabled: !!input.enabled }))
        return
      case 'set_labels':
        if (input.exteriorLabel) setExteriorLabel(input.exteriorLabel)
        if (input.interiorLabel) setInteriorLabel(input.interiorLabel)
        return
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  }

  return (
    <div className="builder">
      <div className="builder-inner">
        <div className="builder-topbar">
          <Link to="/dashboard" className="btn-ghost btn-sm builder-back-btn">← Back</Link>
          <input className="builder-name-input" value={name}
            onChange={(e) => setName(e.target.value)} placeholder="Configurator name" />
          <div className="builder-actions">
            {saveError && <span className="builder-save-error">{saveError}</span>}
            <button className="btn-ghost btn-sm builder-desktop-only" title="Undo (Ctrl+Z)"
              onClick={() => { if (historyIdx.current > 0) { historyIdx.current -= 1; applySnapshot(historyRef.current[historyIdx.current]) } }}
              disabled={historyIdx.current <= 0}>↩</button>
            <button className="btn-ghost btn-sm builder-desktop-only" title="Redo (Ctrl+Y)"
              onClick={() => { if (historyIdx.current < historyRef.current.length - 1) { historyIdx.current += 1; applySnapshot(historyRef.current[historyIdx.current]) } }}
              disabled={historyIdx.current >= historyLen - 1}>↪</button>
            <button className="btn-ghost btn-sm" onClick={handleSave} disabled={saving}>
              {saved ? '✓' : saving ? '…' : dirty ? 'Save*' : 'Save'}
            </button>
            <button className="btn-ghost btn-sm builder-desktop-only" title="Revision history" onClick={() => setShowHistory(true)}>
              History
            </button>
            <button className="btn-ghost btn-sm builder-desktop-only" onClick={() => setPreviewOpen(true)}>
              Preview
            </button>
            <Link to={`/builder/${id}/translations`} className="btn-ghost btn-sm builder-desktop-only">
              Translations
            </Link>
            <Link to={`/builder/${id}/api-demo`} className="btn-ghost btn-sm builder-desktop-only">
              API Demo
            </Link>
            <button className="btn-ghost btn-sm builder-desktop-only" onClick={() => setHealthOpen(true)} title="Config health check">
              Health
            </button>
            <button className="btn-ghost btn-sm builder-desktop-only" onClick={() => setEmbedOpen(true)} title="Embed code">
              Embed
            </button>
            <button className="btn-ghost btn-sm builder-desktop-only" onClick={() => setInviteOpen(true)}>
              Invite
            </button>
            <button className={`builder-desktop-only ${published ? 'btn-danger' : 'btn-primary'}`} onClick={handlePublish}>
              {published ? 'Unpublish' : 'Publish'}
            </button>

            {/* Mobile three-dots menu */}
            <div className="builder-mobile-menu">
              <button className="btn-ghost btn-sm builder-mobile-menu-btn" onClick={() => setMobileMenuOpen((v) => !v)}>
                •••
              </button>
              {mobileMenuOpen && (
                <>
                  <div className="builder-mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
                  <div className="builder-mobile-dropdown">
                    <button className="builder-mobile-dropdown-item" title="Undo"
                      onClick={() => { setMobileMenuOpen(false); if (historyIdx.current > 0) { historyIdx.current -= 1; applySnapshot(historyRef.current[historyIdx.current]) } }}
                      disabled={historyIdx.current <= 0}>↩ Undo</button>
                    <button className="builder-mobile-dropdown-item" title="Redo"
                      onClick={() => { setMobileMenuOpen(false); if (historyIdx.current < historyRef.current.length - 1) { historyIdx.current += 1; applySnapshot(historyRef.current[historyIdx.current]) } }}
                      disabled={historyIdx.current >= historyLen - 1}>↪ Redo</button>
                    <button className="builder-mobile-dropdown-item" onClick={() => { setMobileMenuOpen(false); setShowHistory(true) }}>
                      History
                    </button>
                    <button className="builder-mobile-dropdown-item" onClick={() => { setMobileMenuOpen(false); setPreviewOpen(true) }}>
                      Preview
                    </button>
                    <button className="builder-mobile-dropdown-item" onClick={() => { setMobileMenuOpen(false); setHealthOpen(true) }}>
                      Health check
                    </button>
                    <button className="builder-mobile-dropdown-item" onClick={() => { setMobileMenuOpen(false); setEmbedOpen(true) }}>
                      Embed code
                    </button>
                    <button className="builder-mobile-dropdown-item" onClick={() => { setMobileMenuOpen(false); setInviteOpen(true) }}>
                      Invite collaborator
                    </button>
                    <div className="builder-mobile-dropdown-divider" />
                    <button className={`builder-mobile-dropdown-item ${published ? 'builder-mobile-dropdown-item--danger' : 'builder-mobile-dropdown-item--primary'}`}
                      onClick={() => { setMobileMenuOpen(false); handlePublish() }}>
                      {published ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      <div className="builder-body">
        <aside className="builder-settings" style={{ width: settingsWidth, minWidth: settingsWidth }}>

          <div className="builder-settings-toolbar">
            <button className="builder-settings-toolbar-btn"
              onClick={() => window.dispatchEvent(new CustomEvent('bacc-set-all', { detail: true }))}>
              Expand all
            </button>
            <button className="builder-settings-toolbar-btn"
              onClick={() => window.dispatchEvent(new CustomEvent('bacc-set-all', { detail: false }))}>
              Collapse all
            </button>
          </div>

          {/* Exterior variants */}
          <BuilderAccordion
            id="exterior"
            title={exteriorLabel}
            onTitleChange={setExteriorLabel}
            badge={variants.length}
            right={
              <button className="btn-add" onClick={() =>
                setVariants((v) => [...v, { id: uid(), label: 'New Variant', swatch: '#888888', swatchType: 'color', price: null, type: 'spinner', frames: [], frameCount: 0, glbLayers: [] }])
              }>+ Add</button>
            }
          >
            <VariantGroupsManager
              groups={variantGroups}
              variants={variants}
              onChange={setVariantGroups}
            />
            {variants.length === 0
              ? <p className="builder-hint">Add a variant with rotation images or a 3D model.</p>
              : variants.map((v, i) => (
                <VariantEditor key={v.id} variant={v} uid={user.uid} variantGroups={variantGroups}
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
            id="interior"
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

          {/* Custom views (iframe / image / video / html) */}
          <BuilderAccordion
            id="customViews"
            title="Custom views"
            badge={customViews.length}
            defaultOpen={customViews.length > 0}
            right={
              <button className="btn-add" onClick={() =>
                setCustomViews((v) => [...v, { id: uid(), label: 'New view', type: 'iframe', url: '' }])
              }>+ Add</button>
            }
          >
            {customViews.length === 0
              ? <p className="builder-hint">Add extra tabs — iframe (external page), image, video, or raw HTML.</p>
              : customViews.map((cv, i) => (
                <CustomViewEditor key={cv.id} view={cv}
                  onChange={(u) => setCustomViews((vs) => vs.map((x) => x.id === cv.id ? u : x))}
                  onDelete={() => setCustomViews((vs) => vs.filter((x) => x.id !== cv.id))}
                  onMoveUp={i > 0 ? () => setCustomViews((vs) => { const a = [...vs]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a }) : null}
                  onMoveDown={i < customViews.length - 1 ? () => setCustomViews((vs) => { const a = [...vs]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a }) : null}
                />
              ))
            }
          </BuilderAccordion>

          {/* Background */}
          <BuilderAccordion id="background" title="Background" defaultOpen={false}>
            <BackgroundEditor bg={background} uid={user.uid} onChange={setBackground} />
          </BuilderAccordion>

          {/* Viewer settings */}
          <BuilderAccordion id="viewer" title="Viewer settings" defaultOpen={false}>
            <ViewerSettingsEditor settings={viewerSettings} onChange={setViewerSettings} />
          </BuilderAccordion>

          {/* Order form */}
          <BuilderAccordion
            id="order"
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
          <BuilderAccordion id="style" title="Style" defaultOpen={false}>
            <StyleEditor
              theme={theme}
              darkMode={darkMode}
              themeColors={themeColors}
              onChange={({ theme: t, darkMode: dm }) => { setTheme(t); setDarkMode(dm) }}
              onColorsChange={setThemeColors}
            />
          </BuilderAccordion>

          {/* Hotspots */}
          <BuilderAccordion id="hotspots" title="Hotspots" defaultOpen={false} badge={hotspots.length}>
            <HotspotsEditor
              hotspots={hotspots}
              onChange={setHotspots}
              placingId={hotspotPlaceId}
              onPlaceId={setHotspotPlaceId}
            />
          </BuilderAccordion>

          {/* Watermark */}
          <BuilderAccordion
            id="watermark"
            title="Watermark"
            defaultOpen={false}
            right={
              <label className="vs-toggle">
                <input type="checkbox" checked={watermark.enabled}
                  onChange={(e) => setWatermark({ ...watermark, enabled: e.target.checked })} />
                <span className="vs-toggle-track" />
              </label>
            }
          >
            {watermark.enabled
              ? <WatermarkEditor watermark={watermark} uid={user.uid} onChange={setWatermark} />
              : <p className="builder-hint">Enable to overlay a logo or watermark on the viewer.</p>
            }
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
        <div className={`builder-preview${hotspotPlaceId ? ' hotspot-placing' : ''}`}>
          {variants.length === 0 && interiors.length === 0
            ? <div className="preview-empty">Add variants or interiors to preview</div>
            : <ConfiguratorRenderer
                config={config}
                hotspotPlaceId={hotspotPlaceId}
                onHotspotPlace={(x, y) => {
                  setHotspots((hs) => hs.map((h) => h.id === hotspotPlaceId ? { ...h, x, y } : h))
                  setHotspotPlaceId(null)
                }}
              />
          }
        </div>
      </div>
      </div>

      {showHistory && user?.uid && (
        <RevisionPanel
          configuratorId={id}
          ownerId={user.uid}
          onRestore={handleRestoreRevision}
          onClose={() => setShowHistory(false)}
        />
      )}

      {previewOpen && (
        <div className="builder-preview-modal" onClick={() => setPreviewOpen(false)}>
          <div className="builder-preview-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div className="builder-preview-modal-header">
              <span className="builder-preview-modal-title">Preview</span>
              <button className="builder-preview-modal-close" onClick={() => setPreviewOpen(false)}>✕</button>
            </div>
            <iframe
              src={`/embed/${id}`}
              className="builder-preview-modal-iframe"
              title="Configurator preview"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {inviteOpen && user?.uid && (
        <InviteModal
          configuratorId={id}
          ownerUid={user.uid}
          ownerEmail={profile?.email ?? user.email ?? ''}
          onClose={() => setInviteOpen(false)}
        />
      )}

      {healthOpen && (
        <HealthCheckModal
          config={{ ...config, name, translations: config.translations ?? {} }}
          onClose={() => setHealthOpen(false)}
        />
      )}

      {embedOpen && (
        <EmbedCodeModal
          configuratorId={id}
          configName={name}
          published={published}
          translations={config.translations ?? {}}
          onClose={() => setEmbedOpen(false)}
        />
      )}

      <ClaudeChat config={{ ...config, name }} onApplyTool={handleClaudeTool} />
    </div>
  )
}

function InviteModal({ configuratorId, ownerUid, ownerEmail, onClose }) {
  const [email, setEmail]       = useState('')
  const [working, setWorking]   = useState(false)
  const [link, setLink]         = useState(null)
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)

  async function handleGenerate(e) {
    e.preventDefault()
    if (!email.trim()) return
    setWorking(true); setError('')
    try {
      const code = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
      await createTeamInvite(ownerUid, ownerEmail, email.trim(), code, configuratorId)
      setLink(`${window.location.origin}/join/${code}`)
    } catch (err) {
      setError(err.message || 'Failed to create invite')
    } finally {
      setWorking(false)
    }
  }

  function copy() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="builder-preview-modal" onClick={onClose}>
      <div className="builder-preview-modal-inner" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, height: 'auto' }}>
        <div className="builder-preview-modal-header">
          <span className="builder-preview-modal-title">Invite collaborator to this project</span>
          <button className="builder-preview-modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 24 }}>
          <p className="builder-hint" style={{ marginTop: 0 }}>
            They will get edit access to this configurator only. An email with the invite link will be sent automatically.
          </p>
          <form onSubmit={handleGenerate} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <input
              className="field-input"
              type="email"
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={working || link}
              style={{ flex: 1 }}
            />
            <button className="btn-primary" type="submit" disabled={working || link}>
              {working ? 'Generating…' : 'Generate link'}
            </button>
          </form>
          {error && <div className="upload-error" style={{ marginTop: 12 }}>{error}</div>}
          {link && (
            <div className="team-invite-link-box" style={{ marginTop: 16 }}>
              <code className="team-invite-link">{link}</code>
              <button className="btn-ghost btn-sm" onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
              <p className="team-invite-hint" style={{ marginTop: 8 }}>
                Email sent to {email || 'invitee'}. They can also use the link directly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Config health check modal ──────────────────────────────────────

function HealthCheckModal({ config, onClose }) {
  const { errors, warnings } = checkConfigHealth(config)
  const empty = errors.length === 0 && warnings.length === 0

  return (
    <div className="rev-backdrop" onClick={onClose}>
      <div className="rev-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="rev-header">
          <div>
            <div className="rev-title">Config health check</div>
            <div className="rev-sub">
              {empty
                ? 'No issues detected.'
                : `${errors.length} error${errors.length === 1 ? '' : 's'} · ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`}
            </div>
          </div>
          <button className="rev-close" onClick={onClose}>✕</button>
        </div>
        <div className="rev-list" style={{ padding: 12 }}>
          {empty && (
            <div className="rev-empty">
              ✓ Nothing to fix. Configurator looks healthy.
            </div>
          )}
          {errors.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>
                Errors — publish is blocked until resolved:
              </div>
              {errors.map((e, i) => (
                <div key={i} style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: 4, marginBottom: 4, fontSize: 12 }}>
                  <code style={{ fontSize: 10, color: '#991b1b' }}>{e.path}</code>
                  <div>{e.message}</div>
                </div>
              ))}
            </div>
          )}
          {warnings.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#b45309', marginBottom: 6 }}>
                Warnings — publish allowed but review recommended:
              </div>
              {warnings.map((w, i) => (
                <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '6px 10px', borderRadius: 4, marginBottom: 4, fontSize: 12 }}>
                  <code style={{ fontSize: 10, color: '#92400e' }}>{w.path}</code>
                  <div>{w.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Embed code generator modal ────────────────────────────────────

function EmbedCodeModal({ configuratorId, configName, published, translations, onClose }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://glbconfigurator.com'
  const [lang, setLang] = useState('')
  const [panel, setPanel] = useState('')
  const [width, setWidth] = useState('100%')
  const [height, setHeight] = useState('720')
  const [copied, setCopied] = useState(null)

  const params = new URLSearchParams()
  if (lang) params.set('lang', lang)
  if (panel) params.set('panel', panel)
  const qs = params.toString()
  const embedUrl = `${origin}/embed/${configuratorId}${qs ? '?' + qs : ''}`

  const iframeHtml = `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allow="xr-spatial-tracking" style="border:0;max-width:100%"></iframe>`

  const wpEmbed = `<!-- Paste inside a Custom HTML block -->
<div style="max-width:1200px;margin:0 auto">
  <iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allow="xr-spatial-tracking" style="border:0;width:100%"></iframe>
</div>`

  const listenerJs = `<script>
// Receive events from the embedded configurator
window.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data.type !== 'string' || !data.type.startsWith('glbc:')) return

  if (data.type === 'glbc:ready') {
    console.log('Configurator loaded', data.payload.name)
  }
  if (data.type === 'glbc:selectionChanged') {
    console.log('User picked:', data.payload.selection)
  }
  if (data.type === 'glbc:orderSubmitted') {
    console.log('Order:', data.payload.orderId, data.payload.formData)
    // Optionally: forward to your CRM / backend here
  }
})

// Send a selection into the iframe:
// document.querySelector('iframe').contentWindow.postMessage({
//   type: 'glbc:patchSelection',
//   payload: { selection: { color: 'Natural' } }
// }, '*')
</script>`

  function copy(key, text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200)
    })
  }

  const locales = Object.keys(translations)

  const sectionH = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginTop: 20, marginBottom: 8, fontWeight: 600 }
  const codeBox  = { background: '#1a1a1a', color: '#d1d5db', padding: 12, borderRadius: 6, fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }
  const urlBox   = { background: 'var(--bg)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }

  return (
    <div className="rev-backdrop" onClick={onClose}>
      <div className="rev-panel" onClick={(e) => e.stopPropagation()} style={{ width: 780, maxWidth: '100%' }}>
        <div className="rev-header">
          <div>
            <div className="rev-title">Embed code — {configName || 'Configurator'}</div>
            <div className="rev-sub">
              {published ? 'Configurator is published.' : '⚠ Configurator is NOT published yet — embed will show "unavailable".'}
            </div>
          </div>
          <button className="rev-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', minHeight: 0 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
            <div className="vs-row" style={{ margin: 0 }}>
              <label className="vs-label">Language</label>
              <select className="vs-select" value={lang} onChange={(e) => setLang(e.target.value)}>
                <option value="">(user picks in embed)</option>
                {locales.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div className="vs-row" style={{ margin: 0 }}>
              <label className="vs-label">Control panel</label>
              <select className="vs-select" value={panel} onChange={(e) => setPanel(e.target.value)}>
                <option value="">Visible</option>
                <option value="hidden">Hidden (?panel=hidden)</option>
              </select>
            </div>
            <div className="vs-row" style={{ margin: 0 }}>
              <label className="vs-label">Width</label>
              <input className="field-input inline" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="100% or 1024" />
            </div>
            <div className="vs-row" style={{ margin: 0 }}>
              <label className="vs-label">Height</label>
              <input className="field-input inline" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="720" />
            </div>
          </div>

          <h3 style={sectionH}>Direct URL</h3>
          <div style={urlBox}>{embedUrl}</div>
          <button className="btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => copy('url', embedUrl)}>
            {copied === 'url' ? '✓ Copied' : 'Copy URL'}
          </button>

          <h3 style={sectionH}>HTML iframe</h3>
          <pre style={codeBox}>{iframeHtml}</pre>
          <button className="btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => copy('html', iframeHtml)}>
            {copied === 'html' ? '✓ Copied' : 'Copy HTML'}
          </button>

          <h3 style={sectionH}>WordPress (Custom HTML block)</h3>
          <pre style={codeBox}>{wpEmbed}</pre>
          <button className="btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => copy('wp', wpEmbed)}>
            {copied === 'wp' ? '✓ Copied' : 'Copy WP block'}
          </button>

          <h3 style={sectionH}>JS event listener (optional)</h3>
          <p className="builder-hint" style={{ marginTop: -4, marginBottom: 8, fontSize: 11 }}>
            Paste alongside the iframe to receive glbc:ready / selectionChanged / orderSubmitted events.
          </p>
          <pre style={{ ...codeBox, maxHeight: 280, overflow: 'auto' }}>{listenerJs}</pre>
          <button className="btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => copy('js', listenerJs)}>
            {copied === 'js' ? '✓ Copied' : 'Copy listener JS'}
          </button>

        </div>
      </div>
    </div>
  )
}
