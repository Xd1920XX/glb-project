import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const KEY        = './scripts/service-account.json'
const CONFIG_ID  = 'nlcM0J9djkJltOMlbm0q'
const OWNER_UID  = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'
const BUCKET     = 'glb-revismo.firebasestorage.app'
const SRC_DIR    = './public/GLB/3. Esipaneelid_fixed'
const LANGS      = ['FIN', 'SWE', 'DEN', 'LAT', 'LIT']

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa), storageBucket: BUCKET })
const db     = getFirestore()
const bucket = getStorage().bucket()

async function upload(relPath) {
  const filename = relPath.split('/').pop()
  const storPath = `users/${OWNER_UID}/${Date.now()}_${Math.random().toString(36).slice(2)}.glb`
  const tok      = randomUUID()
  await bucket.file(storPath).save(readFileSync(`${SRC_DIR}/${relPath}`), {
    metadata: {
      contentType: 'model/gltf-binary',
      metadata: { firebaseStorageDownloadTokens: tok, originalName: filename },
    },
  })
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(storPath)}?alt=media&token=${tok}`
  return { glbUrl: url, glbStoragePath: storPath }
}

const panelUp = {}
for (const l of LANGS) {
  process.stdout.write(`upload fixed ${l} … `)
  panelUp[l] = await upload(`Container-Esipaneelid_Pos1-5_${l}_v1.glb`)
  console.log('ok')
}

const DEFAULT_LANG = 'FIN'
const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
if (!snap.exists) { console.error('not found:', CONFIG_ID); process.exit(1) }

const data = snap.data()

const variants = (data.variants ?? []).map((v) => {
  // Update Panel N layers to point to fixed FIN
  const newLayers = (v.glbLayers ?? []).map((l) => {
    if (typeof l.label === 'string' && l.label.startsWith('Panel ')) {
      return { ...l, glbUrl: panelUp[DEFAULT_LANG].glbUrl, glbStoragePath: panelUp[DEFAULT_LANG].glbStoragePath }
    }
    return l
  })

  // Update Language partOption group — swap option glbUrls to fixed uploads
  const newParts = (v.partOptions ?? []).map((g) => {
    if (g.label !== 'Language') return g
    return {
      ...g,
      options: g.options.map((o) => panelUp[o.id]
        ? { ...o, glbUrl: panelUp[o.id].glbUrl, glbStoragePath: panelUp[o.id].glbStoragePath }
        : o
      ),
    }
  })

  return { ...v, glbLayers: newLayers, partOptions: newParts }
})

await ref.update({
  variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`\nrepointed ${variants.length} variants → fixed panel GLBs (default ${DEFAULT_LANG})`)
