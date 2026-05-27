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
  note: 'pre rename-wall-to-size backup',
  data,
})
console.log('backup revision:', revRef.id)

const variants = data.variants.map((v) => {
  if (!v.partOptions) return v
  // Rename "Wall" → "Size" and move it to first position
  const renamed = v.partOptions.map((g) =>
    g.label === 'Wall' ? { ...g, label: 'Size' } : g
  )
  const size  = renamed.find((g) => g.label === 'Size')
  const rest  = renamed.filter((g) => g.label !== 'Size')
  const partOptions = size ? [size, ...rest] : renamed
  return { ...v, partOptions }
})

await ref.update({
  variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log('partOptions per variant:')
for (const v of variants) {
  console.log(`  ${v.label}: ${(v.partOptions ?? []).map((g) => g.label).join(', ')}`)
}
