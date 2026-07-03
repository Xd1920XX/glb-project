import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

// Seed full Prügikast configurator (mirrors src/pages/PrygikastDemo.jsx).
// Owner: kMZlGUDl3lPFm2VIyc5eyYHhA752
// Uploads all frame/lid/panel GLBs to Storage, writes Firestore configurator.

const KEY       = './scripts/service-account.json'
const OWNER_UID = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'
const BUCKET    = 'glb-revismo.firebasestorage.app'
const ROOT      = './public/GLB'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa), storageBucket: BUCKET })
const db     = getFirestore()
const bucket = getStorage().bucket()

const uid = () => Math.random().toString(36).slice(2, 12)
const cap = (s) => s[0].toUpperCase() + s.slice(1)

const FRAMES = [
  { n: 3, file: '1. Karkass/Container-B3-Karkass_v2.glb', price: 299 },
  { n: 4, file: '1. Karkass/Container-B4-Karkass_v2.glb', price: 349 },
  { n: 5, file: '1. Karkass/Container-B5-Karkass_v2.glb', price: 419 },
]

const LID_TYPES = [
  { id: 'bio',    label: 'Bio',    swatch: '#5A8A3C' },
  { id: 'klaas',  label: 'Klaas',  swatch: '#4A7FA5' },
  { id: 'paber',  label: 'Paber',  swatch: '#6B9FBE' },
  { id: 'pakend', label: 'Pakend', swatch: '#E8A844' },
  { id: 'prugi',  label: 'Prügi',  swatch: '#888888' },
  { id: 'puhas',  label: 'Puhas',  swatch: '#EBEBEB' },
  { id: 'taara',  label: 'Taara',  swatch: '#CC4477' },
]

const LANGUAGES = [
  { id: 'FIN', label: 'FIN', swatch: '#003580' },
  { id: 'SWE', label: 'SWE', swatch: '#FECC00' },
  { id: 'DEN', label: 'DEN', swatch: '#C60C30' },
  { id: 'LAT', label: 'LAT', swatch: '#9E1B32' },
  { id: 'LIT', label: 'LIT', swatch: '#006A44' },
]
const DEFAULT_LANG = 'FIN'

const lidFile      = (id) => `2. Kaaned Liigiti/Container_Kaaned_Pos1-5_${cap(id)}_v1.glb`
const panelFile    = (lang) => `3. Esipaneelid_fix/Container-Esipaneelid_Pos1-5_${lang}_v1.glb`
const lidNodeToken = (id) => `_${cap(id)}_`
const panelNode    = (id) => `_${cap(id)}`

async function uploadGlb(relPath) {
  const filename = relPath.split('/').pop()
  const ext      = filename.split('.').pop()
  const storPath = `users/${OWNER_UID}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const tok      = randomUUID()
  await bucket.file(storPath).save(readFileSync(`${ROOT}/${relPath}`), {
    metadata: {
      contentType: 'model/gltf-binary',
      metadata: { firebaseStorageDownloadTokens: tok, originalName: filename },
    },
  })
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(storPath)}?alt=media&token=${tok}`
  return { glbUrl: url, glbStoragePath: storPath }
}

// Upload phase
const frameUp = {}
for (const f of FRAMES) {
  process.stdout.write(`upload frame B${f.n} … `)
  frameUp[f.n] = await uploadGlb(f.file)
  console.log('ok')
}

const lidUp = {}
for (const t of LID_TYPES) {
  process.stdout.write(`upload lid ${t.id} … `)
  lidUp[t.id] = await uploadGlb(lidFile(t.id))
  console.log('ok')
}

const panelUp = {}
for (const l of LANGUAGES) {
  process.stdout.write(`upload panel ${l.id} … `)
  panelUp[l.id] = await uploadGlb(panelFile(l.id))
  console.log('ok')
}

// Build per-position part option groups
function buildPartOptions(p) {
  const lidLabel   = `Lid ${p}`
  const panelLabel = `Panel ${p}`
  return [
    {
      id: uid(),
      label: `Pos ${p} kaas`,
      matchLayerLabels: [lidLabel],
      defaultOptionId: 'bio',
      options: LID_TYPES.map((t) => ({
        id: t.id,
        label: t.label,
        swatch: t.swatch,
        glbUrl: lidUp[t.id].glbUrl,
        glbStoragePath: lidUp[t.id].glbStoragePath,
        visibleNodes: [lidNodeToken(t.id)],
        ...(t.id === 'puhas' ? { hidesGroups: [`Pos ${p} auk`, `Pos ${p} suund`] } : {}),
      })),
    },
    {
      id: uid(),
      label: `Pos ${p} auk`,
      matchLayerLabels: [lidLabel],
      defaultOptionId: 'auguga',
      options: [
        { id: 'auguga', label: 'Auguga', swatch: '#bbb', visibleNodes: ['Auguga'] },
        { id: 'auguta', label: 'Auguta', swatch: '#444', visibleNodes: ['Auguta'] },
      ],
    },
    {
      id: uid(),
      label: `Pos ${p} suund`,
      matchLayerLabels: [lidLabel],
      defaultOptionId: 'ulal',
      options: [
        { id: 'ulal', label: 'Ülal', swatch: '#fff', visibleNodes: ['Ulal', 'Kleepsuta'] },
        { id: 'all',  label: 'All',  swatch: '#222', visibleNodes: ['All',  'Kleepsuta'] },
      ],
    },
    {
      id: uid(),
      label: `Pos ${p} paneel`,
      matchLayerLabels: [panelLabel],
      defaultOptionId: 'bio',
      options: LID_TYPES.map((t) => ({
        id: t.id,
        label: t.label,
        swatch: t.swatch,
        visibleNodes: [panelNode(t.id)],
      })),
    },
  ]
}

function buildVariant(f) {
  const positions   = Array.from({ length: f.n }, (_, i) => i + 1)
  const panelLabels = positions.map((p) => `Panel ${p}`)
  return {
    id: `b${f.n}`,
    label: `B${f.n}`,
    type: 'glb',
    groupId: 'frame',
    swatch: '#3a3a3a',
    swatchType: 'color',
    price: f.price,
    frames: [],
    frameCount: 0,
    glbLayers: [
      {
        id: uid(),
        label: 'Frame',
        visible: true,
        glbUrl: frameUp[f.n].glbUrl,
        glbStoragePath: frameUp[f.n].glbStoragePath,
        glbMaterials: [],
        materialOverrides: {},
      },
      ...positions.flatMap((p) => [
        {
          id: uid(),
          label: `Lid ${p}`,
          visible: true,
          glbUrl: lidUp.bio.glbUrl,
          glbStoragePath: lidUp.bio.glbStoragePath,
          glbMaterials: [],
          materialOverrides: {},
          visibleNodes: [`Pos${p}_`],
        },
        {
          id: uid(),
          label: `Panel ${p}`,
          visible: true,
          glbUrl: panelUp[DEFAULT_LANG].glbUrl,
          glbStoragePath: panelUp[DEFAULT_LANG].glbStoragePath,
          glbMaterials: [],
          materialOverrides: {},
          visibleNodes: [`Pos${p}_`],
        },
      ]),
    ],
    partOptions: [
      {
        id: uid(),
        label: 'Language',
        matchLayerLabels: panelLabels,
        defaultOptionId: DEFAULT_LANG,
        options: LANGUAGES.map((l) => ({
          id: l.id,
          label: l.label,
          swatch: l.swatch,
          glbUrl: panelUp[l.id].glbUrl,
          glbStoragePath: panelUp[l.id].glbStoragePath,
        })),
      },
      ...positions.flatMap(buildPartOptions),
    ],
  }
}

const variants = FRAMES.map(buildVariant)

const docData = {
  name: 'Prügikast',
  ownerId: OWNER_UID,
  published: false,
  variantGroups: [
    { id: 'frame', label: 'Karkass', dependsOnVariantId: null },
  ],
  variants,
  interiors: [],
  background: { type: 'color', color: '#f7f6f4' },
  viewerSettings: {
    glbAmbientIntensity: 30,
    glbKeyIntensity: 45,
    glbFillIntensity: 25,
    glbEnvIntensity: 55,
    glbEnvironment: 'city',
    glbAllowZoom: true,
    glbBackgroundColor: '#f7f6f4',
    glbToneMapping: 'aces',
    glbContactShadows: true,
    glbContactShadowOpacity: 0.5,
    glbMinDistance: 2,
    glbMaxDistance: 12,
    glbAutoRotate: false,
    glbEnableAnimationControls: false,
    glbEnableAR: false,
  },
  theme: 'minimal',
  darkMode: false,
  exteriorLabel: 'Exterior',
  interiorLabel: 'Interior',
  hideInteriorTab: true,
  orderForm: { enabled: false },
  hotspots: [],
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
}

const ref = await db.collection('configurators').add(docData)
console.log(`\ncreated configurator: ${ref.id}`)
console.log(`variants: ${variants.length} (B3/B4/B5)`)
console.log(`languages: ${LANGUAGES.length} (${LANGUAGES.map((l) => l.id).join('/')})`)
console.log(`lid types: ${LID_TYPES.length}`)
console.log(`builder url: https://glbconfigurator.com/builder/${ref.id}`)
console.log(`embed url:   https://glbconfigurator.com/embed/${ref.id}`)
