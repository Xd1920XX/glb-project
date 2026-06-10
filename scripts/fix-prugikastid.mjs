import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const KEY        = './scripts/service-account.json'
const CONFIG_ID  = 'rKHn7BL33yy1WR7qYxaX'
const OWNER_UID  = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const uid = () => Math.random().toString(36).slice(2, 12)

// ── Load existing doc + extract URLs ─────────────────────────────
const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
if (!snap.exists) throw new Error(`config ${CONFIG_ID} missing`)
const data = snap.data()

// Backup
const backupRef = await db.collection('revisions').add({
  configuratorId: CONFIG_ID,
  ownerId: OWNER_UID,
  savedAt: FieldValue.serverTimestamp(),
  name: data.name ?? '',
  variantCount: data.variants?.length ?? 0,
  note: 'pre fix-prugikastid backup',
  data,
})
console.log('backup revision:', backupRef.id)

// Extract karkass urls — variant labels were B3/B4/B5, first glbLayer is Karkass
const karkassByCode = {}
let esipaneel = null
for (const v of data.variants) {
  const code = v.label
  const karLayer = v.glbLayers?.find((l) => l.label === 'Karkass')
  if (karLayer) karkassByCode[code] = { glbUrl: karLayer.glbUrl, glbStoragePath: karLayer.glbStoragePath }
  if (!esipaneel) {
    const espLayer = v.glbLayers?.find((l) => l.label === 'Esipaneelid')
    if (espLayer) esipaneel = { glbUrl: espLayer.glbUrl, glbStoragePath: espLayer.glbStoragePath }
  }
}

// Extract lid urls from partOptions of first variant
const lidByCode = {}
const firstPartGroup = data.variants[0]?.partOptions?.[0]
for (const o of firstPartGroup?.options ?? []) {
  // Option label was the type (Prügi, Bio, …) but with diacritics — map by ASCII code
  const label = o.label
  const code = labelToCode(label)
  lidByCode[code] = { glbUrl: o.glbUrl, glbStoragePath: o.glbStoragePath }
}

function labelToCode(label) {
  const map = { 'Prügi': 'Prugi', 'Bio': 'Bio', 'Paber': 'Paber', 'Pakend': 'Pakend', 'Klaas': 'Klaas', 'Taara': 'Taara', 'Puhas': 'Puhas' }
  return map[label] ?? label
}

console.log('karkass:', Object.keys(karkassByCode))
console.log('esipaneel:', !!esipaneel)
console.log('lids:', Object.keys(lidByCode))

// ── Spec ─────────────────────────────────────────────────────────
const SIZES = [
  { code: 'B3', label: 'B3 (3 lahtrit)', positions: 3 },
  { code: 'B4', label: 'B4 (4 lahtrit)', positions: 4 },
  { code: 'B5', label: 'B5 (5 lahtrit)', positions: 5 },
]

const TYPES = [
  { code: 'Prugi',  label: 'Prügi',  swatch: '#2a2a2a' },
  { code: 'Bio',    label: 'Bio',    swatch: '#6b3f1d' },
  { code: 'Paber',  label: 'Paber',  swatch: '#1f6fb3' },
  { code: 'Pakend', label: 'Pakend', swatch: '#f2c200' },
  { code: 'Klaas',  label: 'Klaas',  swatch: '#2e8b57' },
  { code: 'Taara',  label: 'Taara',  swatch: '#a0522d' },
  { code: 'Puhas',  label: 'Puhas',  swatch: '#cccccc' },
]

const DEFAULT_TYPE = 'Prugi'

// Lid node naming: Container_Kaas_Pos{N}_{Type}_Kleeps_Auguga_All
// Puhas only has *_Kleepsuta — special-case
function lidNodeName(pos, typeCode) {
  if (typeCode === 'Puhas') return `Container_Kaas_Pos${pos}_Puhas_Kleepsuta`
  return `Container_Kaas_Pos${pos}_${typeCode}_Kleeps_Auguga_All`
}
function esipaneelNodeName(pos, typeCode) {
  return `Container_Esipaneel_Pos${pos}_${typeCode}`
}

// ── Build new variants ───────────────────────────────────────────
const newVariants = SIZES.map((size) => {
  const karkass = karkassByCode[size.code]
  if (!karkass) throw new Error(`missing karkass for ${size.code}`)

  // Build layers: Karkass + (Lid Pos1..N) + (Esipaneel Pos1..N)
  const glbLayers = [
    {
      id: uid(),
      label: 'Karkass',
      visible: true,
      glbUrl: karkass.glbUrl,
      glbStoragePath: karkass.glbStoragePath,
      glbMaterials: [],
      materialOverrides: {},
    },
  ]
  const lidLayerIds = {}
  const esipLayerIds = {}
  const lidLayerLabels = {}
  const esipLayerLabels = {}
  for (let p = 1; p <= size.positions; p++) {
    const lidLayerLabel = `Kaas Pos${p}`
    const esipLayerLabel = `Esipaneel Pos${p}`
    lidLayerLabels[p] = lidLayerLabel
    esipLayerLabels[p] = esipLayerLabel
    const lidLayerId = uid()
    const esipLayerId = uid()
    lidLayerIds[p] = lidLayerId
    esipLayerIds[p] = esipLayerId
    glbLayers.push({
      id: lidLayerId,
      label: lidLayerLabel,
      visible: true,
      glbUrl: lidByCode[DEFAULT_TYPE].glbUrl,
      glbStoragePath: lidByCode[DEFAULT_TYPE].glbStoragePath,
      glbMaterials: [],
      materialOverrides: {},
      visibleNodes: [lidNodeName(p, DEFAULT_TYPE)],
    })
    glbLayers.push({
      id: esipLayerId,
      label: esipLayerLabel,
      visible: true,
      glbUrl: esipaneel.glbUrl,
      glbStoragePath: esipaneel.glbStoragePath,
      glbMaterials: [],
      materialOverrides: {},
      visibleNodes: [esipaneelNodeName(p, DEFAULT_TYPE)],
    })
  }

  // Build partOptions: one group per position selecting waste type for that position
  const partOptions = []
  for (let p = 1; p <= size.positions; p++) {
    const lidLabel = lidLayerLabels[p]
    const esipLabel = esipLayerLabels[p]
    const opts = TYPES.map((t) => ({
      id: uid(),
      label: t.label,
      swatch: t.swatch,
      byLayer: {
        [lidLabel]: {
          glbUrl: lidByCode[t.code].glbUrl,
          glbStoragePath: lidByCode[t.code].glbStoragePath,
          visibleNodes: [lidNodeName(p, t.code)],
        },
        [esipLabel]: {
          visibleNodes: [esipaneelNodeName(p, t.code)],
        },
      },
    }))
    const def = opts.find((o) => o.label === 'Prügi') ?? opts[0]
    partOptions.push({
      id: uid(),
      label: `Pos ${p} kaas`,
      matchLayerLabels: [lidLabel, esipLabel],
      defaultOptionId: def.id,
      options: opts,
    })
  }

  return {
    id: uid(),
    label: size.label,
    swatch: '#888888',
    swatchType: 'color',
    price: null,
    type: 'glb',
    frames: [],
    frameCount: 0,
    glbLayers,
    partOptions,
  }
})

await ref.update({
  variants: newVariants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`\nupdated configurator: ${CONFIG_ID}`)
console.log(`variants: ${newVariants.length}`)
for (const v of newVariants) {
  console.log(`  ${v.label} — ${v.glbLayers.length} layers, ${v.partOptions.length} position groups`)
}
console.log(`builder url: https://glbconfigurator.com/builder/${CONFIG_ID}`)
