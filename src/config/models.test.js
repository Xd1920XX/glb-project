import { describe, it, expect } from 'vitest'
import { FRAMES, LIDS, FRONT_PANELS } from './models.js'

describe('FRAMES', () => {
  it('exports B3, B4, B5', () => {
    const ids = FRAMES.map((f) => f.id)
    expect(ids).toEqual(['B3', 'B4', 'B5'])
  })

  it('each frame has id, label, slots, price, path', () => {
    for (const frame of FRAMES) {
      expect(frame).toHaveProperty('id')
      expect(frame).toHaveProperty('label')
      expect(typeof frame.slots).toBe('number')
      expect(typeof frame.price).toBe('number')
      expect(typeof frame.path).toBe('string')
    }
  })

  it('slot counts match frame size', () => {
    expect(FRAMES.find((f) => f.id === 'B3').slots).toBe(3)
    expect(FRAMES.find((f) => f.id === 'B4').slots).toBe(4)
    expect(FRAMES.find((f) => f.id === 'B5').slots).toBe(5)
  })

  it('paths are URL-encoded (no raw spaces)', () => {
    for (const frame of FRAMES) {
      expect(frame.path).not.toContain(' ')
    }
  })

  it('paths reference the Karkass directory', () => {
    for (const frame of FRAMES) {
      expect(frame.path).toContain('Karkass')
    }
  })
})

describe('LIDS', () => {
  const LID_IDS = ['Bio', 'Klaas', 'Paber', 'Pakend', 'Prugi', 'Puhas', 'Taara']

  it('exports 7 lid types', () => {
    expect(LIDS).toHaveLength(7)
  })

  it('has all expected lid ids', () => {
    expect(LIDS.map((l) => l.id)).toEqual(LID_IDS)
  })

  it('each lid has id, label, price, color, path', () => {
    for (const lid of LIDS) {
      expect(lid).toHaveProperty('id')
      expect(lid).toHaveProperty('label')
      expect(typeof lid.price).toBe('number')
      expect(lid.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(typeof lid.path).toBe('string')
    }
  })

  it('paths are URL-encoded (no raw spaces)', () => {
    for (const lid of LIDS) {
      expect(lid.path).not.toContain(' ')
    }
  })

  it('paths reference the Kaaned directory', () => {
    for (const lid of LIDS) {
      expect(lid.path).toContain('Kaaned')
    }
  })
})

describe('FRONT_PANELS', () => {
  it('has label, price, path', () => {
    expect(FRONT_PANELS).toHaveProperty('label')
    expect(typeof FRONT_PANELS.price).toBe('number')
    expect(typeof FRONT_PANELS.path).toBe('string')
  })

  it('path is URL-encoded and references Esipaneelid', () => {
    expect(FRONT_PANELS.path).not.toContain(' ')
    expect(FRONT_PANELS.path).toContain('Esipaneelid')
  })
})
