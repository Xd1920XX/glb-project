import { describe, it, expect } from 'vitest'
import {
  PLANS,
  TRIAL_DAYS,
  TRIAL_EMBED_LIMIT,
  TRIAL_LANDING_PAGE_LIMIT,
  isTrialExpired,
  getPlan,
  getEmbedLimit,
  getLandingPageLimit,
} from './plans.js'

// helper — returns a Firestore-like Timestamp that is `daysAgo` days in the past
function makeTimestamp(daysAgo) {
  const d = new Date(Date.now() - daysAgo * 86400000)
  return { toDate: () => d }
}

describe('PLANS', () => {
  it('has four plans', () => {
    expect(PLANS).toHaveLength(4)
  })

  it('every plan has required fields', () => {
    for (const plan of PLANS) {
      expect(plan).toHaveProperty('id')
      expect(plan).toHaveProperty('price')
      expect(plan).toHaveProperty('embeds')
      expect(plan).toHaveProperty('landingPages')
    }
  })

  it('pro plan is marked popular', () => {
    const pro = PLANS.find((p) => p.id === 'pro')
    expect(pro.popular).toBe(true)
  })
})

describe('constants', () => {
  it('TRIAL_DAYS is 3', () => {
    expect(TRIAL_DAYS).toBe(3)
  })

  it('TRIAL_EMBED_LIMIT is 3', () => {
    expect(TRIAL_EMBED_LIMIT).toBe(3)
  })

  it('TRIAL_LANDING_PAGE_LIMIT is 1', () => {
    expect(TRIAL_LANDING_PAGE_LIMIT).toBe(1)
  })
})

describe('getPlan', () => {
  it('returns the correct plan by id', () => {
    expect(getPlan('pro').id).toBe('pro')
    expect(getPlan('business').id).toBe('business')
    expect(getPlan('enterprise').id).toBe('enterprise')
  })

  it('returns the first plan when id is unknown', () => {
    expect(getPlan('unknown')).toBe(PLANS[0])
    expect(getPlan(undefined)).toBe(PLANS[0])
  })
})

describe('isTrialExpired', () => {
  it('returns false when profile is null', () => {
    expect(isTrialExpired(null)).toBe(false)
  })

  it('returns false for a non-trial subscription', () => {
    expect(isTrialExpired({ subscriptionStatus: 'active' })).toBe(false)
  })

  it('returns false when trialStarted is missing', () => {
    expect(isTrialExpired({ subscriptionStatus: 'trial' })).toBe(false)
  })

  it('returns false when trial has not expired yet (1 day in)', () => {
    const profile = {
      subscriptionStatus: 'trial',
      trialStarted: makeTimestamp(1),
    }
    expect(isTrialExpired(profile)).toBe(false)
  })

  it('returns true when trial has expired (4 days in)', () => {
    const profile = {
      subscriptionStatus: 'trial',
      trialStarted: makeTimestamp(4),
    }
    expect(isTrialExpired(profile)).toBe(true)
  })

  it('returns false exactly on the trial boundary (3 days - 1 minute)', () => {
    const justUnder = new Date(Date.now() - TRIAL_DAYS * 86400000 + 60000)
    const profile = {
      subscriptionStatus: 'trial',
      trialStarted: { toDate: () => justUnder },
    }
    expect(isTrialExpired(profile)).toBe(false)
  })

  it('accepts a plain Date object in trialStarted (no toDate method)', () => {
    const expiredDate = new Date(Date.now() - 5 * 86400000)
    const profile = {
      subscriptionStatus: 'trial',
      trialStarted: expiredDate,
    }
    expect(isTrialExpired(profile)).toBe(true)
  })
})

describe('getEmbedLimit', () => {
  it('returns 0 when profile is null', () => {
    expect(getEmbedLimit(null)).toBe(0)
  })

  it('returns TRIAL_EMBED_LIMIT for trial users', () => {
    expect(getEmbedLimit({ subscriptionStatus: 'trial' })).toBe(TRIAL_EMBED_LIMIT)
  })

  it('returns plan embeds for active users', () => {
    const profile = { subscriptionStatus: 'active', planId: 'pro' }
    const pro = getPlan('pro')
    expect(getEmbedLimit(profile)).toBe(pro.embeds)
  })

  it('returns 0 for cancelled users', () => {
    expect(getEmbedLimit({ subscriptionStatus: 'cancelled', planId: 'pro' })).toBe(0)
  })

  it('returns 0 for past_due users', () => {
    expect(getEmbedLimit({ subscriptionStatus: 'past_due', planId: 'pro' })).toBe(0)
  })

  it('returns correct limit for each active plan', () => {
    for (const plan of PLANS) {
      const profile = { subscriptionStatus: 'active', planId: plan.id }
      expect(getEmbedLimit(profile)).toBe(plan.embeds)
    }
  })
})

describe('getLandingPageLimit', () => {
  it('returns 0 when profile is null', () => {
    expect(getLandingPageLimit(null)).toBe(0)
  })

  it('returns TRIAL_LANDING_PAGE_LIMIT for trial users', () => {
    expect(getLandingPageLimit({ subscriptionStatus: 'trial' })).toBe(TRIAL_LANDING_PAGE_LIMIT)
  })

  it('returns plan landingPages for active users', () => {
    const profile = { subscriptionStatus: 'active', planId: 'business' }
    const business = getPlan('business')
    expect(getLandingPageLimit(profile)).toBe(business.landingPages)
  })

  it('returns 0 for cancelled users', () => {
    expect(getLandingPageLimit({ subscriptionStatus: 'cancelled', planId: 'pro' })).toBe(0)
  })
})
