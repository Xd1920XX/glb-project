import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'

/**
 * Load a GLB from a URL and return a de-duplicated list of its materials.
 * Uses material.name as the stable key (survives cloning and reloads).
 */
export function extractGLBMaterials(url) {
  return new Promise((resolve, reject) => {
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')

    const loader = new GLTFLoader()
    loader.setDRACOLoader(dracoLoader)
    loader.load(
      url,
      (gltf) => {
        const seen = new Set()
        const materials = []
        gltf.scene.traverse((node) => {
          if (!node.isMesh) return
          const mats = Array.isArray(node.material) ? node.material : [node.material]
          mats.forEach((mat) => {
            const key = mat.name?.trim() || null
            if (!key || seen.has(key)) return
            seen.add(key)
            materials.push({
              id:        key,
              name:      key,
              baseColor: mat.color ? '#' + mat.color.getHexString() : '#888888',
              hasMap:    !!mat.map,
            })
          })
        })
        dracoLoader.dispose()
        resolve(materials)
      },
      undefined,
      (err) => { dracoLoader.dispose(); reject(err) },
    )
  })
}
