/**
 * Build a "Prügikastid — Test Flow" configurator exercising the full user flow
 * Kristjan wants to test in the Embed API Demo:
 *
 *   1. Per-position lid type     → 5 partOption groups (Pos1..Pos5), each
 *                                  targeting its own lid layer and swapping the
 *                                  lid GLB to one of the 7 types.
 *   2. Hole / no hole            → "Auk" partOption with visibleNodes filter
 *                                  on every lid layer ('_Auguga_' vs '_Auguta_').
 *   3. Sticker top / bottom      → "Kleepsu asend" partOption with visibleNodes
 *                                  filter ('_Ulal' vs '_All').
 *   4. Open / closed lid         → NOT IMPLEMENTED — current GLBs contain no
 *                                  animation or open/closed mesh variants.
 *                                  Add later with new GLB or animation clip.
 *   5. Sticker by ?lang=fi       → translations[fi] swaps a partOption GLB to
 *                                  demonstrate per-locale option asset.
 *   6. Color brown / white       → colorOptions on each variant override the
 *                                  "Pruun" material with brown or white.
 *
 * The lid GLBs already contain every position × type × hole × sticker-position
 * combination as separate mesh nodes, e.g.
 *   Container_Kaas_Pos3_Bio_Kleeps_Auguga_Ulal
 * so all selection is driven by visibleNodes filters intersected across part
 * groups (see ConfiguratorRenderer.resolvePartLayer).
 *
 * Special case: "Puhas" lid only has Kleepsuta variants (no hole, no sticker),
 * so every secondary group's filter includes a "_Puhas_" escape clause so the
 * Puhas mesh remains visible regardless of Auk/Kleeps selection.
 *
 * Usage:
 *   node ./scripts/populate-test-flow.mjs
 *
 * Re-uses uploaded GLB URLs from the existing "Prügikastid" configurator when
 * possible; falls back to uploading from ./public/GLB.
 */

import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const KEY        = './scripts/service-account.json'
const OWNER_UID  = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'
const BUCKET     = 'glb-revismo.firebasestorage.app'
const GLB_ROOT   = './public/GLB'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa), storageBucket: BUCKET })
const db     = getFirestore()
const bucket = getStorage().bucket()

const uid = () => Math.random().toString(36).slice(2, 12)

// ── Source GLB map ──────────────────────────────────────────────
const KARKASS = [
  { code: 'B3', label: 'B3', file: '1. Karkass/Container-B3-Karkass_v2.glb' },
  { code: 'B4', label: 'B4', file: '1. Karkass/Container-B4-Karkass_v2.glb' },
  { code: 'B5', label: 'B5', file: '1. Karkass/Container-B5-Karkass_v2.glb' },
]

const ESIPANEEL_FILE = '3. Esipaneelid/Container-Esipaneelid_Pos1-5_v1.glb'

const LIDS = [
  { code: 'Puhas',  label: 'Puhas',  swatch: '#EBEBEB', file: '2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Puhas_v1.glb'  },
  { code: 'Bio',    label: 'Bio',    swatch: '#6b3f1d', file: '2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Bio_v1.glb'    },
  { code: 'Klaas',  label: 'Klaas',  swatch: '#2e8b57', file: '2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Klaas_v1.glb'  },
  { code: 'Paber',  label: 'Paber',  swatch: '#1f6fb3', file: '2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Paber_v1.glb'  },
  { code: 'Pakend', label: 'Pakend', swatch: '#f2c200', file: '2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Pakend_v1.glb' },
  { code: 'Prugi',  label: 'Prügi',  swatch: '#2a2a2a', file: '2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Prugi_v1.glb'  },
  { code: 'Taara',  label: 'Taara',  swatch: '#a0522d', file: '2. Kaaned Liigiti/Container_Kaaned_Pos1-5_Taara_v1.glb'  },
]

// ── Helpers ─────────────────────────────────────────────────────
function extractGlbMaterials(filePath) {
  const buf = readFileSync(filePath)
  if (buf.toString('utf8', 0, 4) !== 'glTF') return []
  const jsonLen = buf.readUInt32LE(12)
  const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen))
  const seen = new Set()
  const out = []
  for (const m of (json.materials ?? [])) {
    const name = m.name?.trim() || ''
    if (!name || seen.has(name)) continue
    seen.add(name)
    let baseColor = '#888888'
    const c = m.pbrMetallicRoughness?.baseColorFactor
    if (Array.isArray(c) && c.length >= 3) {
      const to = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')
      baseColor = '#' + to(c[0]) + to(c[1]) + to(c[2])
    }
    out.push({ id: name, name, baseColor, hasMap: !!m.pbrMetallicRoughness?.baseColorTexture })
  }
  return out
}

async function uploadGlb(relPath) {
  const fullPath = `${GLB_ROOT}/${relPath}`
  const filename = relPath.split('/').pop()
  const ext      = filename.split('.').pop()
  const storPath = `users/${OWNER_UID}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const tok      = randomUUID()
  await bucket.file(storPath).save(readFileSync(fullPath), {
    metadata: {
      contentType: 'model/gltf-binary',
      metadata: { firebaseStorageDownloadTokens: tok, originalName: filename },
    },
  })
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(storPath)}?alt=media&token=${tok}`
  return { glbUrl: url, glbStoragePath: storPath }
}

// ── Upload every GLB once ───────────────────────────────────────
const karkassUploads = {}
for (const k of KARKASS) {
  process.stdout.write(`upload karkass ${k.code} … `)
  karkassUploads[k.code] = await uploadGlb(k.file)
  console.log('ok')
}

process.stdout.write(`upload esipaneel … `)
const esipaneelUpload = await uploadGlb(ESIPANEEL_FILE)
console.log('ok')

const lidUploads = {}
for (const l of LIDS) {
  process.stdout.write(`upload lid ${l.code} … `)
  lidUploads[l.code] = await uploadGlb(l.file)
  console.log('ok')
}

// Cache extracted materials so the Builder Materials UI surfaces them without
// having to re-scan each GLB after load.
const lidMaterials     = extractGlbMaterials(`${GLB_ROOT}/${LIDS[0].file}`)
const karkassMaterials = {}
for (const k of KARKASS) karkassMaterials[k.code] = extractGlbMaterials(`${GLB_ROOT}/${k.file}`)
const esipaneelMaterials = extractGlbMaterials(`${GLB_ROOT}/${ESIPANEEL_FILE}`)

// ── Build per-variant data ──────────────────────────────────────
const LID_LAYER_LABELS = ['Lid_Pos1', 'Lid_Pos2', 'Lid_Pos3', 'Lid_Pos4', 'Lid_Pos5']

function buildVariant(k) {
  const lidLayers = LID_LAYER_LABELS.map((label, idx) => ({
    id: uid(),
    label,
    visible: true,
    // Base filter: this layer only shows nodes of its own position.
    visibleNodes: [`_Pos${idx + 1}_`],
    glbUrl: lidUploads.Puhas.glbUrl,
    glbStoragePath: lidUploads.Puhas.glbStoragePath,
    glbMaterials: lidMaterials,
    materialOverrides: {},
  }))

  const glbLayers = [
    {
      id: uid(),
      label: 'Karkass',
      visible: true,
      glbUrl: karkassUploads[k.code].glbUrl,
      glbStoragePath: karkassUploads[k.code].glbStoragePath,
      glbMaterials: karkassMaterials[k.code],
      materialOverrides: {},
    },
    {
      id: uid(),
      label: 'Esipaneelid',
      visible: true,
      glbUrl: esipaneelUpload.glbUrl,
      glbStoragePath: esipaneelUpload.glbStoragePath,
      glbMaterials: esipaneelMaterials,
      materialOverrides: {},
    },
    ...lidLayers,
  ]

  // Per-position lid type group — each option swaps glbUrl to the chosen type.
  // Selection is encoded by the GLB choice; no visibleNodes filter needed here
  // because each type GLB contains only that type's meshes.
  const positionGroups = LID_LAYER_LABELS.map((layerLabel, idx) => {
    const opts = LIDS.map((l) => ({
      id: uid(),
      label: l.label,
      swatch: l.swatch,
      glbUrl: lidUploads[l.code].glbUrl,
      glbStoragePath: lidUploads[l.code].glbStoragePath,
    }))
    return {
      id: uid(),
      label: `Pos${idx + 1} kaas`,
      matchLayerLabels: [layerLabel],
      defaultOptionId: opts[0].id, // Puhas
      options: opts,
    }
  })

  // Global hole group — composes via visibleNodes filter (intersected with the
  // layer's base _PosN_ filter). "_Puhas_" escape keeps the Puhas lid visible
  // because Puhas nodes have no Auguga/Auguta suffix.
  const aukGroup = (() => {
    const opts = [
      { id: uid(), label: 'Auguga', swatch: '#9b8d6a', visibleNodes: ['_Auguga_', '_Puhas_'] },
      { id: uid(), label: 'Auguta', swatch: '#d6cdab', visibleNodes: ['_Auguta_', '_Puhas_'] },
    ]
    return {
      id: uid(),
      label: 'Auk',
      matchLayerLabels: [...LID_LAYER_LABELS],
      defaultOptionId: opts[0].id,
      options: opts,
    }
  })()

  // Sticker presence group — uses '_Kleeps_A' to avoid matching the longer
  // '_Kleepsuta_' substring. '_Puhas_' escape so the sticker-less Puhas lid
  // stays visible whichever option is picked.
  const kleepsGroup = (() => {
    const opts = [
      { id: uid(), label: 'Kleebisega', swatch: '#5b8def', visibleNodes: ['_Kleeps_A', '_Puhas_'] },
      { id: uid(), label: 'Kleebiseta', swatch: '#cccccc', visibleNodes: ['_Kleepsuta', '_Puhas_'] },
    ]
    return {
      id: uid(),
      label: 'Kleeps',
      matchLayerLabels: [...LID_LAYER_LABELS],
      defaultOptionId: opts[0].id,
      options: opts,
    }
  })()

  // Sticker position group — '_Ulal' vs '_All' suffix. Both escape clauses
  // include Kleepsuta + Puhas so non-stickered lids remain visible.
  const asendGroup = (() => {
    const opts = [
      { id: uid(), label: 'Ülal', swatch: '#444', visibleNodes: ['_Ulal', '_Kleepsuta', '_Puhas'] },
      { id: uid(), label: 'All',  swatch: '#bbb', visibleNodes: ['_All',  '_Kleepsuta', '_Puhas'] },
    ]
    return {
      id: uid(),
      label: 'Kleepsu asend',
      matchLayerLabels: [...LID_LAYER_LABELS],
      defaultOptionId: opts[0].id,
      options: opts,
    }
  })()

  const partOptions = [...positionGroups, aukGroup, kleepsGroup, asendGroup]

  // Color override targets the shared "Pruun" material used across karkass +
  // lids + esipaneelid. Selecting Valge swaps every Pruun-tagged mesh to white.
  const colorOpts = [
    {
      id: uid(),
      label: 'Pruun',
      swatch: '#8B4513',
      materialOverridesByMaterial: { Pruun: { type: 'color', color: '#8B4513' } },
    },
    {
      id: uid(),
      label: 'Valge',
      swatch: '#FFFFFF',
      materialOverridesByMaterial: { Pruun: { type: 'color', color: '#FFFFFF' } },
    },
  ]

  return {
    id: uid(),
    label: k.label,
    swatch: '#888888',
    swatchType: 'color',
    price: null,
    type: 'glb',
    frames: [],
    frameCount: 0,
    glbLayers,
    partOptions,
    colorOptions: colorOpts,
    defaultColorOptionId: colorOpts[0].id,
  }
}

const variants = KARKASS.map(buildVariant)

// ── Build per-locale demo translation ───────────────────────────
// Demonstrates point 5: when user switches to lang=fi in the API Demo, the
// Bio option at Pos1 swaps its GLB to Klaas as a visible proof the per-locale
// option asset swap (added in configTranslations.overlayOption) is wired up.
function buildFiTranslation() {
  const variantsT = {}
  for (const v of variants) {
    const partOptT = {}
    const pos1Group = v.partOptions.find((g) => g.label === 'Pos1 kaas')
    if (pos1Group) {
      const bio = pos1Group.options.find((o) => o.label === 'Bio')
      if (bio) {
        partOptT[pos1Group.id] = {
          label: 'Pos1 kansi',
          options: {
            [bio.id]: {
              label: 'Bio (FI demo)',
              glbUrl: lidUploads.Klaas.glbUrl,
              glbStoragePath: lidUploads.Klaas.glbStoragePath,
            },
          },
        }
      }
    }
    variantsT[v.id] = { partOptions: partOptT }
  }
  return {
    name: 'Prügikastid — testivuo',
    exteriorLabel: 'Ulkopuoli',
    interiorLabel: 'Sisäpuoli',
    variants: variantsT,
  }
}

// ── Create configurator doc ─────────────────────────────────────
const docData = {
  name: 'Prügikastid — Test Flow',
  ownerId: OWNER_UID,
  published: true,
  variants,
  interiors: [],
  background: { type: 'color', color: '#f4f4f2' },
  viewerSettings: {
    glbAutoRotate: false,
    glbAllowZoom: true,
    glbEnableAnimationControls: false,
    glbFov: 35,
    glbEnvironment: 'studio',
    glbEnableAR: false,
  },
  theme: 'minimal',
  darkMode: false,
  exteriorLabel: 'Exterior',
  interiorLabel: 'Interior',
  orderForm: { enabled: false },
  hotspots: [],
  translations: { fi: buildFiTranslation() },
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
}

const ref = await db.collection('configurators').add(docData)
console.log(`\ncreated configurator: ${ref.id}`)
console.log(`variants: ${variants.length}`)
console.log(`per-variant partOption groups: ${variants[0].partOptions.length}`)
console.log(`builder url:  https://glbconfigurator.com/builder/${ref.id}`)
console.log(`api demo url: https://glbconfigurator.com/builder/${ref.id}/api-demo`)
