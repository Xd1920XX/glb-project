import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

// Adds a real Puhas front panel to Prügikast. The base panel GLB
// (Esipaneelid/Container-Esipaneelid_Pos1-5_v1.glb) contains Puhas nodes
// which the current language-specific Esipaneelid_fix GLB does not.
// - Upload base panel GLB to Storage
// - On every "Pos N paneel" Puhas option: remove hidden=true,
//   set glbUrl/glbStoragePath to the new asset (visibleNodes stays `_Puhas`)

const KEY        = './scripts/service-account.json'
const CONFIG_ID  = 'nlcM0J9djkJltOMlbm0q'
const OWNER_UID  = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'
const BUCKET     = 'glb-revismo.firebasestorage.app'
const SRC_GLB    = './public/GLB/3. Esipaneelid/Container-Esipaneelid_Pos1-5_v1.glb'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa), storageBucket: BUCKET })
const db     = getFirestore()
const bucket = getStorage().bucket()

// Upload base panel GLB
const filename = SRC_GLB.split('/').pop()
const path     = `users/${OWNER_UID}/${Date.now()}_${Math.random().toString(36).slice(2)}.glb`
const token    = randomUUID()
await bucket.file(path).save(readFileSync(SRC_GLB), {
  metadata: {
    contentType: 'model/gltf-binary',
    metadata: { firebaseStorageDownloadTokens: token, originalName: filename },
  },
})
const glbUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
console.log('uploaded base panel:', glbUrl)

// Patch configurator
const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
const data = snap.data()

const revRef = await db.collection('revisions').add({
  configuratorId: CONFIG_ID,
  ownerId: OWNER_UID,
  savedAt: FieldValue.serverTimestamp(),
  note: 'pre add-puhas-panel backup',
  data,
})
console.log('backup revision:', revRef.id)

let patched = 0
for (const v of data.variants ?? []) {
  for (const grp of v.partOptions ?? []) {
    if (!/^Pos \d+ paneel$/.test(grp.label)) continue
    for (const opt of grp.options ?? []) {
      if (opt.id !== 'puhas') continue
      delete opt.hidden
      opt.glbUrl = glbUrl
      opt.glbStoragePath = path
      patched++
    }
  }
}

await ref.update({
  variants: data.variants,
  updatedAt: FieldValue.serverTimestamp(),
})
console.log(`Puhas paneel options patched: ${patched}`)
