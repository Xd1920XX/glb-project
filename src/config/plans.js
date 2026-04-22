export const PLANS = [
  {
    id:           'starter',
    label:        'Starter',
    price:        60,
    embeds:       3,
    landingPages: 1,
    paypalKey:    'VITE_PAYPAL_PLAN_ID_STARTER',
  },
  {
    id:           'pro',
    label:        'Pro',
    price:        120,
    embeds:       9,
    landingPages: 3,
    paypalKey:    'VITE_PAYPAL_PLAN_ID_PRO',
    popular:      true,
  },
  {
    id:           'business',
    label:        'Business',
    price:        180,
    embeds:       18,
    landingPages: 5,
    paypalKey:    'VITE_PAYPAL_PLAN_ID_BUSINESS',
  },
  {
    id:           'enterprise',
    label:        'Enterprise',
    price:        680,
    embeds:       50,
    landingPages: 10,
    paypalKey:    'VITE_PAYPAL_PLAN_ID_ENTERPRISE',
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

/** How many embeds this profile is allowed to publish */
export function getEmbedLimit(profile) {
  if (!profile) return 0
  const { subscriptionStatus, planId } = profile
  if (subscriptionStatus === 'trial')  return TRIAL_EMBED_LIMIT
  if (subscriptionStatus === 'active') return getPlan(planId).embeds
  return 0
}

/** How many landing pages this profile is allowed to publish */
export function getLandingPageLimit(profile) {
  if (!profile) return 0
  const { subscriptionStatus, planId } = profile
  if (subscriptionStatus === 'trial')  return TRIAL_LANDING_PAGE_LIMIT
  if (subscriptionStatus === 'active') return getPlan(planId).landingPages
  return 0
}
