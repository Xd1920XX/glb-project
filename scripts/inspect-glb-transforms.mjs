import { readFileSync } from 'node:fs'

const path = process.argv[2]
if (!path) { console.error('usage: node inspect-glb-transforms.mjs <glb>'); process.exit(1) }

const buf = readFileSync(path)
const jsonLen = buf.readUInt32LE(12)
const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen))

console.log('=== scenes ===')
for (const s of json.scenes ?? []) console.log(JSON.stringify(s))

console.log('\n=== nodes (name, translation, children, mesh) ===')
for (let i = 0; i < (json.nodes ?? []).length; i++) {
  const n = json.nodes[i]
  const t = n.translation ? `T=[${n.translation.map((x) => x.toFixed(2)).join(',')}]` : '-'
  const r = n.rotation ? 'R=yes' : '-'
  const c = n.children ? `children=${JSON.stringify(n.children)}` : '-'
  const m = n.mesh != null ? `mesh=${n.mesh}` : '-'
  console.log(`  [${i}] "${n.name ?? ''}" ${t} ${r} ${c} ${m}`)
}
