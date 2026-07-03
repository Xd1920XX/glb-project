import { describe, it, expect } from 'vitest'
import { checkConfigHealth } from './configHealth.js'

describe('checkConfigHealth', () => {
  it('flags empty configurator', () => {
    const { warnings, errors } = checkConfigHealth({})
    expect(warnings.length).toBeGreaterThan(0)
    expect(errors).toEqual([])
  })

  it('flags glb variant with no layers or URL', () => {
    const { errors } = checkConfigHealth({
      variants: [{ id: 'v1', label: 'V1', type: 'glb' }],
    })
    expect(errors.some((e) => /no glbLayers or glbUrl/.test(e.message))).toBe(true)
  })

  it('flags spinner variant with no frames', () => {
    const { errors } = checkConfigHealth({
      variants: [{ id: 'v1', label: 'V1', type: 'spinner', frames: [] }],
    })
    expect(errors.some((e) => /no frames/.test(e.message))).toBe(true)
  })

  it('flags glbLayer missing glbUrl', () => {
    const { errors } = checkConfigHealth({
      variants: [{
        id: 'v1', label: 'V1', type: 'glb',
        glbLayers: [{ id: 'l1', label: 'Lid' }],
      }],
    })
    expect(errors.some((e) => /has no glbUrl/.test(e.message))).toBe(true)
  })

  it('flags matchLayerLabels pointing at missing layer', () => {
    const { errors } = checkConfigHealth({
      variants: [{
        id: 'v1', label: 'V1', type: 'glb',
        glbLayers: [{ id: 'l1', label: 'Lid', glbUrl: 'x' }],
        partOptions: [{ id: 'g1', label: 'G', matchLayerLabels: ['Panel'], options: [] }],
      }],
    })
    expect(errors.some((e) => /Panel.*not found/.test(e.message))).toBe(true)
  })

  it('warns on empty partOption group', () => {
    const { warnings } = checkConfigHealth({
      variants: [{
        id: 'v1', label: 'V1', type: 'glb',
        glbLayers: [{ id: 'l1', label: 'Lid', glbUrl: 'x' }],
        partOptions: [{ id: 'g1', label: 'Empty', options: [] }],
      }],
    })
    expect(warnings.some((w) => /has no options/.test(w.message))).toBe(true)
  })

  it('warns on translation for non-existent variant', () => {
    const { warnings } = checkConfigHealth({
      variants: [{ id: 'v1', label: 'V1', type: 'glb', glbLayers: [{ id: 'l', label: 'L', glbUrl: 'x' }] }],
      translations: { et: { variants: { ghostId: { label: 'oops' } } } },
    })
    expect(warnings.some((w) => /non-existent variant/.test(w.message))).toBe(true)
  })

  it('passes a valid config with no findings', () => {
    const { errors, warnings } = checkConfigHealth({
      variants: [{
        id: 'v1', label: 'V1', type: 'glb',
        glbLayers: [{ id: 'l1', label: 'Lid', glbUrl: 'x' }],
        partOptions: [{
          id: 'g1', label: 'Category',
          matchLayerLabels: ['Lid'],
          options: [{ id: 'o1', label: 'Bio', glbUrl: 'x' }],
        }],
      }],
    })
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
  })

  it('flags dependsOnVariantId pointing at missing variant', () => {
    const { errors } = checkConfigHealth({
      variants: [{ id: 'v1', label: 'V1', type: 'spinner', frames: [{ url: 'x' }] }],
      variantGroups: [{ id: 'g1', label: 'G', dependsOnVariantId: 'ghost' }],
    })
    expect(errors.some((e) => /dependsOnVariantId/.test(e.message))).toBe(true)
  })
})
