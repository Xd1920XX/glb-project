import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const KEY        = './scripts/service-account.json'
const CONFIG_ID  = 'n0JshzLmnIroZipH97r1'
const OWNER_UID  = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
const data = snap.data()

const rev = await db.collection('revisions').add({
  configuratorId: CONFIG_ID,
  ownerId: OWNER_UID,
  savedAt: FieldValue.serverTimestamp(),
  note: 'pre fix-zeus-color-type backup',
  data,
})
console.log('backup revision:', rev.id)

const variants = (data.variants ?? []).map((v) => ({
  ...v,
  colorOptions: (v.colorOptions ?? []).map((c) => ({
    ...c,
    materialOverridesByMaterial: Object.fromEntries(
      Object.entries(c.materialOverridesByMaterial ?? {}).map(([matName, ov]) => [
        matName,
        { type: 'color', color: ov.color ?? ov },
      ]),
    ),
  })),
}))

await ref.update({ variants, updatedAt: FieldValue.serverTimestamp() })

console.log(`patched ${variants.length} variants — colorOptions now include { type: 'color', color }`)
