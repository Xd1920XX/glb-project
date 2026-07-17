import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

// Add B2 (2-position) variant to Prügikast. Mirrors B3 structure with 2 positions.
// Uploads B2 frame GLB, reuses all lid/panel URLs already in B3.

const KEY        = './scripts/service-account.json'
const CONFIG_ID  = 'nlcM0J9djkJltOMlbm0q'
const OWNER_UID  = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'
const BUCKET     = 'glb-revismo.firebasestorage.app'
const FRAME_SRC  = './public/Sorter_20-B2-Karkass_v2.glb'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa), storageBucket: BUCKET })
const db     = getFirestore()
const bucket = getStorage().bucket()

const uid = () => Math.random().toString(36).slice(2, 12)

async function uploadFrame() {
  const filename = FRAME_SRC.split('/').pop()
  const path     = `users/${OWNER_UID}/${Date.now()}_${Math.random().toString(36).slice(2)}.glb`
  const token    = randomUUID()
  await bucket.file(path).save(readFileSync(FRAME_SRC), {
    metadata: {
      contentType: 'model/gltf-binary',
      metadata: { firebaseStorageDownloadTokens: token, originalName: filename },
    },
  })
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
  return { url, storagePath: path }
}

const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
if (!snap.exists) { console.error('not found:', CONFIG_ID); process.exit(1) }
const data = snap.data()

if (data.variants?.some((v) => v.id === 'b2')) {
  console.log('B2 variant already exists — aborting')
  process.exit(0)
}

const b3 = data.variants.find((v) => v.id === 'b3')
if (!b3) { console.error('B3 template missing'); process.exit(1) }

const revRef = await db.collection('revisions').add({
  configuratorId: CONFIG_ID,
  ownerId: OWNER_UID,
  savedAt: FieldValue.serverTimestamp(),
  note: 'pre add-b2-variant backup',
  data,
})
console.log('backup revision:', revRef.id)

process.stdout.write('upload B2 frame … ')
const frameUp = await uploadFrame()
console.log('ok')

// Pull reusable URLs from B3 layers + partOptions
const b3LidLayer   = b3.glbLayers.find((l) => l.label === 'Lid 1')
const b3PanelLayer = b3.glbLayers.find((l) => l.label === 'Panel 1')

const kaasOptsB3  = b3.partOptions.find((g) => g.label === 'Pos 1 kaas').options
const aukOptsB3   = b3.partOptions.find((g) => g.label === 'Pos 1 auk').options
const suundOptsB3 = b3.partOptions.find((g) => g.label === 'Pos 1 suund').options
const paneelOptsB3 = b3.partOptions.find((g) => g.label === 'Pos 1 paneel').options
const languageB3   = b3.partOptions.find((g) => g.label === 'Language')

function cloneOptions(opts) {
  return opts.map((o) => ({ ...o, id: o.id }))
}

function buildLayers() {
  return [
    {
      id: uid(),
      label: 'Frame',
      visible: true,
      glbUrl: frameUp.url,
      glbStoragePath: frameUp.storagePath,
      glbMaterials: [],
      materialOverrides: {},
    },
    ...[1, 2].flatMap((p) => [
      {
        id: uid(),
        label: `Lid ${p}`,
        visible: true,
        glbUrl: b3LidLayer.glbUrl,
        glbStoragePath: b3LidLayer.glbStoragePath,
        glbMaterials: [],
        materialOverrides: {},
        visibleNodes: [`Pos${p}_`],
      },
      {
        id: uid(),
        label: `Panel ${p}`,
        visible: true,
        glbUrl: b3PanelLayer.glbUrl,
        glbStoragePath: b3PanelLayer.glbStoragePath,
        glbMaterials: [],
        materialOverrides: {},
        visibleNodes: [`Pos${p}_`],
      },
    ]),
  ]
}

function buildPartOptions() {
  const positions = [1, 2]
  const panelLabels = positions.map((p) => `Panel ${p}`)
  const groups = []

  // Language group (mirrors B3)
  groups.push({
    id: uid(),
    label: 'Language',
    matchLayerLabels: panelLabels,
    defaultOptionId: languageB3.defaultOptionId,
    options: cloneOptions(languageB3.options),
  })

  for (const p of positions) {
    // kaas — options include glbUrl/visibleNodes with position-specific hidesGroups on Puhas
    groups.push({
      id: uid(),
      label: `Pos ${p} kaas`,
      matchLayerLabels: [`Lid ${p}`],
      defaultOptionId: b3.partOptions.find((g) => g.label === 'Pos 1 kaas').defaultOptionId,
      options: kaasOptsB3.map((o) => {
        const copy = { ...o }
        if (o.id === 'puhas') copy.hidesGroups = [`Pos ${p} auk`, `Pos ${p} suund`]
        return copy
      }),
    })
    groups.push({
      id: uid(),
      label: `Pos ${p} auk`,
      matchLayerLabels: [`Lid ${p}`],
      defaultOptionId: b3.partOptions.find((g) => g.label === 'Pos 1 auk').defaultOptionId,
      options: cloneOptions(aukOptsB3),
    })
    groups.push({
      id: uid(),
      label: `Pos ${p} suund`,
      matchLayerLabels: [`Lid ${p}`],
      defaultOptionId: b3.partOptions.find((g) => g.label === 'Pos 1 suund').defaultOptionId,
      options: cloneOptions(suundOptsB3),
    })
    groups.push({
      id: uid(),
      label: `Pos ${p} paneel`,
      matchLayerLabels: [`Panel ${p}`],
      defaultOptionId: b3.partOptions.find((g) => g.label === 'Pos 1 paneel').defaultOptionId,
      options: cloneOptions(paneelOptsB3),
    })
  }

  return groups
}

const b2Variant = {
  id: 'b2',
  label: 'B2',
  type: 'glb',
  groupId: b3.groupId ?? 'frame',
  swatch: b3.swatch ?? '#3a3a3a',
  swatchType: 'color',
  price: 249,
  frames: [],
  frameCount: 0,
  glbLayers: buildLayers(),
  partOptions: buildPartOptions(),
  colorOptions: b3.colorOptions,
  colorOptionsLabel: b3.colorOptionsLabel,
  defaultColorOptionId: b3.defaultColorOptionId,
}

// Insert B2 at the front so ordering is B2, B3, B4, B5
const newVariants = [b2Variant, ...data.variants]

await ref.update({
  variants: newVariants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`\nB2 variant added. total variants: ${newVariants.length}`)
console.log(`layers: ${b2Variant.glbLayers.length}  partOption groups: ${b2Variant.partOptions.length}`)
