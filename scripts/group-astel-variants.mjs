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
  note: 'pre group-astel-variants backup',
  data,
})
console.log('backup revision:', revRef.id)

const majaGroupId = uid()
const saunGroupId = uid()

const variantGroups = [
  { id: majaGroupId, label: 'Maja', dependsOnVariantId: null },
  { id: saunGroupId, label: 'Saun', dependsOnVariantId: null },
]

const variants = data.variants.map((v) => {
  if (v.label.startsWith('Maja ')) {
    return { ...v, label: v.label.slice(5), groupId: majaGroupId }
  }
  if (v.label.startsWith('Saun ')) {
    return { ...v, label: v.label.slice(5), groupId: saunGroupId }
  }
  return v
})

await ref.update({
  variants,
  variantGroups,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log('groups + labels:')
for (const v of variants) {
  const grp = variantGroups.find((g) => g.id === v.groupId)?.label ?? '<none>'
  console.log(`  [${grp}] ${v.label}`)
}
