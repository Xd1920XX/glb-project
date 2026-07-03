import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { basename } from 'node:path'

// Rewrite panel GLB node names:
//  1. Group root nodes by X translation → assign Pos1..Pos5 based on ordering.
//  2. Map English type → Estonian: Glass→Klaas, Paper→Paber, Waste→Prugi,
//     Deposit→Taara, Plastic→Pakend, Food→Bio. Leave Bio/Metal/Energy as-is.
// Binary chunk untouched.

const TYPE_MAP = {
  Glass: 'Klaas',
  Paper: 'Paber',
  Waste: 'Prugi',
  Deposit: 'Taara',
  Plastic: 'Pakend',
  Food: 'Bio',
  Bio: 'Bio',
  Metal: 'Metal',
  Energy: 'Energy',
  // SWE compound names
  'Waste-Energy':      'Prugi',
  'Waste-Residual':    'Prugi',
  'Cans-Bottles':      'Taara',
  'Paper-Packaging':   'Pakend',
}

const SRC_DIR = 'public/GLB/3. Esipaneelid_fix'
const DST_DIR = 'public/GLB/3. Esipaneelid_fixed'
const FILES = ['FIN', 'SWE', 'DEN', 'LAT', 'LIT'].map((l) => `Container-Esipaneelid_Pos1-5_${l}_v1.glb`)

if (!existsSync(DST_DIR)) mkdirSync(DST_DIR, { recursive: true })

function fixOne(srcPath, dstPath) {
  const buf = readFileSync(srcPath)
  const magic = buf.readUInt32LE(0)
  if (magic !== 0x46546C67) throw new Error(`not GLB: ${srcPath}`)
  const totalLen = buf.readUInt32LE(8)
  const jsonLen  = buf.readUInt32LE(12)
  const jsonType = buf.readUInt32LE(16)
  if (jsonType !== 0x4E4F534A) throw new Error('expected JSON chunk')
  const jsonStart = 20
  const jsonEnd   = jsonStart + jsonLen
  const jsonStr   = buf.subarray(jsonStart, jsonEnd).toString('utf8')
  const json      = JSON.parse(jsonStr)

  // Binary chunk (may or may not exist)
  const binHeader = jsonEnd < totalLen ? buf.subarray(jsonEnd, jsonEnd + 8) : null
  const binData   = binHeader ? buf.subarray(jsonEnd + 8, totalLen) : null

  // Group root nodes by X translation.
  // scenes[0].nodes lists root (parent) nodes; each has 1 mesh child.
  const rootIdxs = json.scenes[0].nodes
  const groups = new Map() // xKey → array of {rootIdx, meshNodeIdx}
  for (const ri of rootIdxs) {
    const root = json.nodes[ri]
    const m = root.matrix
    if (!m) throw new Error(`root node ${ri} missing matrix`)
    const x = m[12]
    const key = x.toFixed(3)
    if (!groups.has(key)) groups.set(key, [])
    const childIdx = root.children?.[0]
    groups.get(key).push({ rootIdx: ri, meshNodeIdx: childIdx })
  }
  const sortedKeys = [...groups.keys()].sort((a, b) => parseFloat(a) - parseFloat(b))
  console.log(`  positions found: ${sortedKeys.length} (X = ${sortedKeys.join(', ')})`)

  let renames = 0
  sortedKeys.forEach((key, i) => {
    const posN = i + 1
    for (const { meshNodeIdx } of groups.get(key)) {
      const node = json.nodes[meshNodeIdx]
      if (!node?.name) continue
      // Original: Container_Esipaneel_Pos1_<Type>_<LANG>
      const m = node.name.match(/^Container_Esipaneel_Pos\d+_([A-Za-z][A-Za-z-]*)_([A-Z]+)$/)
      if (!m) { console.warn(`    skip node[${meshNodeIdx}]: unexpected name "${node.name}"`); continue }
      const [, engType, lang] = m
      const estType = TYPE_MAP[engType] ?? engType
      const newName = `Container_Esipaneel_Pos${posN}_${estType}_${lang}`
      node.name = newName
      renames++
    }
  })

  // Also update mesh names for debugging clarity (optional but harmless).
  for (const mesh of json.meshes ?? []) {
    if (!mesh.name) continue
    const m = mesh.name.match(/^Container_Esipaneel_Pos\d+_([A-Za-z][A-Za-z-]*)_([A-Z]+)$/)
    if (!m) continue
    const [, engType, lang] = m
    mesh.name = `Container_Esipaneel_Panel_${TYPE_MAP[engType] ?? engType}_${lang}`
  }

  // Re-serialize
  let newJsonStr = JSON.stringify(json)
  // JSON chunk must be padded to 4-byte boundary with spaces (0x20)
  while (newJsonStr.length % 4 !== 0) newJsonStr += ' '
  const newJsonBuf = Buffer.from(newJsonStr, 'utf8')

  const binChunkLen = binData ? binData.length : 0
  const newTotalLen = 12 + 8 + newJsonBuf.length + (binHeader ? 8 + binChunkLen : 0)

  const out = Buffer.alloc(newTotalLen)
  out.writeUInt32LE(0x46546C67, 0)             // magic 'glTF'
  out.writeUInt32LE(2, 4)                       // version
  out.writeUInt32LE(newTotalLen, 8)             // total length
  out.writeUInt32LE(newJsonBuf.length, 12)      // json chunk length
  out.writeUInt32LE(0x4E4F534A, 16)             // json chunk type 'JSON'
  newJsonBuf.copy(out, 20)
  if (binHeader) {
    const binStart = 20 + newJsonBuf.length
    out.writeUInt32LE(binChunkLen, binStart)    // bin chunk length
    out.writeUInt32LE(0x004E4942, binStart + 4) // bin chunk type 'BIN\0'
    binData.copy(out, binStart + 8)
  }

  writeFileSync(dstPath, out)
  console.log(`  ${basename(srcPath)} → ${basename(dstPath)}: ${renames} nodes renamed, ${newTotalLen} bytes`)
}

for (const f of FILES) {
  const src = `${SRC_DIR}/${f}`
  const dst = `${DST_DIR}/${f}`
  console.log(`fix ${f}`)
  fixOne(src, dst)
}

console.log('\ndone.')
