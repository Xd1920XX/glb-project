import { readFileSync, existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const KEY        = './scripts/service-account.json'
const CONFIG_ID  = 'ysiLFw8AYWztMxrTt8x4'
const OWNER_UID  = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'
const BUCKET     = 'glb-revismo.firebasestorage.app'
const EXTRAS_DIR = './public/astel/extras'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa), storageBucket: BUCKET })
const db     = getFirestore()
const bucket = getStorage().bucket()

// ── Variant labels to KEEP after collapse ─────────────────────────
const KEEP = new Set([
  'Maja P-Nurk Puit A1+',
  'Maja V-Nurk Puit A1+',
  'Saun P-Nurk Klaas A1+',
  'Saun P-Nurk Puit A1+',
  'Saun P-Nurk Puit A1-',
  'Saun V-Nurk Klaas A1+',
  'Saun V-Nurk Puit A1+',
  'Saun V-Nurk Puit A1-',
])

// ── GLBs to upload from extras (parts not yet uploaded) ───────────
// Existing parts in current variants already have URLs we reuse:
//   Hinged_Must, Hinged_Pronks, Alus_43mm, Alus_70mm, Alus_90mm,
//   Pide_900_Natur, Pide_300_Must, Pide_300_Natur, Pide_900_Must,
//   Pide_1200_Must, Pide_1200_Natur, Keris Cilindro Must
// Missing → upload from extras:
const TO_UPLOAD = {
  'Keris Cilindro Teras': `${EXTRAS_DIR}/Heaters/Roundy_Keris_Harvia_Cilindro_Teras.glb`,
  'Keris Club Teras':     `${EXTRAS_DIR}/Heaters/Roundy_Keris_Harvia_Club_Teras.glb`,
}

for (const f of Object.values(TO_UPLOAD)) {
  if (!existsSync(f)) { console.error('missing', f); process.exit(1) }
}

// ── Helpers ───────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 12)

async function uploadGlb(localPath) {
  const ext  = localPath.split('.').pop()
  const path = `users/${OWNER_UID}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const tok  = randomUUID()
  await bucket.file(path).save(readFileSync(localPath), {
    metadata: {
      contentType: 'model/gltf-binary',
      metadata: { firebaseStorageDownloadTokens: tok, originalName: localPath.split('/').pop() },
    },
  })
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${tok}`
  return { glbUrl: url, glbStoragePath: path }
}

// ── Load configurator ─────────────────────────────────────────────
const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
if (!snap.exists) { console.error('config not found'); process.exit(1) }
const data = snap.data()
const oldVariants = data.variants ?? []

// ── Backup revision ───────────────────────────────────────────────
const revRef = await db.collection('revisions').add({
  configuratorId: CONFIG_ID,
  ownerId: OWNER_UID,
  savedAt: FieldValue.serverTimestamp(),
  note: 'pre add-astel-part-options backup',
  data,
})
console.log('backup revision:', revRef.id)

// ── Index existing GLB URLs by layer label across all variants ────
// First occurrence wins. Used to reuse uploaded URLs.
const urlByLabel = {}
for (const v of oldVariants) {
  for (const l of v.glbLayers ?? []) {
    if (l.label && l.glbUrl && !urlByLabel[l.label]) {
      urlByLabel[l.label] = { glbUrl: l.glbUrl, glbStoragePath: l.glbStoragePath }
    }
  }
}

// Helper to get URL+path for a part label (existing or freshly uploaded)
function part(label) {
  if (!urlByLabel[label]) throw new Error(`part GLB url missing: ${label}`)
  return urlByLabel[label]
}

// ── Upload missing heater GLBs ────────────────────────────────────
for (const [label, file] of Object.entries(TO_UPLOAD)) {
  process.stdout.write(`upload ${label} … `)
  urlByLabel[label] = await uploadGlb(file)
  console.log('ok')
}

// ── Build partOption groups ───────────────────────────────────────
function hingesGroup() {
  const opts = [
    { id: uid(), label: 'Must',   swatch: '#1a1a1a', layerLabel: 'Hinged_Must',   ...part('Hinged_Must')   },
    { id: uid(), label: 'Pronks', swatch: '#8a5a2a', layerLabel: 'Hinged_Pronks', ...part('Hinged_Pronks') },
  ]
  return {
    id: uid(),
    label: 'Hinges',
    matchLayerLabels: ['Hinged_Must', 'Hinged_Pronks'],
    defaultOptionId: opts[0].id,
    options: opts,
  }
}

function heatersGroup() {
  const opts = [
    { id: uid(), label: 'Cilindro Must',  swatch: '#1a1a1a', layerLabel: 'Keris Cilindro Must',  ...part('Keris Cilindro Must')  },
    { id: uid(), label: 'Cilindro Teras', swatch: '#bcbcbc', layerLabel: 'Keris Cilindro Teras', ...part('Keris Cilindro Teras') },
    { id: uid(), label: 'Club Teras',     swatch: '#9a9a9a', layerLabel: 'Keris Club Teras',     ...part('Keris Club Teras')     },
  ]
  return {
    id: uid(),
    label: 'Heaters',
    matchLayerLabels: ['Keris Cilindro Must', 'Keris Cilindro Teras', 'Keris Club Teras'],
    defaultOptionId: opts[0].id,
    options: opts,
  }
}

function handlesGroup() {
  const opts = [
    { id: uid(), label: '300 Must',   swatch: '#1a1a1a', layerLabel: 'Pide_300_Must',   ...part('Pide_300_Must')   },
    { id: uid(), label: '300 Natur',  swatch: '#C8B48A', layerLabel: 'Pide_300_Natur',  ...part('Pide_300_Natur')  },
    { id: uid(), label: '900 Must',   swatch: '#1a1a1a', layerLabel: 'Pide_900_Must',   ...part('Pide_900_Must')   },
    { id: uid(), label: '900 Natur',  swatch: '#C8B48A', layerLabel: 'Pide_900_Natur',  ...part('Pide_900_Natur')  },
    { id: uid(), label: '1200 Must',  swatch: '#1a1a1a', layerLabel: 'Pide_1200_Must',  ...part('Pide_1200_Must')  },
    { id: uid(), label: '1200 Natur', swatch: '#C8B48A', layerLabel: 'Pide_1200_Natur', ...part('Pide_1200_Natur') },
  ]
  // default = 900 Natur (matches current baked-in handle)
  const def = opts.find((o) => o.label === '900 Natur') ?? opts[0]
  return {
    id: uid(),
    label: 'Handles',
    matchLayerLabels: [
      'Pide_300_Must', 'Pide_300_Natur',
      'Pide_900_Must', 'Pide_900_Natur',
      'Pide_1200_Must', 'Pide_1200_Natur',
    ],
    defaultOptionId: def.id,
    options: opts,
  }
}

function floorsGroup() {
  const opts = [
    { id: uid(), label: '43mm', swatch: '#888888', layerLabel: 'Alus_43mm', ...part('Alus_43mm') },
    { id: uid(), label: '70mm', swatch: '#888888', layerLabel: 'Alus_70mm', ...part('Alus_70mm') },
    { id: uid(), label: '90mm', swatch: '#888888', layerLabel: 'Alus_90mm', ...part('Alus_90mm') },
  ]
  return {
    id: uid(),
    label: 'Floors',
    matchLayerLabels: ['Alus_43mm', 'Alus_70mm', 'Alus_90mm'],
    defaultOptionId: opts[0].id,
    options: opts,
  }
}

// ── Filter + augment variants ─────────────────────────────────────
const collapsed = oldVariants.filter((v) => KEEP.has(v.label)).map((v) => {
  const isSaun = v.label.startsWith('Saun')
  const partOptions = [
    hingesGroup(),
    ...(isSaun ? [heatersGroup()] : []),
    handlesGroup(),
    floorsGroup(),
  ]
  return { ...v, partOptions }
})

if (collapsed.length !== KEEP.size) {
  console.error('expected', KEEP.size, 'kept, got', collapsed.length)
  console.error('found labels:', collapsed.map((v) => v.label))
  process.exit(1)
}

// ── Write back ────────────────────────────────────────────────────
await ref.update({
  variants: collapsed,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`\nvariants: ${oldVariants.length} → ${collapsed.length}`)
console.log('partOption groups attached:')
for (const v of collapsed) {
  console.log(`  ${v.label}: ${v.partOptions.map((g) => g.label).join(', ')}`)
}
console.log('done.')
