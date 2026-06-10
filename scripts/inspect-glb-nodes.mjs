import { readFileSync } from 'node:fs'

const path = process.argv[2]
if (!path) { console.error('usage: node inspect-glb-nodes.mjs <glb>'); process.exit(1) }

const buf = readFileSync(path)
const jsonLen = buf.readUInt32LE(12)
const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen))

console.log('=== nodes ===')
for (let i = 0; i < (json.nodes ?? []).length; i++) {
  const n = json.nodes[i]
  console.log(`  [${i}] name="${n.name ?? ''}" mesh=${n.mesh ?? '-'} children=${(n.children ?? []).length}`)
}

console.log('\n=== meshes ===')
for (let i = 0; i < (json.meshes ?? []).length; i++) {
  const m = json.meshes[i]
  console.log(`  [${i}] name="${m.name ?? ''}" prims=${(m.primitives ?? []).length}`)
}

console.log('\n=== materials ===')
for (let i = 0; i < (json.materials ?? []).length; i++) {
  const m = json.materials[i]
  console.log(`  [${i}] ${m.name ?? '<unnamed>'}`)
}
