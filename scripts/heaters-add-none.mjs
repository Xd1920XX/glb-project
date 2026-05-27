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
  note: 'pre heaters-add-none backup',
  data,
})
console.log('backup revision:', revRef.id)

const KERIS_LABELS = new Set(['Keris Cilindro Must', 'Keris Cilindro Teras', 'Keris Club Teras'])

let kerisStripped = 0
let nonesAdded = 0
const variants = data.variants.map((v) => {
  // Strip togglable from Keris layers
  const glbLayers = (v.glbLayers ?? []).map((l) => {
    if (KERIS_LABELS.has(l.label) && (l.togglable || l.defaultOn !== undefined)) {
      kerisStripped++
      const { togglable, defaultOn, ...rest } = l
      return rest
    }
    return l
  })

  // Add None option to Heaters group
  const partOptions = (v.partOptions ?? []).map((g) => {
    if (g.label !== 'Heaters') return g
    if (g.options.some((o) => o.hidden)) return g  // already has None
    nonesAdded++
    return {
      ...g,
      options: [
        { id: uid(), label: 'None', swatch: '#444', hidden: true },
        ...g.options,
      ],
    }
  })

  return { ...v, glbLayers, partOptions }
})

await ref.update({
  variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`Keris togglable stripped: ${kerisStripped} layers`)
console.log(`Heaters None option added on: ${nonesAdded} variants`)
