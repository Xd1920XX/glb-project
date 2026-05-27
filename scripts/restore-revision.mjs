import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const KEY       = './scripts/service-account.json'
const CONFIG_ID = 'ysiLFw8AYWztMxrTt8x4'
const OWNER_UID = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'

const revId = process.argv[2]
if (!revId) { console.error('usage: node restore-revision.mjs <revisionId>'); process.exit(1) }

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const revSnap = await db.collection('revisions').doc(revId).get()
if (!revSnap.exists) { console.error('revision not found:', revId); process.exit(1) }
const revData = revSnap.data()
if (revData.configuratorId !== CONFIG_ID) { console.error('revision belongs to different configurator'); process.exit(1) }

const ref  = db.collection('configurators').doc(CONFIG_ID)
const curr = await ref.get()

// Backup current state before overwrite
const safety = await db.collection('revisions').add({
  configuratorId: CONFIG_ID,
  ownerId: OWNER_UID,
  savedAt: FieldValue.serverTimestamp(),
  note: `pre restore of ${revId} backup`,
  data: curr.data(),
})
console.log('safety backup:', safety.id)

await ref.set({
  ...revData.data,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`restored from revision ${revId}`)
