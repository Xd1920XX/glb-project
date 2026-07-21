// Load vector visualization helpers.
// Computes arrow origin + direction for wind, snow, and self-weight loads
// applied to a stacked-module structure. Purely geometric — no engineering
// magnitude analysis.

// Direction constants (world axes).
export const DIR_DOWN  = { x: 0, y: -1, z: 0 }
export const DIR_UP    = { x: 0, y:  1, z: 0 }
export const DIR_WIND  = { x: 1, y:  0, z: 0 }   // default wind → +X

// Compute self-weight arrows: one arrow per stacked column pointing DOWN
// from the top of each column.
export function selfWeightArrows(modules) {
  const columns = new Map()
  for (const m of modules ?? []) {
    const key = `${m.position.gx},${m.position.gz}`
    const height = (m.size?.y ?? 0)
    const prev = columns.get(key)
    columns.set(key, {
      gx: m.position.gx,
      gz: m.position.gz,
      topY: (prev?.topY ?? 0) + height,
    })
  }
  return [...columns.values()].map((c) => ({
    origin: { x: c.gx, y: c.topY, z: c.gz },
    direction: DIR_DOWN,
    label: 'omakaal',
  }))
}

// Snow load arrows: one arrow per column, pointing DOWN, positioned above the
// top of each column.
export function snowArrows(modules) {
  return selfWeightArrows(modules).map((a) => ({
    ...a,
    origin: { ...a.origin, y: a.origin.y + 0.5 },
    label: 'lumi',
  }))
}

// Wind arrows: one arrow per column, pointing horizontally at mid-height of
// the tallest stack side that faces wind direction.
export function windArrows(modules, direction = DIR_WIND) {
  const columns = new Map()
  for (const m of modules ?? []) {
    const key = `${m.position.gx},${m.position.gz}`
    const height = (m.size?.y ?? 0)
    const prev = columns.get(key)
    columns.set(key, {
      gx: m.position.gx,
      gz: m.position.gz,
      topY: (prev?.topY ?? 0) + height,
    })
  }
  return [...columns.values()].map((c) => ({
    origin: { x: c.gx - direction.x, y: c.topY / 2, z: c.gz - direction.z },
    direction,
    label: 'tuul',
  }))
}
