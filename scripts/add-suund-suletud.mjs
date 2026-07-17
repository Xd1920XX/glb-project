import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// Add a "Suletud" (closed) option to every "Pos N suund" group and make it
// the default. Filter matches Kleepsuta variants so:
//   auk=Auguga + suund=Suletud → Kleepsuta_Auguga (closed lid with hole)
//   auk=Auguta + suund=Suletud → no match → no lid (frame top only)
// Existing Ülal/All options unchanged.

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
  note: 'pre add-suund-suletud backup',
  data,
})
console.log('backup revision:', revRef.id)

let patched = 0
for (const v of data.variants ?? []) {
  for (const grp of v.partOptions ?? []) {
    if (!/^Pos \d+ suund$/.test(grp.label)) continue
    if (grp.options?.some((o) => o.id === 'suletud')) continue
    grp.options = [
      { id: 'suletud', label: 'Suletud', swatch: '#888', visibleNodes: ['Kleepsuta'] },
      ...grp.options,
    ]
    grp.defaultOptionId = 'suletud'
    patched++
  }
}

await ref.update({
  variants: data.variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`suund groups patched: ${patched}`)
