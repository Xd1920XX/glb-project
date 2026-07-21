import { describe, it, expect } from 'vitest'
import { worldPosition, snapToGrid, nextStackIndex, findCollisions, GRID_CELL } from './moduleStack.js'

describe('worldPosition', () => {
  it('places base module at origin', () => {
    const m = { position: { gx: 0, gz: 0, stack: 0 }, size: { y: 3 } }
    expect(worldPosition(m, [m])).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('stacks modules by summing heights of modules below', () => {
    const base = { id: 'a', position: { gx: 0, gz: 0, stack: 0 }, size: { y: 3 } }
    const top  = { id: 'b', position: { gx: 0, gz: 0, stack: 1 }, size: { y: 2 } }
    expect(worldPosition(top, [base, top])).toEqual({ x: 0, y: 3, z: 0 })
  })

  it('side-by-side modules ignore each other for Y', () => {
    const a = { id: 'a', position: { gx: 0, gz: 0, stack: 0 }, size: { y: 3 } }
    const b = { id: 'b', position: { gx: 1, gz: 0, stack: 0 }, size: { y: 3 } }
    expect(worldPosition(b, [a, b])).toEqual({ x: GRID_CELL, y: 0, z: 0 })
  })
})

describe('snapToGrid', () => {
  it('rounds world coords to nearest grid cell', () => {
    expect(snapToGrid(0.3, -0.6)).toEqual({ gx: 0, gz: -1 })
    expect(snapToGrid(1.5, 1.5)).toEqual({ gx: 2, gz: 2 })
  })
})

describe('nextStackIndex', () => {
  it('returns 0 for empty cell', () => {
    expect(nextStackIndex([], 0, 0)).toBe(0)
  })

  it('returns max+1 for occupied cell', () => {
    const mods = [
      { position: { gx: 0, gz: 0, stack: 0 } },
      { position: { gx: 0, gz: 0, stack: 1 } },
    ]
    expect(nextStackIndex(mods, 0, 0)).toBe(2)
  })

  it('ignores other cells', () => {
    const mods = [{ position: { gx: 1, gz: 0, stack: 5 } }]
    expect(nextStackIndex(mods, 0, 0)).toBe(0)
  })
})

describe('findCollisions', () => {
  it('detects two modules at same grid+stack', () => {
    const a = { id: 'a', position: { gx: 0, gz: 0, stack: 0 } }
    const b = { id: 'b', position: { gx: 0, gz: 0, stack: 0 } }
    expect(findCollisions([a, b])).toEqual([[a, b]])
  })

  it('returns empty when no collisions', () => {
    const a = { id: 'a', position: { gx: 0, gz: 0, stack: 0 } }
    const b = { id: 'b', position: { gx: 0, gz: 0, stack: 1 } }
    expect(findCollisions([a, b])).toEqual([])
  })
})
