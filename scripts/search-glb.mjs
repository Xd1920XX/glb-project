import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'

const KEY = './scripts/service-account.json'
const OWNER = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'
const NEEDLE = (process.argv[2] || 'fixed').toLowerCase()

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa), storageBucket: `${sa.project_id}.firebasestorage.app` })

const bucket = getStorage().bucket()
const [files] = await bucket.getFiles({ prefix: `users/${OWNER}/` })

const hits = []
for (const f of files) {
  const [meta] = await f.getMetadata()
  const orig = meta.metadata?.originalName || ''
  if (orig.toLowerCase().includes(NEEDLE) || f.name.toLowerCase().includes(NEEDLE)) {
    hits.push({ storagePath: f.name, orig, size: meta.size, updated: meta.updated })
  }
}
hits.sort((a, b) => a.orig.localeCompare(b.orig))
console.log(`Matches for "${NEEDLE}": ${hits.length}`)
for (const h of hits) {
  console.log(`  ${h.orig}\n    path=${h.storagePath}\n    updated=${h.updated}`)
}
