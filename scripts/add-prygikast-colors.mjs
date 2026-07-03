import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const KEY = './scripts/service-account.json'
const CONFIG_ID = 'nlcM0J9djkJltOMlbm0q'

const sa = JSON.parse(readFileSync(KEY, 'utf8'))
initializeApp({ credential: cert(sa) })
const db = getFirestore()

const uid = () => Math.random().toString(36).slice(2, 12)

const COLOR_OPTIONS = [
  { id: 'pruun',    label: 'Pruun',    swatch: '#6b4423' },
  { id: 'must',     label: 'Must',     swatch: '#1a1a1a', override: '#1a1a1a' },
  { id: 'valge',    label: 'Valge',    swatch: '#f2f2f2', override: '#f2f2f2' },
  { id: 'hall',     label: 'Hall',     swatch: '#7a7a7a', override: '#7a7a7a' },
  { id: 'roheline', label: 'Roheline', swatch: '#3d5a3d', override: '#3d5a3d' },
]

const buildOverride = (hex) => ({
  Pruun:        { type: 'color', color: hex },
  adskMatPruun: { type: 'color', color: hex },
})

const ref  = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
if (!snap.exists) { console.error('not found:', CONFIG_ID); process.exit(1) }

const data = snap.data()
const variants = (data.variants ?? []).map((v) => ({
  ...v,
  colorOptionsLabel: 'Värv',
  defaultColorOptionId: 'pruun',
  colorOptions: COLOR_OPTIONS.map((c) => ({
    id: c.id,
    label: c.label,
    swatch: c.swatch,
    materialOverridesByMaterial: c.override ? buildOverride(c.override) : {},
  })),
}))

await ref.update({
  variants,
  updatedAt: FieldValue.serverTimestamp(),
})

console.log(`added ${COLOR_OPTIONS.length} colorOptions to ${variants.length} variants in ${CONFIG_ID}`)
