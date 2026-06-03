import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const KEY        = './scripts/service-account.json'
const OWNER_UID  = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'
const BUCKET     = 'glb-revismo.firebasestorage.app'
const GLB_DIR    = './public/276_Zeuz Comfort_GLB'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa), storageBucket: BUCKET })
const db     = getFirestore()
const bucket = getStorage().bucket()

// ── Size + material file map ──────────────────────────────────────
const SIZES = ['6200', '8100', '10000', '11900', '13800', '15700']

function fileFor(size, material) {
  if (material === 'Glass') return `EPH Zeus Comfort ${size} GLB Glass.glb`
  if (size === '8100') return `EPH Zeus Comfort 8100 GLB Glass + Poly Glass + Poly.glb`
  return `EPH Zeus Comfort ${size} GLB Glass + Poly.glb`
}

const COLORS = [
  { label: 'White', hex: '#ffffff' },
  { label: 'Black', hex: '#1a1a1a' },
]

const FRAME_MATERIAL = 'gITF___Alum_raam'

// ── Upload helper ─────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 12)

async function uploadGlb(filename) {
  const ext  = filename.split('.').pop()
  const path = `users/${OWNER_UID}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const tok  = randomUUID()
  await bucket.file(path).save(readFileSync(`${GLB_DIR}/${filename}`), {
    metadata: {
      contentType: 'model/gltf-binary',
      metadata: { firebaseStorageDownloadTokens: tok, originalName: filename },
    },
  })
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${tok}`
  return { glbUrl: url, glbStoragePath: path }
}

// ── Upload each size+material GLB once ────────────────────────────
const glbCache = {}
for (const size of SIZES) {
  for (const material of ['Glass', 'Glass+Poly']) {
    const fn = fileFor(size, material)
    process.stdout.write(`upload ${fn} … `)
    glbCache[`${size}_${material}`] = await uploadGlb(fn)
    console.log('ok')
  }
}

// ── Build 24 variants (size × material × color) ───────────────────
const variants = []
for (const size of SIZES) {
  for (const material of ['Glass', 'Glass+Poly']) {
    for (const color of COLORS) {
      const glb = glbCache[`${size}_${material}`]
      variants.push({
        id: uid(),
        label: `${size} ${material} ${color.label}`,
        swatch: color.hex,
        swatchType: 'color',
        price: null,
        type: 'glb',
        frames: [],
        frameCount: 0,
        glbLayers: [{
          id: uid(),
          label: `Zeus_${size}_${material}`,
          visible: true,
          glbUrl: glb.glbUrl,
          glbStoragePath: glb.glbStoragePath,
          glbMaterials: [],
          materialOverrides: {
            [FRAME_MATERIAL]: { color: color.hex },
          },
        }],
      })
    }
  }
}

// ── Create configurator doc ───────────────────────────────────────
const docData = {
  name: 'Zeus Comfort',
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
console.log(`builder url: https://glbconfigurator.com/builder/${ref.id}`)
