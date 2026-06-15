/**
 * Per-configurator translation system.
 *
 * Schema:
 *   config.translations = {
 *     [locale]: {
 *       name?: string,
 *       exteriorLabel?: string,
 *       interiorLabel?: string,
 *       variantGroups?: { [groupId]: { label?: string } },
 *       variants?: { [variantId]: {
 *         label?: string,
 *         swatchImageUrl?:  string,          // assets — per-locale swatch image
 *         swatchStoragePath?: string,
 *         colorOptions?: { [colorId]: {
 *           label?: string,
 *           swatchImageUrl?:   string,        // per-locale color swatch
 *           swatchStoragePath?: string,
 *         } },
 *         partOptions?:  { [partGroupId]: {
 *           label?: string,
 *           options?: { [optionId]: {
 *             label?: string,
 *             swatchImageUrl?:    string,     // per-locale part swatch
 *             swatchStoragePath?: string,
 *           } },
 *         } },
 *         glbLayers?: { [layerId]: {
 *           label?: string,
 *           glbUrl?:         string,          // assets — per-locale GLB file
 *           glbStoragePath?: string,
 *         } },
 *       } },
 *       interiors?:    { [interiorId]: { label?: string, panoramaUrl?: string, panoramaStoragePath?: string } },
 *       hotspots?:     { [hotspotId]: { label?: string, description?: string } },
 *       orderForm?: {
 *         submitLabel?: string,
 *         successMessage?: string,
 *         fields?: { [fieldId]: { label?: string } },
 *       },
 *     }
 *   }
 *
 * Missing keys fall back to the original value in the config root.
 */

function pick(translation, fallback) {
  return (typeof translation === 'string' && translation.trim()) ? translation : fallback
}

// Apply both label + per-locale swatch overrides to a single option-like node.
function overlayOption(item, T) {
  if (!T) return item
  const out = { ...item }
  if (T.label) out.label = pick(T.label, item.label)
  if (T.swatchImageUrl) {
    out.swatchImageUrl = pick(T.swatchImageUrl, item.swatchImageUrl)
    if (T.swatchStoragePath) out.swatchStoragePath = T.swatchStoragePath
    // When a translated swatch image is provided, ensure swatchType resolves to image
    if (!out.swatchType || out.swatchType === 'image') out.swatchType = 'image'
  }
  return out
}

/**
 * Return a shallow-cloned config with strings overridden by translations[locale].
 * Pure function: input config is not mutated.
 * If locale is missing/empty or no translation block exists, returns config unchanged.
 */
export function applyConfigTranslations(config, locale) {
  if (!config || !locale) return config
  const T = config.translations?.[locale]
  if (!T) return config

  const out = { ...config }

  if (T.name)          out.name          = pick(T.name,          config.name)
  if (T.exteriorLabel) out.exteriorLabel = pick(T.exteriorLabel, config.exteriorLabel)
  if (T.interiorLabel) out.interiorLabel = pick(T.interiorLabel, config.interiorLabel)

  if (Array.isArray(config.variantGroups)) {
    out.variantGroups = config.variantGroups.map((g) => {
      const TG = T.variantGroups?.[g.id]
      if (!TG) return g
      return { ...g, label: pick(TG.label, g.label) }
    })
  }

  if (Array.isArray(config.variants)) {
    out.variants = config.variants.map((v) => {
      const TV = T.variants?.[v.id]
      if (!TV) return v
      let nv = overlayOption(v, TV)
      if (Array.isArray(v.colorOptions)) {
        nv.colorOptions = v.colorOptions.map((c) => overlayOption(c, TV.colorOptions?.[c.id]))
      }
      if (Array.isArray(v.partOptions)) {
        nv.partOptions = v.partOptions.map((grp) => {
          const TPG = TV.partOptions?.[grp.id]
          if (!TPG) return grp
          const ng = { ...grp, label: pick(TPG.label, grp.label) }
          if (Array.isArray(grp.options)) {
            ng.options = grp.options.map((o) => overlayOption(o, TPG.options?.[o.id]))
          }
          return ng
        })
      }
      if (Array.isArray(v.glbLayers)) {
        nv.glbLayers = v.glbLayers.map((l) => {
          const TL = TV.glbLayers?.[l.id]
          if (!TL) return l
          const nl = { ...l, label: pick(TL.label, l.label) }
          if (TL.glbUrl) {
            nl.glbUrl = TL.glbUrl
            if (TL.glbStoragePath) nl.glbStoragePath = TL.glbStoragePath
          }
          return nl
        })
      }
      return nv
    })
  }

  if (Array.isArray(config.interiors)) {
    out.interiors = config.interiors.map((i) => {
      const TI = T.interiors?.[i.id]
      if (!TI) return i
      const ni = { ...i, label: pick(TI.label, i.label) }
      if (TI.panoramaUrl) {
        ni.panoramaUrl = TI.panoramaUrl
        if (TI.panoramaStoragePath) ni.panoramaStoragePath = TI.panoramaStoragePath
      }
      return ni
    })
  }

  if (Array.isArray(config.hotspots)) {
    out.hotspots = config.hotspots.map((h) => {
      const TH = T.hotspots?.[h.id]
      if (!TH) return h
      return { ...h, label: pick(TH.label, h.label), description: pick(TH.description, h.description) }
    })
  }

  if (config.orderForm) {
    const TOF = T.orderForm
    if (TOF) {
      const nOF = { ...config.orderForm }
      if (TOF.submitLabel)     nOF.submitLabel     = pick(TOF.submitLabel,     config.orderForm.submitLabel)
      if (TOF.successMessage)  nOF.successMessage  = pick(TOF.successMessage,  config.orderForm.successMessage)
      if (Array.isArray(config.orderForm.fields)) {
        nOF.fields = config.orderForm.fields.map((f) => {
          const TF = TOF.fields?.[f.id]
          return TF ? { ...f, label: pick(TF.label, f.label) } : f
        })
      }
      out.orderForm = nOF
    }
  }

  return out
}

/**
 * Extract every translatable string from a config — used by the Translations
 * editor to know which fields to surface to the owner.
 *
 * Returns:
 *   {
 *     name, exteriorLabel, interiorLabel,
 *     variantGroups: [{ id, label }],
 *     variants: [{ id, label, colorOptions:[…], partOptions:[…], glbLayers:[…] }],
 *     interiors: [{ id, label }],
 *     hotspots:  [{ id, label, description }],
 *     orderForm: { submitLabel, successMessage, fields: [{ id, label }] },
 *   }
 */
export function extractTranslatable(config) {
  if (!config) return null
  return {
    name: config.name ?? '',
    exteriorLabel: config.exteriorLabel ?? '',
    interiorLabel: config.interiorLabel ?? '',
    variantGroups: (config.variantGroups ?? []).map((g) => ({ id: g.id, label: g.label ?? '' })),
    variants: (config.variants ?? []).map((v) => ({
      id: v.id,
      label: v.label ?? '',
      swatchImageUrl: v.swatchImageUrl ?? '',
      colorOptions: (v.colorOptions ?? []).map((c) => ({
        id: c.id, label: c.label ?? '', swatchImageUrl: c.swatchImageUrl ?? '',
      })),
      partOptions: (v.partOptions ?? []).map((g) => ({
        id: g.id,
        label: g.label ?? '',
        options: (g.options ?? []).map((o) => ({
          id: o.id, label: o.label ?? '', swatchImageUrl: o.swatchImageUrl ?? '',
        })),
      })),
      glbLayers: (v.glbLayers ?? []).map((l) => ({
        id: l.id,
        label: l.label ?? '',
        glbUrl: l.glbUrl ?? '',
        togglable: !!l.togglable,
      })),
    })),
    interiors: (config.interiors ?? []).map((i) => ({
      id: i.id, label: i.label ?? '', panoramaUrl: i.panoramaUrl ?? '',
    })),
    hotspots:  (config.hotspots  ?? []).map((h) => ({ id: h.id, label: h.label ?? '', description: h.description ?? '' })),
    orderForm: config.orderForm ? {
      submitLabel:    config.orderForm.submitLabel ?? '',
      successMessage: config.orderForm.successMessage ?? '',
      fields: (config.orderForm.fields ?? []).map((f) => ({ id: f.id, label: f.label ?? '' })),
    } : null,
  }
}
