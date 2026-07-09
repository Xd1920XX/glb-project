/**
 * Embed API — parent ↔ iframe integration.
 *
 * Outgoing events (iframe → parent):
 *   glbc:ready              { configId, name, groups, hasOrder }
 *   glbc:selectionChanged   { selection }
 *   glbc:orderSubmitted     { orderId, snapshotUrl, stateUrl, selection, formData }
 *
 * Incoming events (parent → iframe):
 *   glbc:setSelection       { selection }
 *   glbc:patchSelection     { selection } — merged into current
 *   glbc:submitOrder        { formData } — programmatic order submit (optional)
 *
 * Selection shape:
 *   {
 *     variants: { [groupId]: variantId },
 *     color: string|null,
 *     partOptions: { [groupLabel]: optionLabel },
 *     interiorId: string|null,
 *     view: 'exterior' | 'interior' | 'order',
 *     layers: { [layerId]: boolean }
 *   }
 */

const EVENT_PREFIX = 'glbc:'

export function postToParent(type, payload) {
  if (typeof window === 'undefined' || window.parent === window) return
  try {
    window.parent.postMessage({ type: EVENT_PREFIX + type, payload }, '*')
  } catch (err) {
    console.warn('postToParent failed', err)
  }
}

export function onParentMessage(handler) {
  if (typeof window === 'undefined') return () => {}
  function listener(event) {
    const data = event.data
    if (!data || typeof data.type !== 'string' || !data.type.startsWith(EVENT_PREFIX)) return
    const type = data.type.slice(EVENT_PREFIX.length)
    handler(type, data.payload, event)
  }
  window.addEventListener('message', listener)
  return () => window.removeEventListener('message', listener)
}

function safeBase64Decode(s) {
  if (typeof atob !== 'function') return null
  try {
    return JSON.parse(decodeURIComponent(escape(atob(s))))
  } catch {
    try { return JSON.parse(atob(s)) } catch { return null }
  }
}

export function safeBase64Encode(obj) {
  const json = JSON.stringify(obj)
  if (typeof btoa !== 'function') return ''
  try { return btoa(unescape(encodeURIComponent(json))) }
  catch { return btoa(json) }
}

/**
 * Parse selection from URL query params.
 * Supports:
 *   ?state=<base64-json>          full selection
 *   ?variant=<id>                 sets first group's variant
 *   ?variants.<groupId>=<id>      per-group variant (use bracket: variants[gid]=id also accepted)
 *   ?color=<label>                color label
 *   ?part.<groupLabel>=<option>   part option per group
 *   ?interior=<id>                interior id
 *   ?view=exterior|interior|order tab
 */
export function parseSelectionFromQuery(searchString) {
  if (!searchString) return null
  const params = new URLSearchParams(searchString.startsWith('?') ? searchString.slice(1) : searchString)

  const state = params.get('state')
  if (state) {
    const decoded = safeBase64Decode(state)
    if (decoded && typeof decoded === 'object') return decoded
  }

  const selection = {}
  const variants = {}
  const partOptions = {}
  const layers = {}

  for (const [key, value] of params.entries()) {
    if (key === 'variant') {
      // Defer mapping to first group at apply-time; signal via __firstGroupVariant
      selection.__firstGroupVariant = value
    } else if (key.startsWith('variants.') || key.startsWith('variants[')) {
      const m = key.match(/variants[.[]([^\].]+)\]?$/)
      if (m) variants[m[1]] = value
    } else if (key === 'color') {
      selection.color = value
    } else if (key.startsWith('part.') || key.startsWith('part[')) {
      const m = key.match(/part[.[]([^\]]+)\]?$/)
      if (m) partOptions[m[1]] = value
    } else if (key === 'interior') {
      selection.interiorId = value
    } else if (key === 'view') {
      // Accept built-in tabs plus any custom view alias, e.g. view=custom:<id>
      if (['exterior', 'interior', 'order'].includes(value) || value.startsWith('custom:')) {
        selection.view = value
      }
    } else if (key.startsWith('layer.') || key.startsWith('layer[')) {
      const m = key.match(/layer[.[]([^\]]+)\]?$/)
      if (m) layers[m[1]] = value === 'true' || value === '1' || value === 'on'
    }
  }

  if (Object.keys(variants).length) selection.variants = variants
  if (Object.keys(partOptions).length) selection.partOptions = partOptions
  if (Object.keys(layers).length) selection.layers = layers

  return Object.keys(selection).length ? selection : null
}

/**
 * Build a flat (human-readable) query string from a Selection object.
 * Prefer this over `selectionToQuery` when sharing readable links.
 */
export function selectionToFlatQuery(selection) {
  if (!selection) return ''
  const params = new URLSearchParams()
  if (selection.variants) {
    for (const [gid, vid] of Object.entries(selection.variants)) {
      if (vid != null) params.set(`variants.${gid}`, vid)
    }
  }
  if (selection.color) params.set('color', selection.color)
  if (selection.partOptions) {
    for (const [label, opt] of Object.entries(selection.partOptions)) {
      if (opt != null) params.set(`part.${label}`, opt)
    }
  }
  if (selection.interiorId) params.set('interior', selection.interiorId)
  if (selection.view) params.set('view', selection.view)
  if (selection.layers) {
    for (const [lid, on] of Object.entries(selection.layers)) {
      params.set(`layer.${lid}`, on ? 'true' : 'false')
    }
  }
  const qs = params.toString()
  return qs ? '?' + qs : ''
}

/**
 * Convert a selection object back to a URL query string (for stateUrl / share links).
 */
export function selectionToQuery(selection) {
  if (!selection) return ''
  return '?state=' + encodeURIComponent(safeBase64Encode(selection))
}

/**
 * Reconstruct a selection object from an order doc's `selections` snapshot.
 *
 * New format (id-based, survives translation label changes):
 *   { modelIds: { [gid]: vid }, colorId, partOptionIds: { [grpId]: optId } }
 * Legacy format (label-based, kept for orders saved before ID snapshot):
 *   { model: { [groupLabel]: variantLabel }, color, partOptions: { [grpLabel]: optLabel } }
 *
 * Prefer ids when present. ConfiguratorRenderer state is label-based, so we
 * translate ids → labels via the current (possibly translated) config so the
 * restored selection matches whatever labels the user sees now.
 */
export function selectionFromOrder(order, config) {
  if (!order?.selections || !config) return null
  const sel = {}
  const variants = {}
  const s = order.selections

  // Variants — prefer IDs
  if (s.modelIds && typeof s.modelIds === 'object') {
    for (const [gid, vid] of Object.entries(s.modelIds)) {
      const v = (config.variants || []).find((x) => x.id === vid)
      if (v) variants[gid] = v.id
    }
  } else if (s.model && typeof s.model === 'object') {
    for (const [groupLabel, variantLabel] of Object.entries(s.model)) {
      const group = (config.variantGroups || []).find((g) => g.label === groupLabel)
      const gid = group?.id ?? '__default__'
      const v = (config.variants || []).find((x) => x.label === variantLabel && (x.groupId || '__default__') === gid)
      if (v) variants[gid] = v.id
    }
  }
  if (Object.keys(variants).length) sel.variants = variants

  // Determine active variant so we can scope color/partOption lookups to it
  const activeVid = Object.values(variants)[0] ?? null
  const activeVariant = activeVid
    ? (config.variants || []).find((v) => v.id === activeVid)
    : null

  // Color — prefer ID, translate back to current label
  if (s.colorId && activeVariant) {
    const c = (activeVariant.colorOptions || []).find((o) => o.id === s.colorId)
    if (c) sel.color = c.label
  } else if (s.color) {
    sel.color = s.color
  }

  // partOptions — prefer IDs, translate back to current labels
  if (s.partOptionIds && typeof s.partOptionIds === 'object' && activeVariant) {
    const partOptions = {}
    for (const grp of activeVariant.partOptions || []) {
      const optId = s.partOptionIds[grp.id]
      if (!optId) continue
      const opt = (grp.options || []).find((o) => o.id === optId)
      if (opt) partOptions[grp.label] = opt.label
    }
    if (Object.keys(partOptions).length) sel.partOptions = partOptions
  } else if (s.partOptions) {
    sel.partOptions = { ...s.partOptions }
  }

  if (order.interiorId) sel.interiorId = order.interiorId
  return Object.keys(sel).length ? sel : null
}

/**
 * Resolve __firstGroupVariant alias against actual config groups.
 * Mutates and returns the same object.
 */
export function resolveSelectionAgainstConfig(selection, config) {
  if (!selection || !config) return selection
  if (selection.__firstGroupVariant) {
    const firstGroup = (config.variantGroups || []).find((g) =>
      (config.variants || []).some((v) => (v.groupId || '__default__') === g.id)
    )
    const gid = firstGroup?.id ?? '__default__'
    selection.variants = { ...(selection.variants || {}), [gid]: selection.__firstGroupVariant }
    delete selection.__firstGroupVariant
  }
  return selection
}
