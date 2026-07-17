import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// Remove `Kleepsuta` from suund options' visibleNodes.
// Kleepsuta was added to make Puhas kaas nodes pass the suund filter, but
// Puhas kaas already has hidesGroups: ['Pos N auk', 'Pos N suund'] which
// suppresses the suund group entirely. In non-Puhas lid GLBs, every position
// contains a `..._Kleepsuta_Auguga` node with no Ulal/All suffix — the OR
// alternative causes an extra closed-position "empty" lid to render.

const KEY = './scripts/service-account.json'
const CONFIG_ID = 'nlcM0J9djkJltOMlbm0q'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
if (!snap.exists) { console.error('not found:', CONFIG_ID); process.exit(1) }

const data = snap.data()

const revRef = await db.collection('revisions').add({
  configuratorId: CONFIG_ID,
  ownerId: data.ownerId,
  savedAt: FieldValue.serverTimestamp(),
  note: 'pre fix-prygikast-suund backup',
  data,
})
console.log('backup revision:', revRef.id)

let patched = 0
for (const v of data.variants ?? []) {
  for (const grp of v.partOptions ?? []) {
    if (!/^Pos \d+ suund$/.test(grp.label)) continue
    for (const opt of grp.options ?? []) {
      if (!Array.isArray(opt.visibleNodes)) continue
      const before = opt.visibleNodes.length
      opt.visibleNodes = opt.visibleNodes.filter((p) => p !== 'Kleepsuta')
      if (opt.visibleNodes.length !== before) patched++
    }
  }
}

await ref.update({
  variants: data.variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`suund options patched: ${patched}`)
