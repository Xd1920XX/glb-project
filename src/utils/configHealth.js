/**
 * Configurator health check.
 *
 * Pure validator over a config object — returns { errors, warnings } lists.
 * Each entry: { path, message }
 *
 * `errors`   = will produce a broken runtime experience (missing GLB URL,
 *              matchLayerLabels pointing to a non-existent layer, etc.)
 * `warnings` = suspicious data that renders but is likely wrong (empty
 *              group, translation pointing at a stale id, etc.)
 */
export function checkConfigHealth(config) {
  const errors = []
  const warnings = []
  if (!config) return { errors, warnings }

  const err  = (path, message) => errors.push({ path, message })
  const warn = (path, message) => warnings.push({ path, message })

  const variants = config.variants ?? []
  if (variants.length === 0) warn('variants', 'No variants defined — configurator is empty.')

  for (const v of variants) {
    const vpath = `variants[${v.id}]`
    const vname = v.label || v.id
    if (!v.label) warn(vpath, `Variant "${v.id}" is missing a label.`)

    if (v.type === 'glb') {
      const layers = v.glbLayers ?? []
      if (layers.length === 0 && !v.glbUrl) {
        err(vpath, `Variant "${vname}" is type=glb but has no glbLayers or glbUrl.`)
      }
      for (const l of layers) {
        const lpath = `${vpath}.glbLayers[${l.id}]`
        if (!l.glbUrl) err(lpath, `Layer "${l.label || l.id}" (variant "${vname}") has no glbUrl.`)
        if (!l.label) warn(lpath, `Layer "${l.id}" (variant "${vname}") is missing a label.`)
      }

      const layerLabels = new Set(layers.map((l) => l.label).filter(Boolean))
      for (const g of v.partOptions ?? []) {
        const gpath = `${vpath}.partOptions[${g.id}]`
        if (!g.label) warn(gpath, `Part group "${g.id}" (variant "${vname}") is missing a label.`)
        if ((g.options?.length ?? 0) === 0) {
          warn(gpath, `Part group "${g.label || g.id}" has no options.`)
        }
        for (const ml of g.matchLayerLabels ?? []) {
          if (!layerLabels.has(ml)) {
            err(gpath, `matchLayerLabels: layer "${ml}" not found on variant "${vname}".`)
          }
        }
        for (const o of g.options ?? []) {
          const opath = `${gpath}.options[${o.id}]`
          if (!o.label) warn(opath, `Option "${o.id}" (group "${g.label || g.id}") is missing a label.`)
          if (!o.hidden && !o.glbUrl && !o.byLayer) {
            warn(opath, `Option "${o.label || o.id}" has no glbUrl or byLayer — will fall back to the layer default.`)
          }
        }
        if (g.defaultOptionId && !(g.options ?? []).some((o) => o.id === g.defaultOptionId)) {
          err(gpath, `defaultOptionId references a missing option.`)
        }
      }

      if (v.defaultColorOptionId && !(v.colorOptions ?? []).some((c) => c.id === v.defaultColorOptionId)) {
        err(vpath, `defaultColorOptionId references a missing color option.`)
      }
      for (const c of v.colorOptions ?? []) {
        if (!c.label) warn(`${vpath}.colorOptions[${c.id}]`, `Color option "${c.id}" is missing a label.`)
      }
    } else if (v.type === 'spinner') {
      if ((v.frames?.length ?? 0) === 0) {
        err(vpath, `Spinner variant "${vname}" has no frames.`)
      }
    }
  }

  const variantIds = new Set(variants.map((v) => v.id))
  const groupIds   = new Set((config.variantGroups ?? []).map((g) => g.id))

  for (const g of config.variantGroups ?? []) {
    const gpath = `variantGroups[${g.id}]`
    const gname = g.label || g.id
    const groupHasVariants = variants.some((v) => (v.groupId || null) === g.id)
    if (!groupHasVariants) warn(gpath, `Group "${gname}" has no variants assigned.`)
    if (g.dependsOnVariantId && !variantIds.has(g.dependsOnVariantId)) {
      err(gpath, `dependsOnVariantId references a missing variant.`)
    }
  }

  const interiorIds = new Set((config.interiors ?? []).map((i) => i.id))
  for (const i of config.interiors ?? []) {
    const ipath = `interiors[${i.id}]`
    if (!i.panoramaUrl) err(ipath, `Interior "${i.label || i.id}" is missing panoramaUrl.`)
    if (!i.label) warn(ipath, `Interior "${i.id}" is missing a label.`)
  }

  const hotspotIds = new Set((config.hotspots ?? []).map((h) => h.id))

  for (const [loc, dict] of Object.entries(config.translations ?? {})) {
    const lpath = `translations[${loc}]`
    if (!dict || typeof dict !== 'object') continue

    for (const gid of Object.keys(dict.variantGroups ?? {})) {
      if (!groupIds.has(gid)) {
        warn(`${lpath}.variantGroups[${gid}]`, `Translation refers to a non-existent variantGroup.`)
      }
    }
    for (const [vid, vDict] of Object.entries(dict.variants ?? {})) {
      if (!variantIds.has(vid)) {
        warn(`${lpath}.variants[${vid}]`, `Translation refers to a non-existent variant.`)
        continue
      }
      const v = variants.find((x) => x.id === vid)
      for (const cid of Object.keys(vDict.colorOptions ?? {})) {
        if (!(v.colorOptions ?? []).some((c) => c.id === cid)) {
          warn(`${lpath}.variants[${vid}].colorOptions[${cid}]`, 'Translation refers to a non-existent color option.')
        }
      }
      for (const [pgid, pgDict] of Object.entries(vDict.partOptions ?? {})) {
        const pg = (v.partOptions ?? []).find((g) => g.id === pgid)
        if (!pg) {
          warn(`${lpath}.variants[${vid}].partOptions[${pgid}]`, 'Translation refers to a non-existent partOption group.')
          continue
        }
        for (const oid of Object.keys(pgDict.options ?? {})) {
          if (!(pg.options ?? []).some((o) => o.id === oid)) {
            warn(`${lpath}.variants[${vid}].partOptions[${pgid}].options[${oid}]`, 'Translation refers to a non-existent option.')
          }
        }
      }
      for (const lid of Object.keys(vDict.glbLayers ?? {})) {
        if (!(v.glbLayers ?? []).some((l) => l.id === lid)) {
          warn(`${lpath}.variants[${vid}].glbLayers[${lid}]`, 'Translation refers to a non-existent layer.')
        }
      }
    }
    for (const iid of Object.keys(dict.interiors ?? {})) {
      if (!interiorIds.has(iid)) {
        warn(`${lpath}.interiors[${iid}]`, 'Translation refers to a non-existent interior.')
      }
    }
    for (const hid of Object.keys(dict.hotspots ?? {})) {
      if (!hotspotIds.has(hid)) {
        warn(`${lpath}.hotspots[${hid}]`, 'Translation refers to a non-existent hotspot.')
      }
    }
  }

  return { errors, warnings }
}
