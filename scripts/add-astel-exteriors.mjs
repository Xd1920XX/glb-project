import { readFileSync, readdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const KEY = './scripts/service-account.json'
const CONFIG_ID = 'ysiLFw8AYWztMxrTt8x4'
const OWNER_UID = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'
const BUCKET = 'glb-revismo.firebasestorage.app'
const GLB_DIR = './public/astel/glb'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa), storageBucket: BUCKET })

const db = getFirestore()
const bucket = getStorage().bucket()

// ── GLB part inventory ─────────────────────────────────────────────
const PARTS = {
  Sein_Ees:                'Roundy_Sein_Ees.glb',
  Sein_Tagumine:           'Roundy_Sein_Tagumine.glb',
  Sein_A_Osa1:             'Roundy_Sein_A_Osa1.glb',
  Sein_A_Osa2_Aknaga:      'Roundy_Sein_A_Osa2_Aknaga.glb',
  Sein_A_Osa2_Aknata:      'Roundy_Sein_A_Osa2_Aknata.glb',
  Sein_B_Aknaga:           'Roundy_Sein_B_Aknaga.glb',
  Nurk_Puidust:            'Roundy_Nurk_Puidust.glb',
  Nurk_Klaasist:           'Roundy_Nurk_Klaasist.glb',
  Lagi:                    'Roundy_Lagi.glb',
  Lava:                    'Roundy_Lava.glb',
  Pide_900_Natur:          'Roundy_Pide_900_Natur.glb',
  Alus_43mm:               'Roundy_Alus_43mm.glb',
  Alus_70mm:               'Roundy_Alus_70mm.glb',
  Alus_90mm:               'Roundy_Alus_90mm.glb',
  Hinged_Must:             'Roundy_Hinged_Must.glb',
  Hinged_Pronks:           'Roundy_Hinged_Pronks.glb',
  Keris_Cilindro_Must:     'Roundy_Keris_Harvia_Cilindro_Must.glb',
  Keris_Cilindro_Teras:    'Roundy_Keris_Harvia_Cilindro_Teras.glb',
  Keris_Club_Teras:        'Roundy_Keris_Harvia_Club_Teras.glb',
}

const ALWAYS  = ['Sein_Ees', 'Sein_Tagumine', 'Sein_A_Osa1', 'Sein_B_Aknaga', 'Lagi', 'Pide_900_Natur']
const SAUN    = ['Lava', 'Keris_Cilindro_Must']
const APLUS   = ['Sein_A_Osa2_Aknaga']
const AMINUS  = ['Sein_A_Osa2_Aknata']
const PUIT    = ['Nurk_Puidust']
const KLAAS   = ['Nurk_Klaasist']

// Returns list of part keys for a given variant
const stack = ({ kind, corner, size, base = 'Alus_43mm', hinged = 'Hinged_Must' }) => [
  ...ALWAYS,
  ...(size === 'A1+' ? APLUS : AMINUS),
  ...(corner === 'Puit' ? PUIT : KLAAS),
  ...(kind === 'Saun' ? SAUN : []),
  base,
  hinged,
]

// ── Variant definitions ────────────────────────────────────────────
const VARIANTS = [
  { label: 'Maja P-Nurk Puit A1+',              parts: stack({ kind: 'Maja', corner: 'Puit',  size: 'A1+' }) },
  { label: 'Maja V-Nurk Puit A1+',              parts: stack({ kind: 'Maja', corner: 'Puit',  size: 'A1+' }) },
  { label: 'Saun P-Nurk Klaas A1+',             parts: stack({ kind: 'Saun', corner: 'Klaas', size: 'A1+' }) },
  { label: 'Saun P-Nurk Puit A1+',              parts: stack({ kind: 'Saun', corner: 'Puit',  size: 'A1+' }) },
  { label: 'Saun P-Nurk Puit A1-',              parts: stack({ kind: 'Saun', corner: 'Puit',  size: 'A1-' }) },
  { label: 'Saun V-Nurk Klaas A1+',             parts: stack({ kind: 'Saun', corner: 'Klaas', size: 'A1+' }) },
  { label: 'Saun V-Nurk Puit A1+',              parts: stack({ kind: 'Saun', corner: 'Puit',  size: 'A1+' }) },
  { label: 'Saun V-Nurk Puit Pronks Alus43',    parts: stack({ kind: 'Saun', corner: 'Puit',  size: 'A1+', base: 'Alus_43mm', hinged: 'Hinged_Pronks' }) },
  { label: 'Saun V-Nurk Puit Pronks Alus70',    parts: stack({ kind: 'Saun', corner: 'Puit',  size: 'A1+', base: 'Alus_70mm', hinged: 'Hinged_Pronks' }) },
  { label: 'Saun V-Nurk Puit Pronks Alus90',    parts: stack({ kind: 'Saun', corner: 'Puit',  size: 'A1+', base: 'Alus_90mm', hinged: 'Hinged_Pronks' }) },
  { label: 'Saun V-Nurk Puit A1-',              parts: stack({ kind: 'Saun', corner: 'Puit',  size: 'A1-' }) },
]

// Sanity: all referenced files must exist locally
const present = new Set(readdirSync(GLB_DIR))
const missing = new Set()
for (const v of VARIANTS) for (const p of v.parts) if (!present.has(PARTS[p])) missing.add(PARTS[p])
if (missing.size) { console.error('MISSING GLB files:', [...missing]); process.exit(1) }

// ── Helpers ────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 12)

async function uploadOne(filename) {
  const ext = filename.split('.').pop()
  const path = `users/${OWNER_UID}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const token = randomUUID()
  const file = bucket.file(path)
  await file.save(readFileSync(`${GLB_DIR}/${filename}`), {
    metadata: {
      contentType: 'model/gltf-binary',
      metadata: {
        firebaseStorageDownloadTokens: token,
        originalName: filename,
      },
    },
  })
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
  return { url, storagePath: path }
}

// ── Upload each unique GLB ONCE, build URL cache ───────────────────
const uploaded = {}   // partKey → { url, storagePath }
const usedKeys = new Set()
for (const v of VARIANTS) for (const p of v.parts) usedKeys.add(p)

for (const key of usedKeys) {
  const fn = PARTS[key]
  process.stdout.write(`uploading ${fn} … `)
  uploaded[key] = await uploadOne(fn)
  console.log('ok')
}

// ── Build variant objects ──────────────────────────────────────────
const newVariants = VARIANTS.map((v) => ({
  id: uid(),
  label: v.label,
  swatch: '#888888',
  swatchType: 'color',
  price: null,
  type: 'glb',
  frames: [],
  frameCount: 0,
  glbLayers: v.parts.map((p) => ({
    id: uid(),
    label: p,
    visible: true,
    glbUrl: uploaded[p].url,
    glbStoragePath: uploaded[p].storagePath,
    glbMaterials: [],
    materialOverrides: {},
  })),
}))

// ── Patch Firestore ────────────────────────────────────────────────
const ref = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
const existing = snap.data().variants ?? []
const merged = [...existing, ...newVariants]

await ref.update({
  variants: merged,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`\ndone. variants now: ${merged.length} (added ${newVariants.length})`)
