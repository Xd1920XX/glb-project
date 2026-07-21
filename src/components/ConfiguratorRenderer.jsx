import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useGLTF } from '@react-three/drei'
import { InteriorViewer } from './InteriorViewer.jsx'
import { SaunaViewer3D, LIGHT_PRESETS } from './SaunaViewer3D.jsx'
import { ARButton } from './ARButton.jsx'
import { saveOrder, updateOrder } from '../firebase/db.js'
import { uploadOrderSnapshot } from '../firebase/storage.js'
import { postToParent, onParentMessage, resolveSelectionAgainstConfig, selectionToQuery } from '../embed/embedApi.js'
import { LOCALES } from '../i18n/index.jsx'

// ── Group helpers ────────────────────────────────────────────────────

const DEFAULT_GROUP_ID = '__default__'

function computeGroups(variants, variantGroups) {
  const grouped = {}
  for (const v of variants) {
    const gid = v.groupId || DEFAULT_GROUP_ID
    if (!grouped[gid]) grouped[gid] = []
    grouped[gid].push(v)
  }
  // Named groups first (only those that have variants)
  const named = variantGroups
    .filter((g) => (grouped[g.id]?.length ?? 0) > 0)
    .map((g) => ({ ...g, variants: grouped[g.id] }))
  // Unassigned variants go to a default group (no label)
  if (grouped[DEFAULT_GROUP_ID]?.length) {
    named.push({ id: DEFAULT_GROUP_ID, label: '', dependsOnVariantId: null, variants: grouped[DEFAULT_GROUP_ID] })
  }
  return named
}

function computeVisibleGroups(groups, selectedByGroup) {
  return groups.filter((g) => {
    if (!g.dependsOnVariantId) return true
    return Object.values(selectedByGroup).includes(g.dependsOnVariantId)
  })
}

/**
 * Generic configurator renderer.
 * config = { variants, interiors, background, viewerSettings, variantGroups, hotspots, watermark }
 */
export function ConfiguratorRenderer({ config, hotspotPlaceId = null, onHotspotPlace = null, initialSelection = null, enableEmbedApi = false, locales = null, currentLocale = null, onLocaleChange = null, onSelectionChange = null }) {
  const { variants = [], interiors = [], background, viewerSettings = {}, exteriorLabel, interiorLabel, orderForm, theme = 'minimal', darkMode = false, themeColors = {}, variantGroups = [], hotspots = [], watermark, hideInteriorTab = false, hide3DButton = false, enableLightingControl = false, customViews = [] } = config

  const resolvedInitial = useMemo(
    () => initialSelection ? resolveSelectionAgainstConfig({ ...initialSelection }, config) : null,
    [initialSelection, config]
  )
  const viewerPaneRef = useRef(null)

  const extLabel = exteriorLabel || 'Exterior'
  const intLabel = interiorLabel || 'Interior'

  // Build ordered tab list for prev/next navigation.
  // Custom views appear between Interior and Order.
  const customViewTabs = (customViews ?? []).map((cv) => `custom:${cv.id}`)
  const tabs = [
    ...(variants.length > 0                       ? ['exterior'] : []),
    ...(!hideInteriorTab && interiors.length > 0  ? ['interior'] : []),
    ...customViewTabs,
    ...(orderForm?.enabled                        ? ['order']    : []),
  ]

  const [view, setView]               = useState(resolvedInitial?.view && tabs.includes(resolvedInitial.view) ? resolvedInitial.view : (tabs[0] ?? 'exterior'))
  const [selectedByGroup, setSelectedByGroup] = useState(resolvedInitial?.variants ?? {})
  const [activeGroupId, setActiveGroupId]     = useState(null)
  const [frameIndex, setFrameIndex]   = useState(0)
  const [show3D, setShow3D]           = useState(false)
  const [interiorId, setInteriorId]   = useState(resolvedInitial?.interiorId ?? interiors[0]?.id ?? null)
  const [orderData, setOrderData]     = useState({})
  const [orderSubmitted, setOrderSubmitted] = useState(false)
  const [layerVisByVariant, setLayerVisByVariant] = useState({})
  // partSel + colorSel persist across variant switches.
  // partSel:  group.label → option.label
  // colorSel: color.label (e.g. 'Natural' | 'Dark')
  const [partSel, setPartSel] = useState(resolvedInitial?.partOptions ?? {})
  const [colorSel, setColorSel] = useState(resolvedInitial?.color ?? null)
  // Progressive disclosure: hide partOptions until model picked,
  // show only first partOption group until that's picked too.
  // If an external selection is provided (via URL/postMessage/order link),
  // skip disclosure gates so all chosen state is rendered immediately.
  // When viewerSettings.expandAllOptions is true, disclosure is disabled per-config.
  const hasInitialSel = !!resolvedInitial
  const expandAllOptions = viewerSettings?.expandAllOptions ?? false
  const [modelTouched, setModelTouched]         = useState(hasInitialSel || expandAllOptions)
  const [firstPartTouched, setFirstPartTouched] = useState(hasInitialSel || expandAllOptions)
  // User-selectable lighting preset (when enableLightingControl is on)
  const [lightPresetKey, setLightPresetKey]     = useState(null)
  // Animation override (when viewerSettings.glbEnableAnimationControls is on)
  const [animPlaying, setAnimPlaying]   = useState(true)
  const [animSpeed, setAnimSpeed]       = useState(1)
  const [animRestartKey, setAnimRestartKey] = useState(0)
  const [panelCollapsed, setPanelCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    // Only honour ?panel URL param when rendered in the public embed —
    // avoids Builder preview accidentally hiding its panel on shared URLs.
    if (!window.location.pathname.startsWith('/embed/')) return false
    const p = new URLSearchParams(window.location.search)
    const v = p.get('panel')
    return v === 'hidden' || v === 'collapsed' || v === 'none'
  })

  // Compute groups
  const allGroups = useMemo(() => computeGroups(variants, variantGroups), [variants, variantGroups])
  const visibleGroups = useMemo(() => computeVisibleGroups(allGroups, selectedByGroup), [allGroups, selectedByGroup])

  // Initialize / update selection state when groups change
  useEffect(() => {
    setSelectedByGroup((prev) => {
      const next = {}
      for (const g of allGroups) {
        if (g.variants.length > 0) {
          const kept = prev[g.id] && g.variants.find((v) => v.id === prev[g.id])
          next[g.id] = kept ? prev[g.id] : g.variants[0].id
        }
      }
      return next
    })
    // Default active group = first group on mount or when groups change
    setActiveGroupId((prev) => {
      if (prev && allGroups.find((g) => g.id === prev)) return prev
      return allGroups[0]?.id ?? null
    })
  }, [allGroups])

  // Primary variant drives the 3D / spinner viewer.
  // Follows the most recently clicked group (falls back to first).
  const primaryGroup = visibleGroups.find((g) => g.id === activeGroupId) ?? visibleGroups[0]
  const primaryVariantId = primaryGroup
    ? (selectedByGroup[primaryGroup.id] ?? primaryGroup.variants[0]?.id)
    : null

  // Preload every GLB referenced by the current variant + its partOptions
  // so swapping a part is instant on first click.
  const variantForPreload = variants.find((v) => v.id === primaryVariantId)
  useEffect(() => {
    if (!variantForPreload) return
    const urls = new Set()
    for (const l of variantForPreload.glbLayers ?? []) {
      if (l.glbUrl) urls.add(l.glbUrl)
    }
    for (const g of variantForPreload.partOptions ?? []) {
      for (const o of g.options ?? []) {
        if (o.glbUrl) urls.add(o.glbUrl)
        if (o.byLayer) {
          for (const data of Object.values(o.byLayer)) {
            if (data?.glbUrl) urls.add(data.glbUrl)
          }
        }
      }
    }
    for (const url of urls) {
      try { useGLTF.preload(url) } catch { /* ignore */ }
    }
  }, [variantForPreload])

  // Auto-skip the size step if the first partOption group has only 1 option.
  useEffect(() => {
    if (!modelTouched || firstPartTouched || !variantForPreload) return
    const first = variantForPreload.partOptions?.[0]
    if (first && (first.options?.length ?? 0) <= 1) {
      setFirstPartTouched(true)
    }
  }, [modelTouched, firstPartTouched, variantForPreload])
  const variant  = variants.find((v) => v.id === primaryVariantId) ?? null
  const interior = interiors.find((i) => i.id === interiorId)

  // ── Embed API: current selection snapshot, postMessage in/out ─────
  const currentSelection = useMemo(() => ({
    variants: selectedByGroup,
    color: colorSel,
    partOptions: partSel,
    interiorId,
    view,
    layers: variant ? (layerVisByVariant[variant.id] ?? {}) : {},
  }), [selectedByGroup, colorSel, partSel, interiorId, view, layerVisByVariant, variant])

  // Emit ready event once on mount (or when config changes)
  const readyEmittedRef = useRef(false)
  useEffect(() => {
    if (!enableEmbedApi || readyEmittedRef.current) return
    readyEmittedRef.current = true
    postToParent('ready', {
      configId: config.id ?? null,
      name: config.name ?? '',
      groups: (allGroups ?? []).map((g) => ({
        id: g.id,
        label: g.label,
        variants: g.variants.map((v) => ({
          id: v.id,
          label: v.label,
          colorOptions: (v.colorOptions ?? []).map((c) => ({
            id: c.id, label: c.label, swatch: c.swatch ?? null,
          })),
          partOptions: (v.partOptions ?? []).map((grp) => ({
            id: grp.id,
            label: grp.label,
            options: (grp.options ?? []).map((o) => ({
              id: o.id, label: o.label, swatch: o.swatch ?? null,
            })),
          })),
          layers: (v.glbLayers ?? []).filter((l) => l.togglable).map((l) => ({
            id: l.id, label: l.label, defaultOn: l.defaultOn ?? true,
          })),
        })),
      })),
      interiors: interiors.map((i) => ({ id: i.id, label: i.label })),
      customViews: (customViews ?? []).map((cv) => ({ id: cv.id, label: cv.label, type: cv.type })),
      tabs,
      hasOrder: !!orderForm?.enabled,
      hasInteriors: interiors.length > 0,
      orderFormFields: (orderForm?.fields ?? []).filter((f) => f.enabled !== false).map((f) => ({
        id: f.id, label: f.label, type: f.type, required: !!f.required,
      })),
    })
  }, [enableEmbedApi, config.id, config.name, allGroups, orderForm, interiors, customViews, tabs])

  // Emit selection-changed event when state changes (after ready)
  useEffect(() => {
    if (!enableEmbedApi || !readyEmittedRef.current) return
    postToParent('selectionChanged', { selection: currentSelection })
  }, [enableEmbedApi, currentSelection])

  // Local callback so wrappers can preserve selection across remounts
  // (e.g. TranslatedRenderer remounts on locale change).
  useEffect(() => {
    onSelectionChange?.(currentSelection)
  }, [currentSelection, onSelectionChange])

  // Sync panel visibility back to URL when embedded, so refresh keeps state.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.location.pathname.startsWith('/embed/')) return
    const params = new URLSearchParams(window.location.search)
    if (panelCollapsed) params.set('panel', 'hidden')
    else params.delete('panel')
    const qs = params.toString()
    const next = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash
    window.history.replaceState(null, '', next)
  }, [panelCollapsed])

  // Listen for incoming setSelection / patchSelection / submitOrder from parent
  useEffect(() => {
    if (!enableEmbedApi) return
    return onParentMessage((type, payload) => {
      if (type === 'submitOrder') {
        submitOrderRef.current?.(payload?.formData ?? payload ?? {})
        return
      }
      if (type !== 'setSelection' && type !== 'patchSelection') return
      const incoming = resolveSelectionAgainstConfig({ ...(payload?.selection || payload || {}) }, config)
      if (!incoming) return
      const merge = type === 'patchSelection'
      if (incoming.variants) {
        setSelectedByGroup((prev) => merge ? { ...prev, ...incoming.variants } : { ...incoming.variants })
        // When variants change externally, treat as a model interaction
        setModelTouched(true)
      }
      if ('color' in incoming) setColorSel(incoming.color ?? null)
      if (incoming.partOptions) {
        setPartSel((prev) => merge ? { ...prev, ...incoming.partOptions } : { ...incoming.partOptions })
        setFirstPartTouched(true)
      }
      if ('interiorId' in incoming && incoming.interiorId) setInteriorId(incoming.interiorId)
      if (incoming.view && tabs.includes(incoming.view)) setView(incoming.view)
      if (incoming.layers && variant) {
        setLayerVisByVariant((prev) => ({
          ...prev,
          [variant.id]: merge ? { ...(prev[variant.id] ?? {}), ...incoming.layers } : { ...incoming.layers },
        }))
      }
    })
  }, [enableEmbedApi, config, tabs, variant])

  // Background style for viewer pane
  const viewerStyle = {}
  if (background?.type === 'color') {
    viewerStyle.background = background.color
  } else if (background?.type === 'image' && background.imageUrl) {
    viewerStyle.backgroundImage = `url(${background.imageUrl})`
    viewerStyle.backgroundSize = 'cover'
    viewerStyle.backgroundPosition = 'center'
  }

  // Price display — sum selected prices across all visible groups
  const hasAnyPrice = variants.some((v) => v.price != null)
  // Only the active group contributes to the selected price summary
  const totalSelectedPrice = hasAnyPrice
    ? visibleGroups.reduce((sum, g) => {
        if (g.id !== activeGroupId) return sum
        const selId = selectedByGroup[g.id] ?? g.variants[0]?.id
        const sel = g.variants.find((v) => v.id === selId)
        return sel?.price != null ? sum + sel.price : sum
      }, 0)
    : null

  function fmt(n) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
  }

  const vs = viewerSettings

  // Groups suppressed by the currently selected partOptions.
  // An option may declare `hidesGroups: [groupLabel,...]` to hide other groups
  // (and exclude their visibleNodes filters) when that option is active.
  // Use case: a "no-variants" lid like Puhas turns off hole/orientation toggles
  // that otherwise filter to nodes its GLB does not contain.
  const suppressedPartGroups = useMemo(() => {
    const set = new Set()
    for (const grp of variant?.partOptions ?? []) {
      const sel = grp.options?.find((o) => o.label === partSel[grp.label])
        ?? grp.options?.find((o) => o.id === grp.defaultOptionId)
        ?? grp.options?.[0]
      if (sel?.hidesGroups) sel.hidesGroups.forEach((l) => set.add(l))
    }
    return set
  }, [variant, partSel])

  // Resolved GLB layers for the active variant — shared by viewer + AR button.
  const activeGlbLayers = useMemo(() => {
    if (!variant || (view !== 'exterior' && view !== 'order')) return []
    const selectedColor = variant.colorOptions?.find((c) => c.label === colorSel)
      ?? variant.colorOptions?.find((c) => c.id === variant.defaultColorOptionId)
      ?? variant.colorOptions?.[0]
    const colorOverrides = selectedColor?.materialOverridesByMaterial ?? {}
    const layerVis = layerVisByVariant[variant.id] ?? {}
    const isLayerVisible = (l) => {
      if (l.togglable) return layerVis[l.id] ?? l.defaultOn ?? true
      return l.visible !== false
    }
    const resolveOption = (grp) => {
      const selLabel = partSel[grp.label]
      return grp.options?.find((o) => o.label === selLabel)
        ?? grp.options?.find((o) => o.id === grp.defaultOptionId)
        ?? grp.options?.[0]
        ?? null
    }
    // Accumulate filters across all matching partOption groups so multiple
    // groups can compose (e.g. position group + hole group + sticker group
    // all targeting the same lid layer). Each filter is an OR-list; combining
    // filters means a mesh must satisfy every filter (AND).
    const resolvePartLayer = (l) => {
      let layer = l
      const filters = l.visibleNodes && l.visibleNodes.length ? [l.visibleNodes] : []
      const hideNodes = []
      let hide = false
      for (const grp of variant.partOptions ?? []) {
        if (!grp.matchLayerLabels?.includes(l.label)) continue
        if (suppressedPartGroups.has(grp.label)) continue
        const opt = resolveOption(grp)
        if (!opt) continue
        if (opt.hidden) { hide = true; break }
        const data = opt.byLayer?.[l.label] ?? opt
        if (data.glbUrl) {
          layer = {
            ...layer,
            glbUrl: data.glbUrl,
            glbStoragePath: data.glbStoragePath ?? layer.glbStoragePath,
          }
        }
        if (data.visibleNodes && data.visibleNodes.length) {
          filters.push(data.visibleNodes)
        }
        if (data.hideNodes && data.hideNodes.length) {
          for (const p of data.hideNodes) hideNodes.push(p)
        }
        if (data.materialOverrides) {
          layer = {
            ...layer,
            materialOverrides: { ...(data.materialOverrides ?? {}), ...(layer.materialOverrides ?? {}) },
          }
        }
      }
      if (hide) return null
      return {
        ...layer,
        visibleNodeFilters: filters.length ? filters : null,
        hideNodes: hideNodes.length ? hideNodes : null,
      }
    }
    return variant.glbLayers
      ? variant.glbLayers
          .map(resolvePartLayer)
          .filter((l) => l && isLayerVisible(l) && l.glbUrl)
          .map((l) => ({
            id: l.id,
            url: l.glbUrl,
            materialOverrides: { ...(l.materialOverrides ?? {}), ...colorOverrides },
            animationConfig: l.animationConfig ?? null,
            visibleNodes: l.visibleNodes ?? null,
            visibleNodeFilters: l.visibleNodeFilters ?? null,
            hideNodes: l.hideNodes ?? null,
            transform: l.transform ?? null,
            castShadow: l.castShadow !== false,
            receiveShadow: l.receiveShadow !== false,
          }))
      : variant.glbUrl
        ? [{ url: variant.glbUrl, materialOverrides: variant.materialOverrides ?? {}, animationConfig: variant.animationConfig ?? null }]
        : []
  }, [variant, view, colorSel, layerVisByVariant, partSel, suppressedPartGroups])

  // ── Viewer ──────────────────────────────────────────────────────
  function renderViewer() {
    if (view.startsWith('custom:')) {
      const cvId = view.slice('custom:'.length)
      const cv = customViews.find((c) => c.id === cvId)
      if (cv) return <CustomViewRenderer key={cv.id} view={cv} />
    }
    if (view === 'interior' && interior?.panoramaUrl) {
      return <InteriorViewer key={interior.id} src={interior.panoramaUrl} mode={interior.mode ?? 'pano'} />
    }
    if ((view === 'exterior' || view === 'order') && variant) {
      const glbLayers = activeGlbLayers

      const lightProps = {
        ambientIntensity: ((vs.glbAmbientIntensity ?? 25) / 100) * 2,
        keyIntensity:     ((vs.glbKeyIntensity     ?? 40) / 100) * 3,
        fillIntensity:    ((vs.glbFillIntensity    ?? 20) / 100) * 1.5,
        envIntensity:     ((vs.glbEnvIntensity     ?? 50) / 100) * 2,
      }
      const sharedProps = {
        autoRotate: vs.glbAutoRotate,
        autoRotateSpeed: vs.glbAutoRotateSpeed ?? 1,
        environment: vs.glbEnvironment ?? 'city',
        allowZoom: vs.glbAllowZoom ?? true,
        surroundLighting: vs.glbSurroundLighting ?? false,
        // ── orbit controls ──
        enablePan: vs.glbEnablePan ?? false,
        minPolarDeg: vs.glbMinPolarDeg ?? 22.5,
        maxPolarDeg: vs.glbMaxPolarDeg ?? 81.8,
        minAzimuthDeg: vs.glbMinAzimuthDeg ?? null,
        maxAzimuthDeg: vs.glbMaxAzimuthDeg ?? null,
        minDistance: vs.glbMinDistance ?? 2,
        maxDistance: vs.glbMaxDistance ?? 30,
        rotateSpeed: vs.glbRotateSpeed ?? 1,
        dampingFactor: vs.glbDampingFactor ?? 0.07,
        snapRotationDeg: vs.glbSnapRotationDeg ?? 0,
        // ── camera ──
        orthographic: vs.glbOrthographic ?? false,
        initialCameraPosition: variant.transform?.initialCameraPosition ?? null,
        targetOffset: variant.transform?.targetOffset ?? null,
        defaultYaw: variant.transform?.defaultYaw ?? 0,
        defaultPitch: variant.transform?.defaultPitch ?? 0,
        // ── render ──
        backgroundColor: vs.glbBackgroundColor ?? null,
        toneMapping: vs.glbToneMapping ?? 'aces',
        dpr: vs.glbDpr ?? 2,
        wireframe: vs.glbWireframe ?? false,
        // ── ground / shadows ──
        contactShadows: vs.glbContactShadows ?? false,
        contactShadowOpacity: vs.glbContactShadowOpacity ?? 0.55,
        contactShadowBlur: vs.glbContactShadowBlur ?? 2.2,
        groundPlane: vs.glbGroundPlane ?? false,
        groundColor: vs.glbGroundColor ?? '#cccccc',
        gridHelper: vs.glbGridHelper ?? false,
        showResetView: vs.glbShowResetView ?? false,
        // ── auto-rotate behaviour ──
        autoRotateAxis: vs.glbAutoRotateAxis ?? 'y',
        pauseAutoRotateOnHover: vs.glbPauseAutoRotateOnHover ?? true,
        autoRotateIdleDelayMs: vs.glbAutoRotateIdleDelayMs ?? 0,
        // ── light colors / shadow softness ──
        ambientColor: vs.glbAmbientColor ?? '#ffffff',
        keyColor: vs.glbKeyColor ?? '#ffffff',
        fillColor: vs.glbFillColor ?? '#ffffff',
        shadowMapSize: vs.glbShadowMapSize ?? 1024,
        shadowRadius: vs.glbShadowRadius ?? 1,
        // ── fog ──
        fogEnabled: vs.glbFogEnabled ?? false,
        fogColor: vs.glbFogColor ?? '#ffffff',
        fogDensity: vs.glbFogDensity ?? 0.02,
        fogType: vs.glbFogType ?? 'exp2',
        fogNear: vs.glbFogNear ?? 1,
        fogFar: vs.glbFogFar ?? 50,
        // ── UX overlays ──
        showFps: vs.glbShowFps ?? false,
        showScreenshotButton: vs.glbShowScreenshotButton ?? false,
        cursorStyle: vs.glbCursorStyle ?? 'grab',
        // ── render mode ──
        renderMode: vs.glbRenderMode ?? 'solid',
        xrayOpacity: vs.glbXrayOpacity ?? 0.35,
        flatShading: vs.glbFlatShading ?? false,
        // ── animation extras ──
        animationCrossfade: vs.glbAnimationCrossfade ?? 0,
        // ── per-variant overrides ──
        initialZoomMul: variant.transform?.initialZoomMul ?? 1,
        fov: variant.transform?.fov ?? (vs.glbFov ?? 42),
        ...lightProps,
        // If the viewer-side lighting selector is on and a preset is chosen,
        // its values override the configurator's lighting.
        ...(enableLightingControl && lightPresetKey && LIGHT_PRESETS[lightPresetKey]
          ? LIGHT_PRESETS[lightPresetKey]
          : {}),
        animationOverride: vs.glbEnableAnimationControls
          ? { playing: animPlaying, speed: animSpeed, restartKey: animRestartKey }
          : null,
      }
      // When keepViewerMounted is enabled (per-config), skip the variant-id key
      // so the viewer keeps its camera + WebGL context across variant switches.
      // Only layers change → smoother than a full remount + refit.
      const keepMounted = vs.keepViewerMounted ?? false
      if (show3D && glbLayers.length > 0) {
        return <SaunaViewer3D key={keepMounted ? 'shared-3d' : variant.id + '3d'} glbLayers={glbLayers} stackTransform={variant.transform ?? null} {...sharedProps} />
      }
      if (variant.type === 'glb' && glbLayers.length > 0) {
        return <SaunaViewer3D key={keepMounted ? 'shared' : variant.id} glbLayers={glbLayers} stackTransform={variant.transform ?? null} {...sharedProps} />
      }
      if (variant.type === 'spinner' && variant.frames?.length) {
        return (
          <FrameSpinner
            frames={variant.frames.map((f) => f.url)}
            frameIndex={frameIndex}
            onFrameChange={setFrameIndex}
            sensitivity={vs.spinnerSensitivity ?? 18}
            autoRotate={vs.spinnerAutoRotate ?? false}
            autoRotateSpeed={vs.spinnerAutoRotateSpeed ?? 3}
          />
        )
      }
    }
    return <div className="preview-empty">No preview available</div>
  }

  const can3D = (view === 'exterior' || view === 'order') && (
    variant?.glbLayers?.some((l) => l.visible !== false && l.glbUrl) ||
    !!variant?.glbUrl
  )

  const captureCanvasBlob = useCallback(async () => {
    const pane = viewerPaneRef.current
    if (!pane) return null
    const canvas = pane.querySelector('canvas')
    if (canvas) {
      return await new Promise((resolve) => {
        try { canvas.toBlob((blob) => resolve(blob), 'image/png') }
        catch { resolve(null) }
      })
    }
    // For non-WebGL viewers (spinner / interior pano), try the visible <img>.
    const img = pane.querySelector('img')
    if (img?.src) {
      try {
        const res = await fetch(img.src)
        return await res.blob()
      } catch { return null }
    }
    return null
  }, [])

  async function submitOrder(formDataToUse) {
    // Capture snapshot BEFORE save — viewer must still be mounted.
    const snapshotBlob = await captureCanvasBlob()

    let orderId = null
    let snapshotUrl = null
    let selectionsPayload = null

    if (config.id && config.ownerId) {
      try {
        // Selections: model groups + color + every partOption group
        const modelParts = visibleGroups.map((g) => {
          const selId = selectedByGroup[g.id] ?? g.variants[0]?.id
          const sel = g.variants.find((v) => v.id === selId)
          return sel ? `${g.label || extLabel}: ${sel.label}` : null
        }).filter(Boolean)

        const selectedColorOpt = variant?.colorOptions?.find((c) => c.label === colorSel)
          ?? variant?.colorOptions?.find((c) => c.id === variant.defaultColorOptionId)
          ?? variant?.colorOptions?.[0]
        const colorPart = selectedColorOpt ? `Color: ${selectedColorOpt.label}` : null

        const partOptionParts = (variant?.partOptions ?? []).map((grp) => {
          if (suppressedPartGroups.has(grp.label)) return null
          const opt = grp.options?.find((o) => o.label === partSel[grp.label])
            ?? grp.options?.find((o) => o.id === grp.defaultOptionId)
            ?? grp.options?.[0]
          return opt ? `${grp.label}: ${opt.label}` : null
        }).filter(Boolean)

        const allSelections = [...modelParts, colorPart, ...partOptionParts].filter(Boolean).join(', ')

        // Structured snapshot for later retrieval.
        // Store BOTH labels (human-readable) AND ids (stable across translations).
        // selectionFromOrder prefers ids to survive locale-driven label changes.
        const selections = {
          model: visibleGroups.reduce((acc, g) => {
            const selId = selectedByGroup[g.id] ?? g.variants[0]?.id
            const sel = g.variants.find((v) => v.id === selId)
            if (sel) acc[g.label || extLabel] = sel.label
            return acc
          }, {}),
          modelIds: visibleGroups.reduce((acc, g) => {
            const selId = selectedByGroup[g.id] ?? g.variants[0]?.id
            const sel = g.variants.find((v) => v.id === selId)
            if (sel) acc[g.id] = sel.id
            return acc
          }, {}),
          color: selectedColorOpt?.label ?? null,
          colorId: selectedColorOpt?.id ?? null,
          partOptions: (variant?.partOptions ?? []).reduce((acc, grp) => {
            if (suppressedPartGroups.has(grp.label)) return acc
            const opt = grp.options?.find((o) => o.label === partSel[grp.label])
              ?? grp.options?.find((o) => o.id === grp.defaultOptionId)
              ?? grp.options?.[0]
            if (opt) acc[grp.label] = opt.label
            return acc
          }, {}),
          partOptionIds: (variant?.partOptions ?? []).reduce((acc, grp) => {
            if (suppressedPartGroups.has(grp.label)) return acc
            const opt = grp.options?.find((o) => o.label === partSel[grp.label])
              ?? grp.options?.find((o) => o.id === grp.defaultOptionId)
              ?? grp.options?.[0]
            if (opt) acc[grp.id] = opt.id
            return acc
          }, {}),
        }
        selectionsPayload = selections

        orderId = await saveOrder(config.id, config.ownerId, {
          variantId: allSelections || (variant?.label ?? primaryVariantId),
          interiorId: hideInteriorTab ? null : (interior?.label ?? interiorId),
          formData: formDataToUse,
          selections,
          configuratorName: config.name ?? '',
        })

        // Upload snapshot if we captured one — non-blocking failure
        if (orderId && snapshotBlob) {
          try {
            const { url } = await uploadOrderSnapshot(config.id, orderId, snapshotBlob)
            snapshotUrl = url
            await updateOrder(orderId, { snapshotUrl: url })
          } catch (err) {
            console.warn('snapshot upload failed', err)
          }
        }
      } catch { /* non-fatal */ }
    }

    // Emit to parent (Sortaider WP) — even if save failed, surface form data
    if (enableEmbedApi) {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const stateUrl = orderId && config.id
        ? `${origin}/embed/${config.id}?order=${orderId}`
        : (config.id ? `${origin}/embed/${config.id}${selectionToQuery(currentSelection)}` : null)
      postToParent('orderSubmitted', {
        orderId,
        snapshotUrl,
        stateUrl,
        selection: currentSelection,
        selections: selectionsPayload,
        formData: formDataToUse,
      })
    }

    setOrderSubmitted(true)
  }

  async function handleOrderSubmit(e) {
    e.preventDefault()
    await submitOrder(orderData)
  }

  // Ref lets the postMessage listener call the latest closure of submitOrder
  // without listing every state var as a dep.
  const submitOrderRef = useRef(null)
  submitOrderRef.current = submitOrder

  // ── Panel ────────────────────────────────────────────────────────
  return (
    <div
      className="configurator-view"
      data-theme={theme}
      data-dark={darkMode ? 'true' : undefined}
      data-panel-collapsed={panelCollapsed ? 'true' : undefined}
      style={{
        ...(themeColors.accent  && { '--accent':  themeColors.accent  }),
        ...(themeColors.surface && { '--surface': themeColors.surface }),
        ...(themeColors.bg      && { '--bg':      themeColors.bg      }),
        ...(themeColors.border  && { '--border':  themeColors.border  }),
      }}
    >
      <div
        ref={viewerPaneRef}
        className={`viewer-pane${hotspotPlaceId ? ' hotspot-place-mode' : ''}`}
        style={viewerStyle}
        onClick={hotspotPlaceId ? (e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
          const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
          onHotspotPlace?.(x, y)
        } : undefined}
      >
        {renderViewer()}
        {can3D && !hide3DButton && (
          <button className={`view-3d-btn${show3D ? ' active' : ''}`}
            onClick={() => setShow3D((v) => !v)}>
            {show3D ? 'Renders' : '3D'}
          </button>
        )}
        {vs.glbEnableAR && activeGlbLayers.length > 0 && (
          <ARButton glbLayers={activeGlbLayers} />
        )}
        {enableLightingControl && (
          <div className="viewer-light-picker">
            <label className="viewer-light-picker-label">Light</label>
            <select className="viewer-light-picker-select"
              value={lightPresetKey ?? ''}
              onChange={(e) => setLightPresetKey(e.target.value || null)}>
              <option value="">Auto</option>
              {Object.keys(LIGHT_PRESETS).map((k) => (
                <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>
              ))}
            </select>
          </div>
        )}
        {vs.glbEnableAnimationControls && activeGlbLayers.some((l) => l.animationConfig?.enabled) && (
          <div className="viewer-anim-controls">
            <button className="viewer-anim-btn" title={animPlaying ? 'Pause' : 'Play'}
              onClick={() => setAnimPlaying((v) => !v)}>
              {animPlaying ? '❚❚' : '▶'}
            </button>
            <button className="viewer-anim-btn" title="Restart"
              onClick={() => { setAnimRestartKey((k) => k + 1); setAnimPlaying(true) }}>
              ⟲
            </button>
            <input className="viewer-anim-speed" type="range" min="0.1" max="3" step="0.1"
              value={animSpeed}
              onChange={(e) => setAnimSpeed(parseFloat(e.target.value))}
              title="Speed" />
            <span className="viewer-anim-speed-value">{animSpeed.toFixed(1)}×</span>
          </div>
        )}
        <button
          className="view-save-btn"
          onClick={(e) => {
            const pane = e.currentTarget.closest('.viewer-pane')
            const canvas = pane?.querySelector('canvas')
            if (!canvas) {
              const img = pane?.querySelector('img')
              if (!img) return
              const a = document.createElement('a')
              a.href = img.src
              a.download = `${(variant?.label ?? 'image').replace(/\s+/g, '_')}.png`
              a.click()
              return
            }
            canvas.toBlob((blob) => {
              if (!blob) return
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${(variant?.label ?? 'render').replace(/\s+/g, '_')}.png`
              a.click()
              URL.revokeObjectURL(url)
            }, 'image/png')
          }}>
          Save image
        </button>
        {hotspotPlaceId && (
          <div className="hotspot-place-hint">Click anywhere to position hotspot</div>
        )}
        {!hotspotPlaceId && hotspots.map((hs) => (
          <HotspotPin key={hs.id} hotspot={hs} />
        ))}
        {watermark?.enabled && watermark.imageUrl && (
          <img
            className={`viewer-watermark viewer-watermark--${watermark.position ?? 'bottom-right'}`}
            src={watermark.imageUrl}
            alt=""
            style={{ opacity: (watermark.opacity ?? 80) / 100, width: `${watermark.size ?? 15}%` }}
          />
        )}
        {panelCollapsed && (
          <button
            className="panel-reopen-btn"
            onClick={() => setPanelCollapsed(false)}
            aria-label="Open panel"
            title="Open panel">
            ‹
          </button>
        )}
      </div>

      <div className="config-pane">
        <button
          className="panel-collapse-btn"
          onClick={() => setPanelCollapsed(true)}
          aria-label="Close panel"
          title="Close panel">
          ×
        </button>
        <div className="config-panel">
          {locales && locales.length > 1 && onLocaleChange && (
            <div className="locale-picker">
              <select
                value={currentLocale ?? ''}
                onChange={(e) => onLocaleChange(e.target.value || null)}
                aria-label="Language">
                {locales.map((loc) => (
                  <option key={loc || 'default'} value={loc || ''}>
                    {loc ? (LOCALES[loc]?.name ?? loc) : 'Default'}
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* Tabs */}
          <div className="view-tabs">
            {variants.length > 0 && (
              <button className={`view-tab${view === 'exterior' ? ' active' : ''}`}
                onClick={() => setView('exterior')}>{extLabel}</button>
            )}
            {!hideInteriorTab && interiors.length > 0 && (
              <button className={`view-tab${view === 'interior' ? ' active' : ''}`}
                onClick={() => setView('interior')}>{intLabel}</button>
            )}
            {(customViews ?? []).map((cv) => (
              <button key={cv.id} className={`view-tab${view === `custom:${cv.id}` ? ' active' : ''}`}
                onClick={() => setView(`custom:${cv.id}`)}>{cv.label || 'View'}</button>
            ))}
            {orderForm?.enabled && (
              <button className={`view-tab${view === 'order' ? ' active' : ''}`}
                onClick={() => { setView('order'); setOrderSubmitted(false) }}>
                {orderForm.submitLabel ? 'Order' : 'Order'}
              </button>
            )}
          </div>

          <div className="tab-body">
            {/* Exterior panel */}
            {view === 'exterior' && variants.length > 0 && (
              <div className="tab-section">
                {/* Price display */}
                {hasAnyPrice && totalSelectedPrice != null && (
                  <div className="config-price-display">
                    <span className="config-price-value">{fmt(totalSelectedPrice)}</span>
                  </div>
                )}

                {visibleGroups.map((group) => (
                  <div key={group.id} className="variant-group-section">
                    {group.label && <p className="section-label">{group.label}</p>}
                    <div className="color-grid">
                      {group.variants.map((v) => {
                        const isSelected = selectedByGroup[group.id] === v.id && activeGroupId === group.id && modelTouched
                        return (
                          <button key={v.id} type="button"
                            aria-pressed={isSelected}
                            className={`color-card${isSelected ? ' selected' : ''}`}
                            onClick={() => {
                              setSelectedByGroup((prev) => ({ ...prev, [group.id]: v.id }))
                              setActiveGroupId(group.id)
                              setModelTouched(true)
                              setFirstPartTouched(false)
                              setFrameIndex(0)
                              setShow3D(false)
                            }}>
                            <SwatchDot variant={v} />
                            <div className="color-card-info">
                              <span className="color-label">{v.label}</span>
                              {v.price != null && <span className="color-price">{fmt(v.price)}</span>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {modelTouched && variant?.colorOptions?.length > 0 && (() => {
                  const sel = variant.colorOptions.find((c) => c.label === colorSel)
                    ?? variant.colorOptions.find((c) => c.id === variant.defaultColorOptionId)
                    ?? variant.colorOptions[0]
                  return (
                    <div className="variant-group-section">
                      <p className="section-label">{variant.colorOptionsLabel || 'Color'}</p>
                      <div className="color-grid">
                        {variant.colorOptions.map((c) => (
                          <button key={c.id} type="button"
                            aria-pressed={sel?.label === c.label}
                            className={`color-card${sel?.label === c.label ? ' selected' : ''}`}
                            onClick={() => setColorSel(c.label)}>
                            <span className="color-dot" style={{ background: c.swatch }} />
                            <div className="color-card-info">
                              <span className="color-label">{c.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                {modelTouched && variant?.partOptions?.length > 0 && variant.partOptions
                  .filter((grp) => !suppressedPartGroups.has(grp.label))
                  .map((grp, idx) => {
                  if (!grp.options?.length) return null
                  if (idx > 0 && !firstPartTouched) return null
                  const selOpt = grp.options.find((o) => o.label === partSel[grp.label])
                    ?? grp.options.find((o) => o.id === grp.defaultOptionId)
                    ?? grp.options[0]
                  return (
                    <div key={grp.id} className="variant-group-section">
                      <p className="section-label">{grp.label}</p>
                      <div className="color-grid">
                        {grp.options.map((o) => {
                          const isSelected = selOpt?.label === o.label
                          return (
                            <button key={o.id} type="button"
                              aria-pressed={isSelected}
                              className={`color-card${isSelected ? ' selected' : ''}`}
                              onClick={() => {
                                setPartSel((prev) => ({ ...prev, [grp.label]: o.label }))
                                if (idx === 0) setFirstPartTouched(true)
                              }}>
                              {o.swatchImageUrl
                                ? <img src={o.swatchImageUrl} className="color-dot color-dot-img" alt="" />
                                : <span className="color-dot" style={{ background: o.swatch ?? '#888' }} />}
                              <div className="color-card-info">
                                <span className="color-label">{o.label}</span>
                                {o.price != null && <span className="color-price">{fmt(o.price)}</span>}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {firstPartTouched && variant?.glbLayers?.some((l) => l.togglable) && (() => {
                  const layerVis = layerVisByVariant[variant.id] ?? {}
                  const get = (l) => layerVis[l.id] ?? l.defaultOn ?? true
                  return (
                    <div className="variant-group-section">
                      <p className="section-label">Parts</p>
                      <div className="layer-toggles">
                        {variant.glbLayers.filter((l) => l.togglable).map((l) => (
                          <label key={l.id} className="layer-toggle">
                            <input type="checkbox"
                              checked={get(l)}
                              onChange={(e) => setLayerVisByVariant((prev) => ({
                                ...prev,
                                [variant.id]: { ...(prev[variant.id] ?? {}), [l.id]: e.target.checked },
                              }))} />
                            <span>{l.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                <TabNav tabs={tabs} view={view} setView={setView} />
              </div>
            )}

            {/* Custom view panel — minimal side content: label + nav */}
            {view.startsWith('custom:') && (() => {
              const cvId = view.slice('custom:'.length)
              const cv = customViews.find((c) => c.id === cvId)
              if (!cv) return null
              return (
                <div className="tab-section">
                  <div className="variant-group-section">
                    {cv.label && <p className="section-label">{cv.label}</p>}
                  </div>
                  <TabNav tabs={tabs} view={view} setView={setView} />
                </div>
              )
            })()}

            {/* Interior panel */}
            {view === 'interior' && !hideInteriorTab && interiors.length > 0 && (
              <div className="tab-section">
                <div className="variant-group-section">
                  <p className="section-label">View</p>
                  <div className="interior-list">
                    {interiors.map((item) => (
                      <button key={item.id} type="button"
                        aria-pressed={interiorId === item.id}
                        className={`interior-item${interiorId === item.id ? ' selected' : ''}`}
                        onClick={() => setInteriorId(item.id)}>
                        {item.panoramaUrl && (
                          <div className="interior-item-thumb">
                            <img src={item.panoramaUrl} alt="" />
                          </div>
                        )}
                        <span className="interior-item-label">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <TabNav tabs={tabs} view={view} setView={setView} />
              </div>
            )}

            {/* Order panel */}
            {view === 'order' && orderForm?.enabled && (
              <div className="tab-section order-form-section">
                {/* Selection summary */}
                {(variants.length > 0 || interior) && (
                  <div className="order-summary">
                    <p className="order-summary-label">Your selection</p>
                    {visibleGroups.map((g) => {
                      const selId = selectedByGroup[g.id] ?? g.variants[0]?.id
                      const sel = g.variants.find((v) => v.id === selId)
                      if (!sel) return null
                      return (
                        <div key={g.id} className="order-summary-row">
                          <span>{g.label || extLabel}</span>
                          <span>
                            <SwatchDot variant={sel} />
                            {' '}{sel.label}
                            {sel.price != null && ` — ${fmt(sel.price)}`}
                          </span>
                        </div>
                      )
                    })}
                    {(() => {
                      const sel = variant?.colorOptions?.find((c) => c.label === colorSel)
                        ?? variant?.colorOptions?.find((c) => c.id === variant.defaultColorOptionId)
                        ?? variant?.colorOptions?.[0]
                      if (!sel) return null
                      return (
                        <div key="color" className="order-summary-row">
                          <span>Color</span>
                          <span>
                            <span className="color-dot" style={{ background: sel.swatch }} />
                            {' '}{sel.label}
                          </span>
                        </div>
                      )
                    })()}
                    {(variant?.partOptions ?? []).map((grp) => {
                      if (suppressedPartGroups.has(grp.label)) return null
                      const opt = grp.options?.find((o) => o.label === partSel[grp.label])
                        ?? grp.options?.find((o) => o.id === grp.defaultOptionId)
                        ?? grp.options?.[0]
                      if (!opt) return null
                      return (
                        <div key={grp.id} className="order-summary-row">
                          <span>{grp.label}</span>
                          <span>
                            {opt.swatchImageUrl
                              ? <img src={opt.swatchImageUrl} className="color-dot color-dot-img" alt="" />
                              : <span className="color-dot" style={{ background: opt.swatch ?? '#888' }} />}
                            {' '}{opt.label}
                            {opt.price != null && ` — ${fmt(opt.price)}`}
                          </span>
                        </div>
                      )
                    })}
                    {hasAnyPrice && visibleGroups.length > 1 && totalSelectedPrice != null && (
                      <div className="order-summary-row order-summary-total">
                        <span>Total</span>
                        <span>{fmt(totalSelectedPrice)}</span>
                      </div>
                    )}
                    {!hideInteriorTab && interior && (
                      <div className="order-summary-row">
                        <span>Interior</span>
                        <span>{interior.label}</span>
                      </div>
                    )}
                  </div>
                )}

                {orderSubmitted ? (
                  <div className="order-success">{orderForm.successMessage || 'Thank you!'}</div>
                ) : (
                  <form className="order-form" onSubmit={handleOrderSubmit}>
                    {(orderForm.fields ?? []).filter((f) => f.enabled !== false).map((field) => (
                      <div key={field.id} className="order-field">
                        <label className="order-field-label">
                          {field.label}{field.required && <span className="order-required"> *</span>}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea className="order-field-input order-field-textarea"
                            required={field.required}
                            value={orderData[field.id] ?? ''}
                            onChange={(e) => setOrderData({ ...orderData, [field.id]: e.target.value })} />
                        ) : (
                          <input className="order-field-input" type={field.type}
                            required={field.required}
                            value={orderData[field.id] ?? ''}
                            onChange={(e) => setOrderData({ ...orderData, [field.id]: e.target.value })} />
                        )}
                      </div>
                    ))}
                    <button type="submit" className="btn-primary order-submit-btn">
                      {orderForm.submitLabel || 'Submit order'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Custom view renderer ────────────────────────────────────────────

function CustomViewRenderer({ view }) {
  const style = { width: '100%', height: '100%', border: 0, display: 'block' }
  if (view.type === 'iframe' && view.url) {
    return <iframe src={view.url} title={view.label || 'view'} style={style} allow="fullscreen; xr-spatial-tracking" />
  }
  if (view.type === 'image' && view.url) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      <img src={view.url} alt={view.label || ''} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
    </div>
  }
  if (view.type === 'video' && view.url) {
    return <video src={view.url} controls playsInline style={{ ...style, background: '#000' }} />
  }
  if (view.type === 'html' && view.html) {
    // Rendered as-is. Configurator owner controls the content — same trust boundary
    // as the rest of their configurator data (variants, labels, etc.).
    return <div className="custom-view-html" style={{ width: '100%', height: '100%', overflow: 'auto', padding: 20 }}
      dangerouslySetInnerHTML={{ __html: view.html }} />
  }
  return <div className="preview-empty">Custom view has no content configured.</div>
}

function TabNav({ tabs, view, setView }) {
  const idx  = tabs.indexOf(view)
  const prev = tabs[idx - 1]
  const next = tabs[idx + 1]
  if (!prev && !next) return null
  return (
    <div className="tab-nav">
      {prev
        ? <button className="tab-nav-btn" onClick={() => setView(prev)}>← Back</button>
        : <span />
      }
      {next && (
        <button className="tab-nav-btn tab-nav-btn--next" onClick={() => setView(next)}>Next →</button>
      )}
    </div>
  )
}

function SwatchDot({ variant }) {
  if ((variant.swatchType ?? 'color') === 'image' && variant.swatchImageUrl) {
    return <img src={variant.swatchImageUrl} className="color-dot color-dot-img" alt="" />
  }
  return <span className="color-dot" style={{ background: variant.swatch ?? '#888' }} />
}

// ── Hotspot pin ─────────────────────────────────────────────────────

function HotspotPin({ hotspot }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="hotspot-pin-wrap" style={{ left: `${hotspot.x ?? 50}%`, top: `${hotspot.y ?? 50}%` }}>
      <button
        className={`hotspot-pin${open ? ' open' : ''}`}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        title={hotspot.label}
      >
        +
      </button>
      {open && (
        <div className="hotspot-popup">
          {hotspot.label && <div className="hotspot-popup-title">{hotspot.label}</div>}
          {hotspot.description && <div className="hotspot-popup-body">{hotspot.description}</div>}
        </div>
      )}
    </div>
  )
}

// ── Frame spinner ───────────────────────────────────────────────────

function FrameSpinner({ frames, frameIndex, onFrameChange, sensitivity = 18, autoRotate = false, autoRotateSpeed = 3 }) {
  const [dragging, setDragging]   = useState(false)
  const [ready, setReady]         = useState(false)
  const prevX    = useRef(null)
  const acc      = useRef(0)
  const frameRef = useRef(frameIndex)
  frameRef.current = frameIndex

  // Preload all frames into browser cache before allowing interaction
  useEffect(() => {
    setReady(false)
    let loaded = 0
    const imgs = frames.map((src) => {
      const img = new Image()
      img.onload = img.onerror = () => {
        loaded++
        if (loaded === frames.length) setReady(true)
      }
      img.src = src
      return img
    })
    return () => imgs.forEach((img) => { img.onload = img.onerror = null })
  }, [frames])

  // Auto-rotate: advance one frame at `autoRotateSpeed` fps, paused while dragging
  useEffect(() => {
    if (!autoRotate || dragging || !ready) return
    const id = setInterval(() => {
      const next = (frameRef.current + 1) % frames.length
      frameRef.current = next
      onFrameChange(next)
    }, 1000 / Math.max(0.5, autoRotateSpeed))
    return () => clearInterval(id)
  }, [autoRotate, autoRotateSpeed, dragging, ready, frames.length])

  function handlePointerDown(e) {
    setDragging(true)
    prevX.current = e.clientX
    acc.current = 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!dragging) return
    const prev = prevX.current
    if (prev == null) return
    acc.current += e.clientX - prev
    prevX.current = e.clientX
    const steps = Math.trunc(acc.current / sensitivity)
    if (steps !== 0) {
      acc.current -= steps * sensitivity
      const next = ((frameRef.current - steps) % frames.length + frames.length) % frames.length
      frameRef.current = next
      onFrameChange(next)
    }
  }

  return (
    <div className={`image-spinner${dragging ? ' dragging' : ''}`}
      onPointerDown={ready ? handlePointerDown : undefined}
      onPointerMove={ready ? handlePointerMove : undefined}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}>
      <img src={frames[frameIndex] ?? frames[0]} alt="" draggable={false} />
      {ready
        ? <div className="spinner-hint">{autoRotate ? 'Drag to rotate' : 'Drag to rotate'}</div>
        : <div className="spinner-hint">Loading…</div>
      }
    </div>
  )
}
