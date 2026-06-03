import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const KEY        = './scripts/service-account.json'
const CONFIG_ID  = 'n0JshzLmnIroZipH97r1'
const OWNER_UID  = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const uid = () => Math.random().toString(36).slice(2, 12)

const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
if (!snap.exists) { console.error('configurator not found'); process.exit(1) }
const data = snap.data()

// Backup
const rev = await db.collection('revisions').add({
  configuratorId: CONFIG_ID,
  ownerId: OWNER_UID,
  savedAt: FieldValue.serverTimestamp(),
  note: 'pre restructure-zeus backup',
  data,
})
console.log('backup revision:', rev.id)

// ── Index existing GLB URLs from current variants ────────────────
// Current variant labels look like "6200 Glass White", "6200 Glass+Poly Black", ...
// Same size+material share the GLB URL across colors, so first occurrence wins.
const glbBySizeMat = {}
for (const v of data.variants ?? []) {
  const parts = (v.label ?? '').split(' ')
  // size = first token; material is everything between size and color (last token)
  const size     = parts[0]
  const color    = parts[parts.length - 1]
  const material = parts.slice(1, -1).join(' ')
  const key = `${size}__${material}`
  const layer = (v.glbLayers ?? [])[0]
  if (!glbBySizeMat[key] && layer?.glbUrl) {
    glbBySizeMat[key] = {
      glbUrl: layer.glbUrl,
      glbStoragePath: layer.glbStoragePath,
    }
  }
}

const SIZES = ['6200', '8100', '10000', '11900', '13800', '15700']
const MATERIALS = ['Glass', 'Glass+Poly']
const FRAME_MATERIAL = 'gITF___Alum_raam'

// Sanity
for (const s of SIZES) for (const m of MATERIALS) {
  if (!glbBySizeMat[`${s}__${m}`]) {
    console.error('missing GLB for', s, m, '— have keys:', Object.keys(glbBySizeMat))
    process.exit(1)
  }
}

// ── Build 6 size variants ────────────────────────────────────────
const newVariants = SIZES.map((size) => {
  const defaultMat = glbBySizeMat[`${size}__Glass`]

  const materialOpts = MATERIALS.map((mat) => {
    const g = glbBySizeMat[`${size}__${mat}`]
    return {
      id: uid(),
      label: mat,
      swatch: mat === 'Glass' ? '#cce6f0' : '#a8d8e8',
      layerLabel: 'Body',
      glbUrl: g.glbUrl,
      glbStoragePath: g.glbStoragePath,
    }
  })

  const whiteId = uid()
  const blackId = uid()
  const colorOptions = [
    { id: whiteId, label: 'White', swatch: '#ffffff',
      materialOverridesByMaterial: { [FRAME_MATERIAL]: { color: '#ffffff' } } },
    { id: blackId, label: 'Black', swatch: '#1a1a1a',
      materialOverridesByMaterial: { [FRAME_MATERIAL]: { color: '#1a1a1a' } } },
  ]

  return {
    id: uid(),
    label: `Zeus ${size}`,
    swatch: '#888888',
    swatchType: 'color',
    price: null,
    type: 'glb',
    frames: [],
    frameCount: 0,
    glbLayers: [{
      id: uid(),
      label: 'Body',
      visible: true,
      glbUrl: defaultMat.glbUrl,
      glbStoragePath: defaultMat.glbStoragePath,
      glbMaterials: [],
      materialOverrides: {},
    }],
    partOptions: [{
      id: uid(),
      label: 'Material',
      matchLayerLabels: ['Body'],
      defaultOptionId: materialOpts[0].id,
      options: materialOpts,
    }],
    colorOptions,
    defaultColorOptionId: whiteId,
  }
})

await ref.update({
  variants: newVariants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`\nrestructured: ${(data.variants ?? []).length} → ${newVariants.length} variants`)
for (const v of newVariants) {
  console.log(`  ${v.label} — material opts: ${v.partOptions[0].options.map((o) => o.label).join(', ')}; colors: ${v.colorOptions.map((c) => c.label).join(', ')}`)
}
