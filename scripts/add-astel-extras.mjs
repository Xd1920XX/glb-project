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
const UPDATED    = './public/astel/updated'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa), storageBucket: BUCKET })
const db     = getFirestore()
const bucket = getStorage().bucket()

// ── Variant label → updated preview JPG ───────────────────────────
const PREVIEW = {
  'Maja P-Nurk Puit A1+':               `${UPDATED}/Roundy_Maja_P_Nurk-Puit_A1+_UA_Natur v4.jpg`,
  'Maja V-Nurk Puit A1+':               `${UPDATED}/Roundy_Maja_V_Nurk-Puit_A1+_UA_Natur v4.jpg`,
  'Saun P-Nurk Klaas A1+':              `${UPDATED}/Roundy_Saun_P_Nurk-Klaas_A1+_UA_Natur v4.jpg`,
  'Saun P-Nurk Puit A1+':               `${UPDATED}/Roundy_Saun_P_Nurk-Puit_A1+_UA_Natur v4.jpg`,
  'Saun P-Nurk Puit A1-':               `${UPDATED}/Roundy_Saun_P_Nurk-Puit_A1-_UA_Natur v1.jpg`,
  'Saun V-Nurk Klaas A1+':              `${UPDATED}/Roundy_Saun_V_Nurk-Klaas_A1+_UA_Natur v4.jpg`,
  'Saun V-Nurk Puit A1+':               `${UPDATED}/Roundy_Saun_V_Nurk-Puit_A1+_UA_Natur v4.jpg`,
  'Saun V-Nurk Puit Pronks Alus43':     `${UPDATED}/Roundy_Saun_V_Nurk-Puit_A1+_UA_Natur_Pronks_Alus43 v1.jpg`,
  'Saun V-Nurk Puit Pronks Alus70':     `${UPDATED}/Roundy_Saun_V_Nurk-Puit_A1+_UA_Natur_Pronks_Alus70 v1.jpg`,
  'Saun V-Nurk Puit Pronks Alus90':     `${UPDATED}/Roundy_Saun_V_Nurk-Puit_A1+_UA_Natur_Pronks_Alus90 v1.jpg`,
  'Saun V-Nurk Puit A1-':               `${UPDATED}/Roundy_Saun_V_Nurk-Puit_A1-_UA_Natur v1.jpg`,
}

// ── Interior label → updated panorama JPG ─────────────────────────
const INTERIOR_IMG = {
  'Seest - Harvia Club v1':             `${UPDATED}/Astel - Roundy - Seest - Harvia Club v1.jpg`,
  'Seest - Harvia Cilindro Black v1':   `${UPDATED}/Astel - Roundy - Seest - Harvia Cilindro Black v1.jpg`,
  'Seest - Harvia Cilindro Steel v1':   `${UPDATED}/Astel - Roundy - Seest - Harvia Cilindro Steel v1.jpg`,
}

// ── New handle GLBs (added to extras/Handles) ─────────────────────
const NEW_HANDLES = [
  { label: 'Pide_300_Must',   file: `${EXTRAS_DIR}/Handles/Roundy_Pide_300_Must.glb`   },
  { label: 'Pide_300_Natur',  file: `${EXTRAS_DIR}/Handles/Roundy_Pide_300_Natur.glb`  },
  { label: 'Pide_900_Must',   file: `${EXTRAS_DIR}/Handles/Roundy_Pide_900_Must.glb`   },
  { label: 'Pide_1200_Must',  file: `${EXTRAS_DIR}/Handles/Roundy_Pide_1200_Must.glb`  },
  { label: 'Pide_1200_Natur', file: `${EXTRAS_DIR}/Handles/Roundy_Pide_1200_Natur.glb` },
]

// ── Sanity check files ────────────────────────────────────────────
const allFiles = [
  ...Object.values(PREVIEW),
  ...Object.values(INTERIOR_IMG),
  ...NEW_HANDLES.map(h => h.file),
]
const missing = allFiles.filter(f => !existsSync(f))
if (missing.length) { console.error('MISSING files:\n' + missing.join('\n')); process.exit(1) }

// ── Helpers ───────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 12)

async function upload(localPath, contentType) {
  const ext  = localPath.split('.').pop()
  const path = `users/${OWNER_UID}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const tok  = randomUUID()
  const fname = localPath.split('/').pop()
  await bucket.file(path).save(readFileSync(localPath), {
    metadata: {
      contentType,
      metadata: { firebaseStorageDownloadTokens: tok, originalName: fname },
    },
  })
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${tok}`
  return { url, storagePath: path }
}

// Recursively clone a value while replacing every `id` field with a fresh ID.
function regenIds(value) {
  if (Array.isArray(value)) return value.map(regenIds)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === 'id' ? uid() : regenIds(v)
    }
    return out
  }
  return value
}

// ── Fetch current configurator ────────────────────────────────────
const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
if (!snap.exists) { console.error('config not found'); process.exit(1) }
const data = snap.data()

// ── Backup revision snapshot ──────────────────────────────────────
const revRef = await db.collection('revisions').add({
  configuratorId: CONFIG_ID,
  ownerId: OWNER_UID,
  savedAt: FieldValue.serverTimestamp(),
  note: 'pre add-astel-extras backup',
  data,
})
console.log('backup revision:', revRef.id)

// ── Upload preview JPGs ───────────────────────────────────────────
const previewByLabel = {}
for (const [label, file] of Object.entries(PREVIEW)) {
  process.stdout.write(`preview ${label} … `)
  previewByLabel[label] = await upload(file, 'image/jpeg')
  console.log('ok')
}

// ── Upload interior JPGs ──────────────────────────────────────────
const interiorByLabel = {}
for (const [label, file] of Object.entries(INTERIOR_IMG)) {
  process.stdout.write(`interior ${label} … `)
  interiorByLabel[label] = await upload(file, 'image/jpeg')
  console.log('ok')
}

// ── Upload new handle GLBs ────────────────────────────────────────
const handleByLabel = {}
for (const h of NEW_HANDLES) {
  process.stdout.write(`glb ${h.label} … `)
  handleByLabel[h.label] = await upload(h.file, 'model/gltf-binary')
  console.log('ok')
}

// ── Patch existing variants: swatch images ────────────────────────
const variants = (data.variants ?? []).map(v => {
  const p = previewByLabel[v.label]
  if (!p) return v
  return {
    ...v,
    swatchType: 'image',
    swatchImageUrl: p.url,
    swatchImagePath: p.storagePath,
  }
})

// ── Patch existing interiors: panorama images ─────────────────────
const interiors = (data.interiors ?? []).map(i => {
  const p = interiorByLabel[i.label]
  if (!p) return i
  return {
    ...i,
    panoramaUrl: p.url,
    panoramaStoragePath: p.storagePath,
  }
})

// ── Build new handle variants (clone Saun V-Nurk Puit A1+) ────────
const template = variants.find(v => v.label === 'Saun V-Nurk Puit A1+')
if (!template) { console.error('template variant missing'); process.exit(1) }

const newVariants = NEW_HANDLES.map(h => {
  const cloned = regenIds(template)
  cloned.label = `Saun V-Nurk Puit A1+ ${h.label.replace('Pide_', 'Pide ')}`
  // strip swatch preview (no image for new combos yet)
  cloned.swatchType = 'color'
  cloned.swatch = '#888888'
  delete cloned.swatchImageUrl
  delete cloned.swatchImagePath
  // swap Pide handle layer
  cloned.glbLayers = cloned.glbLayers.map(l => {
    if (!l.label?.startsWith('Pide_')) return l
    return {
      ...l,
      label: h.label,
      glbUrl: handleByLabel[h.label].url,
      glbStoragePath: handleByLabel[h.label].storagePath,
      glbMaterials: [],
      materialOverrides: {},
    }
  })
  return cloned
})

const mergedVariants = [...variants, ...newVariants]

// ── Write back ────────────────────────────────────────────────────
await ref.update({
  variants: mergedVariants,
  interiors,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`\nvariants: ${variants.length} → ${mergedVariants.length} (+${newVariants.length})`)
console.log(`interiors updated: ${Object.keys(interiorByLabel).length}`)
console.log(`previews set: ${Object.keys(previewByLabel).length}`)
console.log(`new handles uploaded: ${NEW_HANDLES.length}`)
console.log('done.')
