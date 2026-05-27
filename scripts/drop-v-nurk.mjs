import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const KEY       = './scripts/service-account.json'
const CONFIG_ID = 'ysiLFw8AYWztMxrTt8x4'
const OWNER_UID = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'

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
  note: 'pre drop-v-nurk backup',
  data,
})
console.log('backup revision:', revRef.id)

let dropped = 0
let renamed = 0
const variants = data.variants
  .filter((v) => {
    if (v.label.startsWith('V-Nurk ')) { dropped++; return false }
    return true
  })
  .map((v) => {
    if (v.label.startsWith('P-Nurk ')) {
      renamed++
      return { ...v, label: v.label.slice(7) }  // strip "P-Nurk "
    }
    return v
  })

await ref.update({
  variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`dropped V-Nurk: ${dropped}`)
console.log(`renamed P-Nurk → stripped: ${renamed}`)
console.log('remaining labels:')
for (const v of variants) console.log(`  - ${v.label}`)
