import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js'

const gltfLoader = new GLTFLoader()
const textureLoader = new THREE.TextureLoader()
textureLoader.crossOrigin = 'anonymous'

function loadGLB(url) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, resolve, undefined, reject)
  })
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    textureLoader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping
        resolve(tex)
      },
      undefined,
      reject,
    )
  })
}

async function applyMaterialOverrides(root, overrides) {
  const entries = Object.entries(overrides ?? {})
  if (!entries.length) return
  const texCache = {}
  for (const [, ov] of entries) {
    if (ov?.type === 'texture' && ov.textureUrl && !texCache[ov.textureUrl]) {
      try { texCache[ov.textureUrl] = await loadTexture(ov.textureUrl) } catch { /* skip */ }
    }
  }
  root.traverse((node) => {
    if (!node.isMesh) return
    const mats = Array.isArray(node.material) ? node.material : [node.material]
    const replaced = mats.map((mat) => {
      const ov = overrides[mat?.name]
      if (!ov || ov.type === 'none') return mat
      const c = mat.clone()
      if (ov.type === 'color' && ov.color) {
        if (c.color) c.color = new THREE.Color(ov.color)
        c.map = null
      } else if (ov.type === 'texture' && ov.textureUrl && texCache[ov.textureUrl]) {
        c.map = texCache[ov.textureUrl]
        if (c.color) c.color = new THREE.Color('#ffffff')
      }
      c.needsUpdate = true
      return c
    })
    node.material = Array.isArray(node.material) ? replaced : replaced[0]
  })
}

/**
 * Build a USDZ Blob from an array of { url, materialOverrides } layers.
 * Layers are merged into one scene at the same world origin.
 */
export async function buildUsdzBlob(glbLayers) {
  if (!glbLayers?.length) throw new Error('No GLB layers provided')
  const root = new THREE.Group()
  for (const layer of glbLayers) {
    if (!layer.url) continue
    const gltf = await loadGLB(layer.url)
    await applyMaterialOverrides(gltf.scene, layer.materialOverrides ?? {})
    root.add(gltf.scene)
  }
  const exporter = new USDZExporter()
  const buffer = await exporter.parseAsync(root)
  return new Blob([buffer], { type: 'model/vnd.usdz+zip' })
}
