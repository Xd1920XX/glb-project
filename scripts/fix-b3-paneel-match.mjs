import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// Bug: B3 variant's "Pos 3 paneel" group had matchLayerLabels: ["Panel 3", "Lid 1"].
// The stray "Lid 1" caused paneel filter to apply to Lid 1 layer, breaking Pos 1 lid
// rendering (mesh must contain _<panelType> AND Prügi filter → zero match).
// Fix: remove "Lid 1" from every Pos N paneel group; keep only "Panel N".

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
  note: 'pre fix-b3-paneel-match backup',
  data,
})
console.log('backup revision:', revRef.id)

let patched = 0
for (const v of data.variants ?? []) {
  for (const grp of v.partOptions ?? []) {
    const m = grp.label?.match(/^Pos (\d+) paneel$/)
    if (!m) continue
    const posNum = m[1]
    const expected = [`Panel ${posNum}`]
    if (!Array.isArray(grp.matchLayerLabels)) continue
    const bad = grp.matchLayerLabels.some((l) => l !== `Panel ${posNum}`)
    if (bad) {
      console.log('  fixing '+v.label+' '+grp.label+': '+JSON.stringify(grp.matchLayerLabels)+' → '+JSON.stringify(expected))
      grp.matchLayerLabels = expected
      patched++
    }
  }
}

await ref.update({
  variants: data.variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`paneel groups patched: ${patched}`)
