import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const KEY       = './scripts/service-account.json'
const CONFIG_ID = 'ysiLFw8AYWztMxrTt8x4'
const OWNER_UID = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const uid = () => Math.random().toString(36).slice(2, 12)

const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
const data = snap.data()

const revRef = await db.collection('revisions').add({
  configuratorId: CONFIG_ID,
  ownerId: OWNER_UID,
  savedAt: FieldValue.serverTimestamp(),
  note: 'pre add-size-step backup',
  data,
})
console.log('backup revision:', revRef.id)

const variants = data.variants.map((v) => {
  const partOptions = v.partOptions ?? []
  // Rename current "Size" group back to "Wall" (Sauna only)
  const renamed = partOptions.map((g) =>
    g.label === 'Size' ? { ...g, label: 'Wall' } : g
  )
  // Build the new Size group (single option, no layer swap)
  const sizeOpt = { id: uid(), label: 'Standard', swatch: '#888888' }
  const sizeGroup = {
    id: uid(),
    label: 'Size',
    matchLayerLabels: [],         // empty → no GLB swap; group exists for the progressive-disclosure step
    defaultOptionId: sizeOpt.id,
    options: [sizeOpt],
  }
  // Insert Size first, then the rest (without any pre-existing Size)
  const rest = renamed.filter((g) => g.label !== 'Size')
  return { ...v, partOptions: [sizeGroup, ...rest] }
})

await ref.update({
  variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log('partOptions per variant:')
for (const v of variants) {
  console.log(`  ${v.label}: ${(v.partOptions ?? []).map((g) => g.label).join(', ')}`)
}
