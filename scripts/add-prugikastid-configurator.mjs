import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const KEY        = './scripts/service-account.json'
const OWNER_UID  = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'
const BUCKET     = 'glb-revismo.firebasestorage.app'
const ROOT       = './public/prügikastid'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa), storageBucket: BUCKET })
const db     = getFirestore()
const bucket = getStorage().bucket()

const uid = () => Math.random().toString(36).slice(2, 12)

// ── Source GLB map ────────────────────────────────────────────────
const KARKASS = [
  { code: 'B3', label: 'B3', file: '1. Karkass/Container-B3-Karkass_v2.glb' },
  { code: 'B4', label: 'B4', file: '1. Karkass/Container-B4-Karkass_v2.glb' },
  { code: 'B5', label: 'B5', file: '1. Karkass/Container-B5-Karkass_v2.glb' },
]

const ESIPANEEL = {
  file: '3. Esipaneelid/Container-Esipaneelid_Pos1-5_v1.glb',
}

const LIDS = [
  { code: 'Prugi',  label: 'Prügi',   swatch: '#2a2a2a', file: '2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Prugi_v1.glb'  },
  { code: 'Bio',    label: 'Bio',     swatch: '#6b3f1d', file: '2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Bio_v1.glb'    },
  { code: 'Paber',  label: 'Paber',   swatch: '#1f6fb3', file: '2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Paber_v1.glb'  },
  { code: 'Pakend', label: 'Pakend',  swatch: '#f2c200', file: '2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Pakend_v1.glb' },
  { code: 'Klaas',  label: 'Klaas',   swatch: '#2e8b57', file: '2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Klaas_v1.glb'  },
  { code: 'Taara',  label: 'Taara',   swatch: '#a0522d', file: '2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Taara_v1.glb'  },
  { code: 'Puhas',  label: 'Puhas',   swatch: '#cccccc', file: '2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Puhas_v1.glb'  },
]

// ── Upload helper ─────────────────────────────────────────────────
async function uploadGlb(relPath) {
  const fullPath = `${ROOT}/${relPath}`
  const filename = relPath.split('/').pop()
  const ext      = filename.split('.').pop()
  const storPath = `users/${OWNER_UID}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const tok      = randomUUID()
  await bucket.file(storPath).save(readFileSync(fullPath), {
    metadata: {
      contentType: 'model/gltf-binary',
      metadata: { firebaseStorageDownloadTokens: tok, originalName: filename },
    },
  })
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(storPath)}?alt=media&token=${tok}`
  return { glbUrl: url, glbStoragePath: storPath }
}

// ── Upload every GLB once ─────────────────────────────────────────
const karkassUploads = {}
for (const k of KARKASS) {
  process.stdout.write(`upload karkass ${k.code} … `)
  karkassUploads[k.code] = await uploadGlb(k.file)
  console.log('ok')
}

process.stdout.write(`upload esipaneel … `)
const esipaneelUpload = await uploadGlb(ESIPANEEL.file)
console.log('ok')

const lidUploads = {}
for (const l of LIDS) {
  process.stdout.write(`upload lid ${l.code} … `)
  lidUploads[l.code] = await uploadGlb(l.file)
  console.log('ok')
}

// ── Build partOptions group for lid type ──────────────────────────
const LID_LAYER_LABEL = 'Lid'

function buildLidGroup() {
  const opts = LIDS.map((l) => ({
    id: uid(),
    label: l.label,
    swatch: l.swatch,
    layerLabel: LID_LAYER_LABEL,
    glbUrl: lidUploads[l.code].glbUrl,
    glbStoragePath: lidUploads[l.code].glbStoragePath,
  }))
  return {
    id: uid(),
    label: 'Liigi kaaned',
    matchLayerLabels: [LID_LAYER_LABEL],
    defaultOptionId: opts[0].id,
    options: opts,
  }
}

// ── Build 3 variants (one per karkass size) ───────────────────────
const variants = KARKASS.map((k) => ({
  id: uid(),
  label: k.label,
  swatch: '#888888',
  swatchType: 'color',
  price: null,
  type: 'glb',
  frames: [],
  frameCount: 0,
  glbLayers: [
    {
      id: uid(),
      label: 'Karkass',
      visible: true,
      glbUrl: karkassUploads[k.code].glbUrl,
      glbStoragePath: karkassUploads[k.code].glbStoragePath,
      glbMaterials: [],
      materialOverrides: {},
    },
    {
      id: uid(),
      label: 'Esipaneelid',
      visible: true,
      glbUrl: esipaneelUpload.glbUrl,
      glbStoragePath: esipaneelUpload.glbStoragePath,
      glbMaterials: [],
      materialOverrides: {},
    },
    {
      id: uid(),
      label: LID_LAYER_LABEL,
      visible: true,
      glbUrl: lidUploads.Prugi.glbUrl,
      glbStoragePath: lidUploads.Prugi.glbStoragePath,
      glbMaterials: [],
      materialOverrides: {},
    },
  ],
  partOptions: [buildLidGroup()],
}))

// ── Create configurator doc ───────────────────────────────────────
const docData = {
  name: 'Prügikastid',
  ownerId: OWNER_UID,
  published: false,
  variants,
  interiors: [],
  background: { type: 'color', color: '#f4f4f2' },
  viewerSettings: {
    glbAutoRotate: false,
    glbAllowZoom: true,
    glbEnableAnimationControls: false,
    glbFov: 35,
    glbEnvironment: 'studio',
    glbEnableAR: false,
  },
  theme: 'minimal',
  darkMode: false,
  exteriorLabel: 'Exterior',
  interiorLabel: 'Interior',
  orderForm: { enabled: false },
  hotspots: [],
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
}

const ref = await db.collection('configurators').add(docData)
console.log(`\ncreated configurator: ${ref.id}`)
console.log(`variants: ${variants.length}`)
console.log(`lid options: ${LIDS.length}`)
console.log(`builder url: https://glbconfigurator.com/builder/${ref.id}`)
