import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const KEY = './scripts/service-account.json'
const CONFIG_ID = 'ysiLFw8AYWztMxrTt8x4'
const OWNER_UID = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'
const BUCKET = 'glb-revismo.firebasestorage.app'
const DARK_TEXTURE_FILE = './public/astel/glb/wood-041_whitewood-knot-1_d Oksavaba C 3x4m Must 2K.jpg'
const DARK_SWATCH = '#2a1a0e'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa), storageBucket: BUCKET })
const db = getFirestore()
const bucket = getStorage().bucket()

const uid = () => Math.random().toString(36).slice(2, 12)

async function uploadTexture() {
  const path = `users/${OWNER_UID}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
  const token = randomUUID()
  await bucket.file(path).save(readFileSync(DARK_TEXTURE_FILE), {
    metadata: {
      contentType: 'image/jpeg',
      metadata: {
        firebaseStorageDownloadTokens: token,
        originalName: 'wood-041_whitewood-knot-1_d Oksavaba C 3x4m Must 2K.jpg',
      },
    },
  })
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
  return { url, storagePath: path }
}

console.log('uploading dark texture …')
const tex = await uploadTexture()
console.log('texture url:', tex.url)

const ref = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
const variants = snap.data().variants ?? []
const sauns = variants.filter((v) => v.label.startsWith('Saun ') && !v.label.endsWith(' Dark'))
console.log(`found ${sauns.length} Saun variants to clone`)

const override = { type: 'texture', textureUrl: tex.url, texturePath: tex.storagePath }
const matOverrides = { GLB_Puit: override, GLB_Puit_Lava: override }

const darks = sauns.map((v) => ({
  ...v,
  id: uid(),
  label: `${v.label} Dark`,
  swatch: DARK_SWATCH,
  glbLayers: v.glbLayers.map((l) => ({
    ...l,
    id: uid(),
    materialOverrides: matOverrides,
  })),
}))

const merged = [...variants, ...darks]
await ref.update({ variants: merged, updatedAt: FieldValue.serverTimestamp() })
console.log(`\ndone. added ${darks.length} dark variants. total now: ${merged.length}`)
