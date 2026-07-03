import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const KEY = './scripts/service-account.json'
const CONFIG_ID = 'nlcM0J9djkJltOMlbm0q'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa), storageBucket: `${sa.project_id}.firebasestorage.app` })

const db = getFirestore()
const snap = await db.collection('configurators').doc(CONFIG_ID).get()
const data = snap.data()

console.log('OWNER:', data.ownerId)
console.log('\n── URLs by option ──')
for (const v of data.variants ?? []) {
  console.log(`\nVariant ${v.label}:`)
  for (const g of v.partOptions ?? []) {
    if (!g.matchLayerLabels?.some((l) => l.startsWith('Lid'))) continue
    if (!g.options?.some((o) => o.glbUrl)) continue
    console.log(`  ${g.label} (matches ${JSON.stringify(g.matchLayerLabels)}):`)
    for (const o of g.options ?? []) {
      if (!o.glbUrl) continue
      const path = o.glbStoragePath || '(no path)'
      const fname = o.glbUrl.split('/').pop().split('?')[0]
      console.log(`    ${o.label}: path=${path}  url=…${fname}`)
    }
  }
  // Language group
  for (const g of v.partOptions ?? []) {
    if (g.label !== 'Language') continue
    console.log(`  Language:`)
    for (const o of g.options ?? []) {
      const path = o.glbStoragePath || '(no path)'
      const fname = o.glbUrl?.split('/').pop().split('?')[0] || '-'
      console.log(`    ${o.label}: path=${path}  fname=${fname}`)
      if (o.byLayer) {
        for (const [layer, d] of Object.entries(o.byLayer)) {
          const fp = d.glbStoragePath || d.glbUrl || '-'
          console.log(`      byLayer[${layer}]: ${fp}`)
        }
      }
    }
  }
}

// List everything in owner's storage folder
console.log('\n── Storage listing ──')
const bucket = getStorage().bucket()
const [files] = await bucket.getFiles({ prefix: `users/${data.ownerId}/` })
console.log(`Total files: ${files.length}`)
// Filter to glbs and show by original name
const glbs = []
for (const f of files) {
  if (!f.name.endsWith('.glb')) continue
  const [meta] = await f.getMetadata()
  const orig = meta.metadata?.originalName || '(no original)'
  glbs.push({ storagePath: f.name, orig, size: meta.size })
}
console.log(`GLB files: ${glbs.length}`)
// Group by originalName pattern
glbs.sort((a, b) => a.orig.localeCompare(b.orig))
for (const g of glbs) {
  console.log(`  ${g.orig}  ← ${g.storagePath}`)
}
