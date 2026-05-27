import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const KEY        = './scripts/service-account.json'
const CONFIG_ID  = 'ysiLFw8AYWztMxrTt8x4'
const OWNER_UID  = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'
const BUCKET     = 'glb-revismo.firebasestorage.app'
const EXTRAS_DIR = './public/astel/extras'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa), storageBucket: BUCKET })
const db     = getFirestore()
const bucket = getStorage().bucket()

async function uploadGlb(localPath) {
  const ext  = localPath.split('.').pop()
  const path = `users/${OWNER_UID}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const tok  = randomUUID()
  await bucket.file(path).save(readFileSync(localPath), {
    metadata: {
      contentType: 'model/gltf-binary',
      metadata: { firebaseStorageDownloadTokens: tok, originalName: localPath.split('/').pop() },
    },
  })
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${tok}`
  return { glbUrl: url, glbStoragePath: path }
}

const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
const data = snap.data()

const revRef = await db.collection('revisions').add({
  configuratorId: CONFIG_ID,
  ownerId: OWNER_UID,
  savedAt: FieldValue.serverTimestamp(),
  note: 'pre fix-astel-heaters backup',
  data,
})
console.log('backup revision:', revRef.id)

// Re-upload the 2 missing heater GLBs
process.stdout.write('upload Cilindro Teras … ')
const teras  = await uploadGlb(`${EXTRAS_DIR}/Heaters/Roundy_Keris_Harvia_Cilindro_Teras.glb`)
console.log('ok')
process.stdout.write('upload Club Teras … ')
const club   = await uploadGlb(`${EXTRAS_DIR}/Heaters/Roundy_Keris_Harvia_Club_Teras.glb`)
console.log('ok')

const variants = data.variants.map((v) => {
  if (!v.partOptions) return v
  const partOptions = v.partOptions.map((g) => {
    if (g.label !== 'Heaters') return g
    return {
      ...g,
      options: g.options.map((o) => {
        if (o.label === 'Cilindro Teras') return { ...o, ...teras }
        if (o.label === 'Club Teras')     return { ...o, ...club }
        return o
      }),
    }
  })
  return { ...v, partOptions }
})

await ref.update({
  variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log('Heaters fixed.')
