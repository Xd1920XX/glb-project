import { readFileSync } from 'node:fs'

const path = process.argv[2]
if (!path) { console.error('usage: node inspect-glb-mat.mjs <glb>'); process.exit(1) }

const buf = readFileSync(path)
const jsonLen = buf.readUInt32LE(12)
const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen))

console.log('=== materials ===')
for (const m of json.materials ?? []) {
  console.log(JSON.stringify(m, null, 2))
}
console.log('\n=== textures ===')
console.log('count:', (json.textures ?? []).length)
console.log('\n=== images ===')
for (const i of json.images ?? []) console.log(' ', i.name ?? '<unnamed>', i.mimeType ?? '', 'bufferView:', i.bufferView)
