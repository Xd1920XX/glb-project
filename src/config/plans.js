export const PLANS = [
  {
    id:           'starter',
    label:        'Starter',
    price:        19.99,
    embeds:       3,
    landingPages: 1,
    viewsPerMonth: 5000,
    storageGB:    1,
    paypalKey:    'VITE_PAYPAL_PLAN_ID_STARTER',
  },
  {
    id:           'pro',
    label:        'Pro',
    price:        69.99,
    embeds:       12,
    landingPages: 5,
    viewsPerMonth: 25000,
    storageGB:    5,
    paypalKey:    'VITE_PAYPAL_PLAN_ID_PRO',
    popular:      true,
  },
  {
    id:           'custom',
    label:        'Custom',
    price:        null,
    priceLabel:   'From €299',
    embeds:       null,
    landingPages: null,
    viewsPerMonth: null,
    storageGB:    null,
    paypalKey:    null,
    contactOnly:  true,
  },
]

export const TRIAL_DAYS               = 3
export const TRIAL_EMBED_LIMIT        = 3
export const TRIAL_LANDING_PAGE_LIMIT = 1

/** Returns true if the user is on trial AND the 3-day window has passed */
export function isTrialExpired(profile) {
  if (!profile) return false
  if (profile.subscriptionStatus !== 'trial') return false
  if (!profile.trialStarted) return false
  const started = profile.trialStarted.toDate?.() ?? new Date(profile.trialStarted)
  return Date.now() > started.getTime() + TRIAL_DAYS * 86400000
}

export function getPlan(id) {
  return PLANS.find((p) => p.id === id) ?? PLANS[0]
}

/** How many embeds this profile is allowed to publish. Infinity = unlimited. */
export function getEmbedLimit(profile) {
  if (!profile) return 0
  const { subscriptionStatus, planId } = profile
  if (subscriptionStatus === 'trial')  return TRIAL_EMBED_LIMIT
  if (subscriptionStatus === 'active') {
    const v = getPlan(planId).embeds
    return v == null ? Infinity : v
  }
  return 0
}

/** How many landing pages this profile is allowed to publish. Infinity = unlimited. */
export function getLandingPageLimit(profile) {
  if (!profile) return 0
  const { subscriptionStatus, planId } = profile
  if (subscriptionStatus === 'trial')  return TRIAL_LANDING_PAGE_LIMIT
  if (subscriptionStatus === 'active') {
    const v = getPlan(planId).landingPages
    return v == null ? Infinity : v
  }
  return 0
}
