import { describe, it, expect } from 'vitest'
import { evaluateAttempt, extractAttemptParams } from './ruleEngine.js'

const rules = [
  { id: 'wallHeight', pass: { min: 2.4, max: 3.0 }, nearLimit: { min: 2.2, max: 3.2 } },
  { id: 'roofSlope',  pass: { min: 15,  max: 45 },  nearLimit: { min: 10,  max: 55 } },
]

describe('evaluateAttempt', () => {
  it('marks value inside pass band as pass', () => {
    const r = evaluateAttempt(rules, { wallHeight: 2.7, roofSlope: 30 })
    expect(r.results).toEqual({ wallHeight: 'pass', roofSlope: 'pass' })
    expect(r.score).toBe(100)
    expect(r.passCount).toBe(2)
  })

  it('marks value in near-limit band correctly', () => {
    const r = evaluateAttempt(rules, { wallHeight: 3.1, roofSlope: 30 })
    expect(r.results.wallHeight).toBe('near-limit')
    expect(r.results.roofSlope).toBe('pass')
    expect(r.score).toBe(75)  // (1 + 0.5) / 2 = 0.75
  })

  it('marks value outside near-limit as fail', () => {
    const r = evaluateAttempt(rules, { wallHeight: 4.0, roofSlope: 60 })
    expect(r.results.wallHeight).toBe('fail')
    expect(r.results.roofSlope).toBe('fail')
    expect(r.score).toBe(0)
    expect(r.failCount).toBe(2)
  })

  it('treats missing values as n/a and excludes them from score', () => {
    const r = evaluateAttempt(rules, { wallHeight: 2.7 })
    expect(r.results.roofSlope).toBe('n/a')
    expect(r.naCount).toBe(1)
    expect(r.score).toBe(100)  // 1 pass out of 1 scored
  })

  it('returns 0 score when no rules', () => {
    const r = evaluateAttempt([], {})
    expect(r.score).toBe(0)
  })
})

describe('extractAttemptParams', () => {
  it('flattens module.params into a single map', () => {
    const attempt = {
      modules: [
        { id: 'm1', params: { wallHeight: 2.7 } },
        { id: 'm2', params: { roofSlope: 30 } },
      ],
    }
    expect(extractAttemptParams(attempt)).toEqual({ wallHeight: 2.7, roofSlope: 30 })
  })

  it('later modules override earlier params with same key', () => {
    const attempt = {
      modules: [
        { params: { wallHeight: 2.7 } },
        { params: { wallHeight: 2.9 } },
      ],
    }
    expect(extractAttemptParams(attempt).wallHeight).toBe(2.9)
  })

  it('returns empty object for empty attempt', () => {
    expect(extractAttemptParams({})).toEqual({})
  })
})
