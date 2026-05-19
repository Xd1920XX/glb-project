import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const sa = JSON.parse(readFileSync('./scripts/service-account.json', 'utf8'))
initializeApp({ credential: cert(sa) })

const CONFIG_ID = 'ysiLFw8AYWztMxrTt8x4'
const db = getFirestore()
const ref = db.collection('configurators').doc(CONFIG_ID)
const snap = await ref.get()
const variants = snap.data().variants ?? []

console.log(`before: ${variants.length} variants`)

// Extract dark texture override from any Dark variant
const darkVariant = variants.find((v) => v.label.endsWith(' Dark') && v.glbLayers?.some((l) => l.materialOverrides?.GLB_Puit))
if (!darkVariant) { console.error('no dark variant found — run add-dark-saun.mjs first'); process.exit(1) }
const layerWithOverride = darkVariant.glbLayers.find((l) => l.materialOverrides?.GLB_Puit)
const darkPuit     = layerWithOverride.materialOverrides.GLB_Puit
const darkPuitLava = layerWithOverride.materialOverrides.GLB_Puit_Lava ?? darkPuit
console.log('dark texture url:', darkPuit.textureUrl)

const uid = () => Math.random().toString(36).slice(2, 12)
const TOGGLABLE_LABELS = new Set(['Lava', 'Keris_Cilindro_Must', 'Keris_Cilindro_Teras', 'Keris_Club_Teras'])

const base = variants.filter((v) => !v.label.endsWith(' Dark'))
console.log(`base variants: ${base.length}`)

const upgraded = base.map((v) => {
  const colorOptions = [
    { id: uid(), label: 'Light', swatch: '#C8B48A', materialOverridesByMaterial: {} },
    { id: uid(), label: 'Dark',  swatch: '#2a1a0e', materialOverridesByMaterial: { GLB_Puit: darkPuit, GLB_Puit_Lava: darkPuitLava } },
  ]
  const glbLayers = v.glbLayers.map((l) => (
    TOGGLABLE_LABELS.has(l.label) ? { ...l, togglable: true, defaultOn: true } : l
  ))
  return { ...v, colorOptions, defaultColorOptionId: colorOptions[0].id, glbLayers }
})

await ref.update({ variants: upgraded, updatedAt: FieldValue.serverTimestamp() })
console.log(`\ndone. ${upgraded.length} variants (dropped ${variants.length - upgraded.length} dark dupes).`)
