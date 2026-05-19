import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const sa = JSON.parse(readFileSync('./scripts/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })

const CONFIG_ID = 'ysiLFw8AYWztMxrTt8x4'
const db = getFirestore()
const ref = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
const variants = snap.data().variants ?? []

console.log(`before: ${variants.length} variants`)

// Group by label; for each label, prefer last 'glb' type, else last entry
const byLabel = new Map()
for (const v of variants) {
  const prev = byLabel.get(v.label)
  if (!prev) { byLabel.set(v.label, v); continue }
  // Prefer glb, then largest glbLayers length, then latest (last wins)
  const score = (x) => (x.type === 'glb' ? 100 : 0) + (x.glbLayers?.length ?? 0)
  if (score(v) >= score(prev)) byLabel.set(v.label, v)
}

const DROP = new Set(['Lava', 'Keris Cilindro Must', 'Keris Cilindro Teras', 'Keris Club Teras'])
const deduped = [...byLabel.values()].filter((v) => !DROP.has(v.label))
console.log(`after:  ${deduped.length} variants`)
console.log('kept labels:')
for (const v of deduped) console.log(`  ${v.label}  (type=${v.type}, layers=${v.glbLayers?.length ?? 0})`)

const DRY = process.argv.includes('--dry')
if (DRY) {
  console.log('\n[dry run] no write. re-run without --dry to commit.')
  process.exit(0)
}

await ref.update({
  variants: deduped,
  updatedAt: FieldValue.serverTimestamp(),
})
console.log('\nwrote.')
