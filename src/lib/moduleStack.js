// Module stacking + grid snapping.
// Modules are placed on a discrete XZ grid; Y position auto-computed from
// stack order. Adjacent placement (side-by-side) and stacking (on top) both
// resolved here.
//
// Module shape:
//   {
//     id, type, glbUrl, size: { x, y, z }, position: { gx, gz, stack },
//     params: { ... }
//   }
//
// gx, gz are integer grid cell indices. stack is integer index within the
// same (gx, gz) column. Y world = sum of heights of modules below.

export const GRID_CELL = 1  // meters per cell

export function worldPosition(module, allModules) {
  const { gx, gz, stack } = module.position
  const below = (allModules ?? [])
    .filter((m) => m.position.gx === gx && m.position.gz === gz && m.position.stack < stack)
    .sort((a, b) => a.position.stack - b.position.stack)
  const y = below.reduce((sum, m) => sum + (m.size?.y ?? 0), 0)
  return {
    x: gx * GRID_CELL,
    y,
    z: gz * GRID_CELL,
  }
}

export function snapToGrid(worldX, worldZ) {
  return {
    gx: Math.round(worldX / GRID_CELL),
    gz: Math.round(worldZ / GRID_CELL),
  }
}

// Find the next available stack index at a given (gx, gz).
export function nextStackIndex(allModules, gx, gz) {
  const stacks = (allModules ?? [])
    .filter((m) => m.position.gx === gx && m.position.gz === gz)
    .map((m) => m.position.stack)
  return stacks.length === 0 ? 0 : Math.max(...stacks) + 1
}

// Detect overlapping modules at same grid cell + stack level.
export function findCollisions(modules) {
  const seen = new Map()
  const collisions = []
  for (const m of modules ?? []) {
    const key = `${m.position.gx},${m.position.gz},${m.position.stack}`
    if (seen.has(key)) collisions.push([seen.get(key), m])
    else seen.set(key, m)
  }
  return collisions
}
