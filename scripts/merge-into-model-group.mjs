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
  note: 'pre merge-into-model-group backup',
  data,
})
console.log('backup revision:', revRef.id)

// Rename House variant → "House", keep Sauna variant label "Sauna"
const oldGroups = data.variantGroups ?? []
const houseGroupId = oldGroups.find((g) => g.label === 'House')?.id

const modelGroupId = uid()
const variantGroups = [
  { id: modelGroupId, label: 'Model', dependsOnVariantId: null },
]

const variants = data.variants.map((v) => {
  const out = { ...v, groupId: modelGroupId }
  // Old House variant had label "Puit A1+" — rename to "House"
  if (v.groupId === houseGroupId) {
    out.label = 'House'
  }
  return out
})

await ref.update({
  variants,
  variantGroups,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log('group → Model. variants:')
for (const v of variants) console.log(`  - ${v.label}`)
