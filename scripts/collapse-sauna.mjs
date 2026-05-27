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
  note: 'pre collapse-sauna backup',
  data,
})
console.log('backup revision:', revRef.id)

const groups = data.variantGroups ?? []
const houseGroupId = groups.find((g) => g.label === 'House')?.id
const saunaGroupId = groups.find((g) => g.label === 'Sauna')?.id
if (!houseGroupId || !saunaGroupId) { console.error('groups missing'); process.exit(1) }

// Index part URLs across all variants
const urlByLabel = {}
for (const v of data.variants) {
  for (const l of v.glbLayers ?? []) {
    if (l.label && l.glbUrl && !urlByLabel[l.label]) {
      urlByLabel[l.label] = { glbUrl: l.glbUrl, glbStoragePath: l.glbStoragePath }
    }
  }
}
function urlFor(label) {
  if (!urlByLabel[label]) throw new Error(`url missing for ${label}`)
  return urlByLabel[label]
}

// Pull the existing Sauna Puit A1+ variant as the template
const template = data.variants.find((v) => v.groupId === saunaGroupId && v.label === 'Puit A1+')
if (!template) { console.error('sauna template (Puit A1+) not found'); process.exit(1) }

const cornerGroup = {
  id: uid(),
  label: 'Corner',
  matchLayerLabels: ['Nurk_Puidust', 'Nurk_Klaasist'],
  options: [
    { id: uid(), label: 'Puit',  swatch: '#C8B48A', layerLabel: 'Nurk_Puidust',  ...urlFor('Nurk_Puidust')  },
    { id: uid(), label: 'Klaas', swatch: '#88aabb', layerLabel: 'Nurk_Klaasist', ...urlFor('Nurk_Klaasist') },
  ],
}
cornerGroup.defaultOptionId = cornerGroup.options[0].id

const wallGroup = {
  id: uid(),
  label: 'Wall',
  matchLayerLabels: ['Sein_A_Osa2_Aknaga', 'Sein_A_Osa2_Aknata'],
  options: [
    { id: uid(), label: 'With Window',    swatch: '#cccccc', layerLabel: 'Sein_A_Osa2_Aknaga', ...urlFor('Sein_A_Osa2_Aknaga') },
    { id: uid(), label: 'Without Window', swatch: '#888888', layerLabel: 'Sein_A_Osa2_Aknata', ...urlFor('Sein_A_Osa2_Aknata') },
  ],
}
wallGroup.defaultOptionId = wallGroup.options[0].id

// New Sauna variant — Corner + Wall groups inserted before existing 4
const newSauna = {
  ...template,
  id: uid(),
  label: 'Sauna',
  partOptions: [
    cornerGroup,
    wallGroup,
    ...(template.partOptions ?? []),
  ],
}

// Keep House variant(s) as-is, drop all Sauna variants, add the new collapsed one
const variants = [
  ...data.variants.filter((v) => v.groupId !== saunaGroupId),
  newSauna,
]

await ref.update({
  variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`variants: ${data.variants.length} → ${variants.length}`)
console.log('Sauna partOption groups:', newSauna.partOptions.map((g) => g.label).join(', '))
