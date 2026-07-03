import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const KEY = './scripts/service-account.json'
const CONFIG_ID = 'nlcM0J9djkJltOMlbm0q'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
if (!snap.exists) { console.error('not found:', CONFIG_ID); process.exit(1) }

const data = snap.data()
let removed = 0

for (const v of data.variants ?? []) {
  for (const grp of v.partOptions ?? []) {
    for (const opt of grp.options ?? []) {
      if (opt.id === 'puhas' && Array.isArray(opt.hidesGroups)) {
        delete opt.hidesGroups
        removed++
      }
    }
  }
}

await ref.update({
  variants: data.variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`removed hidesGroups from ${removed} Puhas option(s) in ${CONFIG_ID}`)
