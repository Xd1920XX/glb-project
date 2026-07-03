import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const KEY = './scripts/service-account.json'
const CONFIG_ID = 'nlcM0J9djkJltOMlbm0q'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa) })

const db = getFirestore()
const snap = await db.collection('configurators').doc(CONFIG_ID).get()

if (!snap.exists) {
  console.error('Configurator not found:', CONFIG_ID)
  process.exit(1)
}

const data = snap.data()
console.log('name:', data.name)
console.log('published:', data.published)
console.log('ownerId:', data.ownerId)
console.log('translations keys:', Object.keys(data.translations ?? {}))
console.log('variants.length:', data.variants?.length ?? 0)

for (const v of data.variants ?? []) {
  console.log(`\n── variant [${v.id}] "${v.label}" ──`)
  console.log('  glbLayers:')
  for (const l of v.glbLayers ?? []) {
    console.log(`    - id=${l.id} label="${l.label}" glbUrl=${l.glbUrl ? 'YES' : 'no'} togglable=${!!l.togglable}`)
  }
  console.log('  partOptions:')
  for (const g of v.partOptions ?? []) {
    console.log(`    group id=${g.id} label="${g.label}" matchLayerLabels=${JSON.stringify(g.matchLayerLabels ?? [])}`)
    for (const o of g.options ?? []) {
      console.log(`      * option id=${o.id} label="${o.label}" glbUrl=${o.glbUrl ? 'YES' : 'no'}`)
    }
  }
}

console.log('\n=== translations ===')
console.log(JSON.stringify(data.translations ?? {}, null, 2))
