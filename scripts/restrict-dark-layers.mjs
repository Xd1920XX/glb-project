import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const KEY       = './scripts/service-account.json'
const CONFIG_ID = 'ysiLFw8AYWztMxrTt8x4'
const OWNER_UID = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'

// Layer-label whitelist for Dark color. Walls left out so interior stays natural.
const DARK_LAYERS = [
  'Pide_300_Must', 'Pide_300_Natur',
  'Pide_900_Must', 'Pide_900_Natur',
  'Pide_1200_Must', 'Pide_1200_Natur',
  'Hinged_Must', 'Hinged_Pronks',
  'Alus_43mm', 'Alus_70mm', 'Alus_90mm',
]

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
  note: 'pre restrict-dark-layers backup',
  data,
})
console.log('backup revision:', revRef.id)

let patched = 0
const variants = data.variants.map((v) => {
  if (!v.colorOptions) return v
  return {
    ...v,
    colorOptions: v.colorOptions.map((c) => {
      if (c.label !== 'Dark') return c
      patched++
      return { ...c, applyToLayerLabels: DARK_LAYERS }
    }),
  }
})

await ref.update({
  variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`Dark whitelist applied on ${patched} variants`)
console.log('layers:', DARK_LAYERS.join(', '))
