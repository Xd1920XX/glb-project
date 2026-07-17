import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// Restore Puhas behaviour on Prügikast:
//  - kaas group: Puhas gets hidesGroups: ['Pos N auk', 'Pos N suund']
//    (prevents the default Auguga/Ülal node filters from voiding the layer)
//  - paneel group: Puhas gets hidden: true
//    (no Puhas panel exists in the panel GLB, so hide the layer entirely)

const KEY = './scripts/service-account.json'
const CONFIG_ID = 'nlcM0J9djkJltOMlbm0q'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
if (!snap.exists) { console.error('not found:', CONFIG_ID); process.exit(1) }

const data = snap.data()

// Backup revision
const revRef = await db.collection('revisions').add({
  configuratorId: CONFIG_ID,
  ownerId: data.ownerId,
  savedAt: FieldValue.serverTimestamp(),
  note: 'pre restore-prygikast-puhas backup',
  data,
})
console.log('backup revision:', revRef.id)

let kaasPatched  = 0
let panelPatched = 0

for (const v of data.variants ?? []) {
  for (const grp of v.partOptions ?? []) {
    // Match "Pos N kaas" / "Pos N paneel"
    const m = grp.label?.match(/^Pos (\d+) (kaas|paneel)$/)
    if (!m) continue
    const [, posNum, kind] = m
    for (const opt of grp.options ?? []) {
      if (opt.id !== 'puhas') continue
      if (kind === 'kaas') {
        opt.hidesGroups = [`Pos ${posNum} auk`, `Pos ${posNum} suund`]
        kaasPatched++
      } else if (kind === 'paneel') {
        opt.hidden = true
        panelPatched++
      }
    }
  }
}

await ref.update({
  variants: data.variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`kaas Puhas patched: ${kaasPatched}`)
console.log(`paneel Puhas patched: ${panelPatched}`)
