import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const KEY        = './scripts/service-account.json'
const CONFIG_ID  = 'ysiLFw8AYWztMxrTt8x4'
const OWNER_UID  = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'
const BUCKET     = 'glb-revismo.firebasestorage.app'
const SOURCE_GLB = './public/astel/glb/Roundy_Sein_Ees.glb'
const TEX_NAME   = 'GLB_Puitbasecolortexture.jpeg'
const OUT_LOCAL  = '/tmp/glb-puit-natural.jpeg'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa), storageBucket: BUCKET })
const db     = getFirestore()
const bucket = getStorage().bucket()

// ── Parse GLB binary, extract embedded image bytes ───────────────
function extractImageFromGlb(filePath, imageName) {
  const buf = readFileSync(filePath)
  if (buf.toString('utf8', 0, 4) !== 'glTF') throw new Error('not GLB')
  const jsonLen = buf.readUInt32LE(12)
  const jsonStart = 20
  const json = JSON.parse(buf.toString('utf8', jsonStart, jsonStart + jsonLen))

  // BIN chunk starts after JSON chunk: 12-byte header + jsonLen + 8-byte BIN header
  // BIN header at offset (12 + 8 + jsonLen) = jsonStart + jsonLen
  const binStart = jsonStart + jsonLen + 8

  const img = (json.images ?? []).find((i) => i.name === imageName || i.uri === imageName)
  if (!img) throw new Error(`image not found: ${imageName}`)
  const bv = json.bufferViews[img.bufferView]
  const off = binStart + (bv.byteOffset ?? 0)
  return buf.subarray(off, off + bv.byteLength)
}

console.log(`extracting ${TEX_NAME} from ${SOURCE_GLB}`)
const bytes = extractImageFromGlb(SOURCE_GLB, TEX_NAME)
writeFileSync(OUT_LOCAL, bytes)
console.log(`wrote ${bytes.length} bytes → ${OUT_LOCAL}`)

// ── Upload to Storage ────────────────────────────────────────────
const path = `users/${OWNER_UID}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
const tok  = randomUUID()
await bucket.file(path).save(bytes, {
  metadata: {
    contentType: 'image/jpeg',
    metadata: { firebaseStorageDownloadTokens: tok, originalName: 'GLB_Puit_Natural.jpg' },
  },
})
const textureUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${tok}`
console.log('uploaded:', textureUrl)

// ── Patch configurator: Natural colorOption gets texture override ─
const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
const data = snap.data()

const revRef = await db.collection('revisions').add({
  configuratorId: CONFIG_ID,
  ownerId: OWNER_UID,
  savedAt: FieldValue.serverTimestamp(),
  note: 'pre extract-and-set-natural-tex backup',
  data,
})
console.log('backup revision:', revRef.id)

let patched = 0
const variants = data.variants.map((v) => {
  if (!v.colorOptions) return v
  return {
    ...v,
    colorOptions: v.colorOptions.map((c) => {
      if (c.label !== 'Natural') return c
      patched++
      return {
        ...c,
        materialOverridesByMaterial: {
          GLB_Puit:      { type: 'texture', textureUrl, texturePath: path },
          GLB_Puit_Lava: { type: 'texture', textureUrl, texturePath: path },
        },
      }
    }),
  }
})

await ref.update({
  variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`Natural texture override set on ${patched} variants`)
