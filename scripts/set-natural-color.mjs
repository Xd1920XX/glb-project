import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const KEY       = './scripts/service-account.json'
const CONFIG_ID = 'ysiLFw8AYWztMxrTt8x4'
const OWNER_UID = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'
const NATURAL   = '#C8B48A'

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
  note: 'pre set-natural-color backup',
  data,
})
console.log('backup revision:', revRef.id)

let patched = 0
const variants = data.variants.map((v) => {
  if (!v.colorOptions) return v
  return {
    ...v,
    colorOptions: v.colorOptions.map((c) => {
      if (c.label !== 'Natural') return c
      patched++
      return {
        ...c,
        materialOverridesByMaterial: {
          GLB_Puit:      { type: 'color', color: NATURAL },
          GLB_Puit_Lava: { type: 'color', color: NATURAL },
        },
      }
    }),
  }
})

await ref.update({
  variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`Natural overrides set on ${patched} variants`)
