import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const KEY       = './scripts/service-account.json'
const CONFIG_ID = 'ysiLFw8AYWztMxrTt8x4'
const OWNER_UID = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'

const MAP = { House: 'Arcos House', Sauna: 'Arcos Sauna' }

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
const data = snap.data()

const revRef = await db.collection('revisions').add({
  configuratorId: CONFIG_ID,
  ownerId: OWNER_UID,
  savedAt: FieldValue.serverTimestamp(),
  note: 'pre rename-model-labels backup',
  data,
})
console.log('backup revision:', revRef.id)

const variants = data.variants.map((v) => MAP[v.label] ? { ...v, label: MAP[v.label] } : v)

await ref.update({
  variants,
  updatedAt: FieldValue.serverTimestamp(),
})

for (const v of variants) console.log(' -', v.label)
