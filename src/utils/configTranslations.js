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
 *         colorOptions?: { [colorId]: { label?: string } },
 *         partOptions?:  { [partGroupId]: {
 *           label?: string,
 *           options?: { [optionId]: { label?: string } },
 *         } },
 *         glbLayers?: { [layerId]: { label?: string } },
 *       } },
 *       interiors?:    { [interiorId]: { label?: string } },
 *       hotspots?:     { [hotspotId]: { label?: string, description?: string } },
 *       orderForm?: {
 *         submitLabel?: string,
 *         successMessage?: string,
 *         fields?: { [fieldId]: { label?: string } },
 *       },
 *     }
 *   }
 *
 * Missing keys fall back to the original string in the config root.
 */

function pick(translation, fallback) {
  return (typeof translation === 'string' && translation.trim()) ? translation : fallback
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
      const nv = { ...v, label: pick(TV.label, v.label) }
      if (Array.isArray(v.colorOptions)) {
        nv.colorOptions = v.colorOptions.map((c) => {
          const TC = TV.colorOptions?.[c.id]
          return TC ? { ...c, label: pick(TC.label, c.label) } : c
        })
      }
      if (Array.isArray(v.partOptions)) {
        nv.partOptions = v.partOptions.map((grp) => {
          const TPG = TV.partOptions?.[grp.id]
          if (!TPG) return grp
          const ng = { ...grp, label: pick(TPG.label, grp.label) }
          if (Array.isArray(grp.options)) {
            ng.options = grp.options.map((o) => {
              const TPO = TPG.options?.[o.id]
              return TPO ? { ...o, label: pick(TPO.label, o.label) } : o
            })
          }
          return ng
        })
      }
      if (Array.isArray(v.glbLayers)) {
        nv.glbLayers = v.glbLayers.map((l) => {
          const TL = TV.glbLayers?.[l.id]
          return TL ? { ...l, label: pick(TL.label, l.label) } : l
        })
      }
      return nv
    })
  }

  if (Array.isArray(config.interiors)) {
    out.interiors = config.interiors.map((i) => {
      const TI = T.interiors?.[i.id]
      return TI ? { ...i, label: pick(TI.label, i.label) } : i
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
      colorOptions: (v.colorOptions ?? []).map((c) => ({ id: c.id, label: c.label ?? '' })),
      partOptions: (v.partOptions ?? []).map((g) => ({
        id: g.id,
        label: g.label ?? '',
        options: (g.options ?? []).map((o) => ({ id: o.id, label: o.label ?? '' })),
      })),
      glbLayers: (v.glbLayers ?? []).filter((l) => l.togglable).map((l) => ({ id: l.id, label: l.label ?? '' })),
    })),
    interiors: (config.interiors ?? []).map((i) => ({ id: i.id, label: i.label ?? '' })),
    hotspots:  (config.hotspots  ?? []).map((h) => ({ id: h.id, label: h.label ?? '', description: h.description ?? '' })),
    orderForm: config.orderForm ? {
      submitLabel:    config.orderForm.submitLabel ?? '',
      successMessage: config.orderForm.successMessage ?? '',
      fields: (config.orderForm.fields ?? []).map((f) => ({ id: f.id, label: f.label ?? '' })),
    } : null,
  }
}
