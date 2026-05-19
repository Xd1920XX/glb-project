import { readFileSync, readdirSync } from 'node:fs'

const GLB_DIR = './public/astel/glb'

function extractMaterials(filePath) {
  const buf = readFileSync(filePath)
  const magic = buf.toString('utf8', 0, 4)
  if (magic !== 'glTF') throw new Error(`not a GLB: ${filePath}`)
  const jsonLen = buf.readUInt32LE(12)
  // chunk type at offset 16 (uint32), JSON = 0x4E4F534A
  const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen))
  return (json.materials ?? []).map((m) => m.name ?? '<unnamed>')
}

const files = readdirSync(GLB_DIR).filter((f) => f.endsWith('.glb')).sort()
for (const f of files) {
  const mats = extractMaterials(`${GLB_DIR}/${f}`)
  console.log(`\n=== ${f} ===`)
  for (const m of mats) console.log(`  ${m}`)
}
