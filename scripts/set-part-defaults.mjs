import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const KEY       = './scripts/service-account.json'
const CONFIG_ID = 'ysiLFw8AYWztMxrTt8x4'
const OWNER_UID = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'

// group.label → default option.label
const DEFAULTS = {
  Hinges:  'Must',
  Heaters: 'None',
  Handles: '300 Must',
  Floors:  '43mm',
}

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
  note: 'pre set-part-defaults backup',
  data,
})
console.log('backup revision:', revRef.id)

let patched = 0
const variants = data.variants.map((v) => {
  if (!v.partOptions) return v
  const partOptions = v.partOptions.map((g) => {
    const wantLabel = DEFAULTS[g.label]
    if (!wantLabel) return g
    const opt = g.options?.find((o) => o.label === wantLabel)
    if (!opt) return g
    if (g.defaultOptionId === opt.id) return g
    patched++
    return { ...g, defaultOptionId: opt.id }
  })
  return { ...v, partOptions }
})

await ref.update({
  variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`groups with default changed: ${patched}`)
