export const PLANS = [
  {
    id:       'starter',
    label:    'Starter',
    price:    60,
    embeds:   3,
    paypalKey: 'VITE_PAYPAL_PLAN_ID_STARTER',
  },
  {
    id:       'pro',
    label:    'Pro',
    price:    120,
    embeds:   9,
    paypalKey: 'VITE_PAYPAL_PLAN_ID_PRO',
    popular:  true,
  },
  {
    id:       'business',
    label:    'Business',
    price:    180,
    embeds:   18,
    paypalKey: 'VITE_PAYPAL_PLAN_ID_BUSINESS',
  },
  {
    id:         'enterprise',
    label:      'Enterprise',
    price:      680,
    embeds:     50,
    paypalKey:  'VITE_PAYPAL_PLAN_ID_ENTERPRISE',
  },
]

export const TRIAL_EMBED_LIMIT = 3

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
