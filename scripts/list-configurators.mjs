import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const sa = JSON.parse(readFileSync('./scripts/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })

const db = getFirestore()
const snaps = await db.collection('configurators').get()

console.log(`total: ${snaps.size}\n`)
for (const d of snaps.docs) {
  const x = d.data()
  console.log(`${d.id}  | name="${x.name ?? ''}"  variants=${x.variants?.length ?? 0}  ownerId=${x.ownerId ?? ''}`)
}
