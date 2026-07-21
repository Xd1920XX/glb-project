// Plate layer visibility model.
// A module GLB may embed multiple plate layers (kips, OSB, karkass, katus).
// This module maps layer id → visibility flag so students can peel back
// layers to inspect the structure.

export const DEFAULT_LAYERS = ['kips', 'osb', 'karkass', 'katus']

export function makeInitialLayerState(layers = DEFAULT_LAYERS) {
  return Object.fromEntries(layers.map((l) => [l, true]))
}

export function toggleLayer(state, layer) {
  return { ...state, [layer]: !state[layer] }
}

// Given a THREE.js scene root + a layer visibility state map, sets
// mesh.visible per node by matching layer id in the node name (case-insensitive).
export function applyLayerVisibility(root, state) {
  if (!root?.traverse) return
  root.traverse((node) => {
    if (!node.isMesh) return
    const name = (node.name ?? '').toLowerCase()
    for (const [layer, on] of Object.entries(state)) {
      if (name.includes(layer.toLowerCase())) {
        node.visible = on
        return
      }
    }
  })
}
