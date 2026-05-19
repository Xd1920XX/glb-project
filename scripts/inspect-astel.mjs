import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const KEY = './scripts/service-account.json'
const CONFIG_ID = 'ysiLFw8AYWztMxrTt8x4'

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
console.log('variants.length:', data.variants?.length ?? 0)
console.log('interiors.length:', data.interiors?.length ?? 0)
console.log('\n=== variants ===')
console.log(JSON.stringify(data.variants, null, 2))
console.log('\n=== interiors ===')
console.log(JSON.stringify(data.interiors, null, 2))
