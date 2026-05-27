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
  note: 'pre dark-frontside-only backup',
  data,
})
console.log('backup revision:', revRef.id)

let patched = 0
const variants = data.variants.map((v) => {
  if (!v.colorOptions) return v
  return {
    ...v,
    colorOptions: v.colorOptions.map((c) => {
      if (c.label !== 'Dark' || !c.materialOverridesByMaterial) return c
      patched++
      const overrides = {}
      for (const [name, ov] of Object.entries(c.materialOverridesByMaterial)) {
        overrides[name] = { ...ov, frontSideOnly: true }
      }
      return { ...c, materialOverridesByMaterial: overrides }
    }),
  }
})

await ref.update({
  variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`Dark overrides marked frontSideOnly on ${patched} variants`)
