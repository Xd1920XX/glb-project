// Rule engine — evaluates student attempt parameters against teacher-defined
// ruleTable ranges. Does NOT perform engineering calculations; only checks
// that each parameter value falls into pass / near-limit / fail bands.
//
// Rule shape:
//   {
//     id: 'wallHeight',
//     label: 'Seina kõrgus',
//     unit: 'm',
//     pass:      { min: 2.4, max: 3.0 },   // inclusive
//     nearLimit: { min: 2.2, max: 3.2 },   // inclusive, wraps pass band
//     // Anything outside nearLimit is fail.
//   }
//
// Evaluation result per rule: 'pass' | 'near-limit' | 'fail' | 'n/a'
//
// evaluateAttempt(rules, params) returns:
//   {
//     score: 0-100,
//     results: { [ruleId]: 'pass' | 'near-limit' | 'fail' | 'n/a' },
//     passCount, nearCount, failCount, naCount,
//   }

function classifyValue(rule, value) {
  if (value == null || Number.isNaN(Number(value))) return 'n/a'
  const v = Number(value)
  const pass = rule.pass
  const near = rule.nearLimit ?? rule.pass
  if (pass && v >= pass.min && v <= pass.max) return 'pass'
  if (near && v >= near.min && v <= near.max) return 'near-limit'
  return 'fail'
}

const WEIGHTS = { pass: 1, 'near-limit': 0.5, fail: 0, 'n/a': 0 }

export function evaluateAttempt(rules, params) {
  const results = {}
  let passCount = 0, nearCount = 0, failCount = 0, naCount = 0

  for (const rule of rules ?? []) {
    const status = classifyValue(rule, params?.[rule.id])
    results[rule.id] = status
    if (status === 'pass') passCount++
    else if (status === 'near-limit') nearCount++
    else if (status === 'fail') failCount++
    else naCount++
  }

  const total = (rules?.length ?? 0)
  const scored = total - naCount
  const weightedSum = passCount * WEIGHTS.pass + nearCount * WEIGHTS['near-limit']
  const score = scored === 0 ? 0 : Math.round((weightedSum / scored) * 100)

  return { score, results, passCount, nearCount, failCount, naCount }
}

// Helper: extract parameters from a stacked module attempt.
// Attempt.modules is an array of { id, type, position, params }; this flattens
// scalar params for rule lookup by ID.
export function extractAttemptParams(attempt) {
  const out = {}
  for (const m of attempt?.modules ?? []) {
    for (const [k, v] of Object.entries(m.params ?? {})) {
      out[k] = v
    }
  }
  return out
}
