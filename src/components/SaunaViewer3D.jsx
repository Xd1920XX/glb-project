import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls, Bounds, useBounds, Environment, ContactShadows, Grid, Stats } from '@react-three/drei'
import { Suspense, useLayoutEffect, useMemo, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const TONE_MAPPINGS = {
  aces:     THREE.ACESFilmicToneMapping,
  linear:   THREE.LinearToneMapping,
  reinhard: THREE.ReinhardToneMapping,
  cineon:   THREE.CineonToneMapping,
  neutral:  THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping,
  none:     THREE.NoToneMapping,
}
export const TONE_MAPPING_KEYS = Object.keys(TONE_MAPPINGS)

export const ENV_PRESETS = [
  'apartment', 'city', 'dawn', 'forest', 'lobby',
  'night', 'park', 'studio', 'sunset', 'warehouse',
]

// Named lighting presets — each overrides the individual light props
export const LIGHT_PRESETS = {
  default:  { environment: 'studio',    envIntensity: 1,   ambientIntensity: 0.5, keyIntensity: 1.2, fillIntensity: 0.3, shadows: true,  exposure: 1   },
  bright:   { environment: 'warehouse', envIntensity: 1.5, ambientIntensity: 1.2, keyIntensity: 1.0, fillIntensity: 0.6, shadows: false, exposure: 1.2 },
  outdoor:  { environment: 'sunset',    envIntensity: 1.2, ambientIntensity: 0.4, keyIntensity: 2.2, fillIntensity: 0.3, shadows: true,  exposure: 1   },
  dramatic: { environment: 'night',     envIntensity: 0.6, ambientIntensity: 0.1, keyIntensity: 3.0, fillIntensity: 0.1, shadows: true,  exposure: 0.9 },
  soft:     { environment: 'apartment', envIntensity: 1,   ambientIntensity: 1.0, keyIntensity: 0.6, fillIntensity: 0.5, shadows: false, exposure: 1.1 },
  natural:  { environment: 'forest',    envIntensity: 1,   ambientIntensity: 0.5, keyIntensity: 1.5, fillIntensity: 0.4, shadows: true,  exposure: 1   },
}

// ── Shared texture cache: load each URL once, reuse across materials ─

const TEX_CACHE = new Map()   // url → THREE.Texture
const TEX_PENDING = new Map() // url → Promise<Texture>

function loadCachedTexture(url) {
  const cached = TEX_CACHE.get(url)
  if (cached) return Promise.resolve(cached)
  const pending = TEX_PENDING.get(url)
  if (pending) return pending
  const p = new Promise((resolve) => {
    new THREE.TextureLoader().load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      TEX_CACHE.set(url, tex)
      TEX_PENDING.delete(url)
      resolve(tex)
    })
  })
  TEX_PENDING.set(url, p)
  return p
}

// ── Model with optional material overrides ────────────────────────

function Model({ url, materialOverrides = {}, animationConfig = null, animationOverride = null, visibleNodes = null, visibleNodeFilters = null, hideNodes = null, onSceneRef = null, castShadow = true, receiveShadow = true, wireframe = false, renderMode = 'solid', xrayOpacity = 0.35, flatShading = false, layerTransform = null, crossfade = 0 }) {
  const { scene, animations } = useGLTF(url)
  const { gl } = useThree()
  const maxAniso = useMemo(() => gl?.capabilities?.getMaxAnisotropy?.() ?? 8, [gl])

  // Clone scene + clone every material so we never mutate the cache.
  // Also bumps texture quality: high anisotropy + correct colour spaces + mipmaps.
  const cloned = useMemo(() => {
    const root = scene.clone(true)
    root.traverse((node) => {
      if (!node.isMesh) return
      node.castShadow = castShadow
      node.receiveShadow = receiveShadow
      const list = Array.isArray(node.material) ? node.material : [node.material]
      const out = list.map((m) => {
        const c = m.clone()
        const tuneTex = (tex, isColor) => {
          if (!tex) return
          tex.anisotropy = maxAniso
          tex.minFilter = THREE.LinearMipmapLinearFilter
          tex.magFilter = THREE.LinearFilter
          tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace
          tex.generateMipmaps = true
          tex.needsUpdate = true
        }
        tuneTex(c.map,           true)
        tuneTex(c.emissiveMap,   true)
        tuneTex(c.normalMap,     false)
        tuneTex(c.roughnessMap,  false)
        tuneTex(c.metalnessMap,  false)
        tuneTex(c.aoMap,         false)
        return c
      })
      node.material = Array.isArray(node.material) ? out : out[0]
    })
    return root
  }, [scene, maxAniso])


  // Apply overrides whenever they or the clone change.
  // Textures are pulled from a shared cache so switching colors does not re-download.
  useEffect(() => {
    let cancelled = false

    const cacheOriginals = (mat) => {
      if (mat.userData._origColor === undefined) {
        mat.userData._origColor = mat.color ? mat.color.getHex() : null
      }
      if (mat.userData._origMap === undefined) {
        mat.userData._origMap = mat.map ?? null
      }
      if (mat.userData._origRoughness === undefined) {
        mat.userData._origRoughness = mat.roughness ?? null
      }
      if (mat.userData._origMetalness === undefined) {
        mat.userData._origMetalness = mat.metalness ?? null
      }
      if (mat.userData._origEmissive === undefined) {
        mat.userData._origEmissive = mat.emissive ? mat.emissive.getHex() : null
      }
      if (mat.userData._origEmissiveIntensity === undefined) {
        mat.userData._origEmissiveIntensity = mat.emissiveIntensity ?? null
      }
    }

    const restoreOriginals = (mat) => {
      if (mat.userData._origMap !== undefined) mat.map = mat.userData._origMap
      if (mat.userData._origColor !== undefined && mat.userData._origColor !== null && mat.color) {
        mat.color.setHex(mat.userData._origColor)
      }
      if (mat.userData._origRoughness !== undefined && mat.userData._origRoughness !== null && 'roughness' in mat) {
        mat.roughness = mat.userData._origRoughness
      }
      if (mat.userData._origMetalness !== undefined && mat.userData._origMetalness !== null && 'metalness' in mat) {
        mat.metalness = mat.userData._origMetalness
      }
      if (mat.userData._origEmissive !== undefined && mat.userData._origEmissive !== null && mat.emissive) {
        mat.emissive.setHex(mat.userData._origEmissive)
      }
      if (mat.userData._origEmissiveIntensity !== undefined && mat.userData._origEmissiveIntensity !== null && 'emissiveIntensity' in mat) {
        mat.emissiveIntensity = mat.userData._origEmissiveIntensity
      }
    }

    cloned.traverse((node) => {
      if (!node.isMesh) return
      const mats = Array.isArray(node.material) ? node.material : [node.material]
      mats.forEach((mat) => {
        cacheOriginals(mat)
        const ov = materialOverrides[mat.name]
        // Always restore first so override layering is predictable
        restoreOriginals(mat)

        if (!ov || ov.type === 'none') {
          mat.needsUpdate = true
          return
        }

        if (ov.type === 'color' && ov.color) {
          mat.color.set(ov.color)
          mat.map = null
        } else if (ov.type === 'texture' && ov.textureUrl) {
          loadCachedTexture(ov.textureUrl).then((tex) => {
            if (cancelled) return
            mat.map = tex
            mat.needsUpdate = true
          })
        }
        // Extra PBR overrides (apply on top of color/texture)
        if (ov.roughness != null && 'roughness' in mat) mat.roughness = Math.max(0, Math.min(1, Number(ov.roughness)))
        if (ov.metalness != null && 'metalness' in mat) mat.metalness = Math.max(0, Math.min(1, Number(ov.metalness)))
        if (ov.emissive && mat.emissive) mat.emissive.set(ov.emissive)
        if (ov.emissiveIntensity != null && 'emissiveIntensity' in mat) mat.emissiveIntensity = Number(ov.emissiveIntensity)
        mat.needsUpdate = true
      })
    })

    return () => {
      cancelled = true
      cloned.traverse((node) => {
        if (!node.isMesh) return
        const mats = Array.isArray(node.material) ? node.material : [node.material]
        mats.forEach((mat) => {
          restoreOriginals(mat)
          mat.needsUpdate = true
        })
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloned, JSON.stringify(materialOverrides)])

  // ── Shadow + wireframe + render mode + flat shading ────────────
  useEffect(() => {
    const isXray = renderMode === 'xray'
    const isWire = renderMode === 'wireframe' || !!wireframe
    cloned.traverse((node) => {
      if (!node.isMesh) return
      node.castShadow = castShadow
      node.receiveShadow = receiveShadow
      const mats = Array.isArray(node.material) ? node.material : [node.material]
      mats.forEach((mat) => {
        if ('wireframe' in mat) mat.wireframe = isWire
        if (mat.userData._origOpacity === undefined) {
          mat.userData._origOpacity = mat.opacity ?? 1
          mat.userData._origTransparent = !!mat.transparent
        }
        if (isXray) {
          mat.transparent = true
          mat.opacity = Math.max(0, Math.min(1, Number(xrayOpacity) || 0.35))
          mat.depthWrite = false
        } else {
          mat.transparent = mat.userData._origTransparent
          mat.opacity = mat.userData._origOpacity
          mat.depthWrite = true
        }
        if ('flatShading' in mat) {
          mat.flatShading = !!flatShading
        }
        mat.needsUpdate = true
      })
    })
  }, [cloned, castShadow, receiveShadow, wireframe, renderMode, xrayOpacity, flatShading])

  // ── Node visibility filter ─────────────────────────────────────
  // Inputs:
  //   visibleNodes        — legacy single OR-list (string[]). Mesh visible iff name
  //                         contains any pattern.
  //   visibleNodeFilters  — array of OR-lists (string[][]). Mesh visible iff it
  //                         satisfies every filter (each filter is OR over its
  //                         patterns). Allows multiple part groups to compose.
  //   hideNodes           — OR-list (string[]). Mesh forced hidden if any ancestor
  //                         name contains any pattern. Overrides visibleNode logic.
  // All empty/null → all nodes visible.
  useEffect(() => {
    const filters = []
    if (visibleNodes && visibleNodes.length) filters.push(visibleNodes)
    if (visibleNodeFilters && visibleNodeFilters.length) {
      for (const f of visibleNodeFilters) if (f && f.length) filters.push(f)
    }
    const hides = hideNodes && hideNodes.length ? hideNodes : null
    cloned.traverse((node) => {
      if (!node.isMesh) return
      // Include ancestor group names in the search — GLTFLoader wraps multi-primitive
      // meshes in a group named after the glTF node, so per-position filtering only
      // works if we check the parent chain too.
      const names = []
      let cur = node
      while (cur) { if (cur.name) names.push(cur.name); cur = cur.parent }
      const combined = names.join(' ')
      if (hides && hides.some((p) => combined.includes(p))) { node.visible = false; return }
      if (filters.length === 0) { node.visible = true; return }
      node.visible = filters.every((f) => f.some((p) => combined.includes(p)))
    })
  }, [cloned, JSON.stringify(visibleNodes), JSON.stringify(visibleNodeFilters), JSON.stringify(hideNodes)]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Animations ────────────────────────────────────────────────
  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned])
  const actionsRef = useRef([])

  useEffect(() => {
    const prevActions = actionsRef.current
    const fade = Number(crossfade) || 0
    if (!animationConfig?.enabled || !animations?.length) {
      if (fade > 0) prevActions.forEach((a) => a.fadeOut(fade))
      else prevActions.forEach((a) => a.stop())
      actionsRef.current = []
      return
    }
    const wanted = animationConfig.clipName === '__all__'
      ? animations
      : animations.filter((c) => c.name === animationConfig.clipName)
    const clips = wanted.length > 0 ? wanted : [animations[0]]
    const loopMode = animationConfig.loop === 'once'
      ? THREE.LoopOnce
      : animationConfig.loop === 'pingpong'
        ? THREE.LoopPingPong
        : THREE.LoopRepeat
    const baseSpeed = Number(animationConfig.speed) || 1
    const dir = animationConfig.reverse ? -1 : 1
    const newActions = clips.map((clip) => {
      const a = mixer.clipAction(clip)
      a.reset()
      a.setLoop(loopMode, Infinity)
      a.clampWhenFinished = loopMode === THREE.LoopOnce
      a.timeScale = baseSpeed * dir
      if (dir < 0) a.time = clip.duration
      if (fade > 0) {
        a.setEffectiveWeight(0)
        a.play()
        a.fadeIn(fade)
      } else {
        a.play()
      }
      return a
    })
    if (fade > 0) prevActions.forEach((a) => a.fadeOut(fade))
    else prevActions.forEach((a) => a.stop())
    actionsRef.current = newActions
    return () => {
      actionsRef.current.forEach((a) => a.stop())
      actionsRef.current = []
    }
  }, [mixer, animations, animationConfig?.enabled, animationConfig?.clipName, animationConfig?.loop, animationConfig?.speed, animationConfig?.reverse, animationOverride?.restartKey, crossfade])

  // React to viewer-side override (play/pause + speed multiplier)
  useEffect(() => {
    if (!animationOverride) return
    const baseSpeed = Number(animationConfig?.speed) || 1
    const mult = Number(animationOverride.speed) || 1
    const dir = animationConfig?.reverse ? -1 : 1
    for (const a of actionsRef.current) {
      a.paused = !animationOverride.playing
      a.timeScale = baseSpeed * mult * dir
    }
  }, [animationOverride, animationConfig?.speed, animationConfig?.reverse])

  useFrame((_, dt) => {
    if (animationConfig?.enabled) mixer.update(dt)
  })

  // Expose the cloned scene so the parent stack can compute a shared bounding box.
  useEffect(() => {
    onSceneRef?.(cloned)
    return () => onSceneRef?.(null)
  }, [cloned, onSceneRef])

  // Per-layer transform (offset + rotation° + scale) inside the stack group.
  const lt = layerTransform || {}
  const lOff = lt.offset ?? { x: 0, y: 0, z: 0 }
  const lRot = lt.rotation ?? { x: 0, y: 0, z: 0 }
  const lScl = lt.scale != null
    ? (typeof lt.scale === 'number'
        ? [lt.scale, lt.scale, lt.scale]
        : [Number(lt.scale.x) || 1, Number(lt.scale.y) || 1, Number(lt.scale.z) || 1])
    : [1, 1, 1]

  return (
    <group
      position={[Number(lOff.x) || 0, Number(lOff.y) || 0, Number(lOff.z) || 0]}
      rotation={[
        (Number(lRot.x) || 0) * Math.PI / 180,
        (Number(lRot.y) || 0) * Math.PI / 180,
        (Number(lRot.z) || 0) * Math.PI / 180,
      ]}
      scale={lScl}>
      <primitive object={cloned} />
    </group>
  )
}

// Wraps all GLB layers of a variant inside ONE group so transform applies to the entire stack.
function GlbStack({ layers, animationOverride, transform, wireframe = false, renderMode = 'solid', xrayOpacity = 0.35, flatShading = false, crossfade = 0, globalCastShadow = true, globalReceiveShadow = true }) {
  const groupRef = useRef(null)
  const sceneMapRef = useRef(new Map())

  const offset = transform?.offset ?? null
  const rotation = transform?.rotation ?? null
  const scaleProp = transform?.scale ?? null
  const autoCenter = !!transform?.autoCenter

  // Group transform from CMS-side offset/rotation/scale.
  const pos = offset ? [Number(offset.x) || 0, Number(offset.y) || 0, Number(offset.z) || 0] : [0, 0, 0]
  const rot = rotation
    ? [
        (Number(rotation.x) || 0) * Math.PI / 180,
        (Number(rotation.y) || 0) * Math.PI / 180,
        (Number(rotation.z) || 0) * Math.PI / 180,
      ]
    : [0, 0, 0]
  const scl = scaleProp != null
    ? (typeof scaleProp === 'number' ? [scaleProp, scaleProp, scaleProp] : [Number(scaleProp.x) || 1, Number(scaleProp.y) || 1, Number(scaleProp.z) || 1])
    : [1, 1, 1]

  // Auto-center: compute a SHARED bounding box across all loaded layers, then
  // shift the wrapping group so the combined centre sits at the origin.
  // Preserves layer alignment because every layer moves together.
  useLayoutEffect(() => {
    const grp = groupRef.current
    if (!grp) return
    if (grp.userData._origPos === undefined) grp.userData._origPos = grp.position.clone()
    grp.position.copy(grp.userData._origPos)
    if (!autoCenter) return
    const scenes = Array.from(sceneMapRef.current.values()).filter(Boolean)
    if (scenes.length === 0) return
    const box = new THREE.Box3()
    let any = false
    for (const s of scenes) {
      const sb = new THREE.Box3().setFromObject(s)
      if (isFinite(sb.min.x)) { box.union(sb); any = true }
    }
    if (!any) return
    const c = new THREE.Vector3()
    box.getCenter(c)
    grp.position.sub(c)
  // Recompute when toggle changes OR when the set of layers changes (so re-loads pick up new bbox)
  }, [autoCenter, layers])

  function setSceneFor(layerKey, scene) {
    if (scene == null) sceneMapRef.current.delete(layerKey)
    else sceneMapRef.current.set(layerKey, scene)
  }

  return (
    <group ref={groupRef} position={pos} rotation={rot} scale={scl}>
      {layers.map((layer, idx) => {
        const key = layer.id ?? `${idx}:${layer.url}`
        return (
          <Model key={key} url={layer.url}
            materialOverrides={layer.materialOverrides ?? {}}
            animationConfig={layer.animationConfig ?? null}
            visibleNodes={layer.visibleNodes ?? null}
            visibleNodeFilters={layer.visibleNodeFilters ?? null}
            hideNodes={layer.hideNodes ?? null}
            animationOverride={animationOverride}
            layerTransform={layer.transform ?? null}
            castShadow={layer.castShadow !== false && globalCastShadow}
            receiveShadow={layer.receiveShadow !== false && globalReceiveShadow}
            wireframe={wireframe}
            renderMode={renderMode}
            xrayOpacity={xrayOpacity}
            flatShading={flatShading}
            crossfade={crossfade}
            onSceneRef={(s) => setSceneFor(key, s)} />
        )
      })}
    </group>
  )
}

// ── Camera auto-fit ───────────────────────────────────────────────

function CameraFit({ deps = [] }) {
  const bounds = useBounds()
  useLayoutEffect(() => { bounds.refresh().fit() }, deps) // eslint-disable-line
  return null
}

// ── Main viewer ───────────────────────────────────────────────────

// Reset button — shown over canvas when showResetView is true. Refits Bounds + restores pose.
function ResetViewButton({ resetKey, onReset }) {
  return (
    <button
      type="button"
      onClick={onReset}
      title="Reset view"
      style={{
        position: 'absolute', top: 8, right: 8, zIndex: 5,
        padding: '4px 10px', fontSize: 12, cursor: 'pointer',
        background: 'rgba(0,0,0,0.55)', color: '#fff',
        border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6,
        backdropFilter: 'blur(4px)',
      }}
    >
      ⟳ Reset
    </button>
  )
}

// Apply default yaw/pitch + initial camera position + target offset after Bounds fit.
function CameraPoseInit({ deps, defaultYaw, defaultPitch, initialCameraPosition, targetOffset }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls)
  useLayoutEffect(() => {
    if (!controls) return
    if (targetOffset) {
      controls.target.x += Number(targetOffset.x) || 0
      controls.target.y += Number(targetOffset.y) || 0
      controls.target.z += Number(targetOffset.z) || 0
    }
    if (initialCameraPosition) {
      camera.position.set(
        Number(initialCameraPosition.x) || camera.position.x,
        Number(initialCameraPosition.y) || camera.position.y,
        Number(initialCameraPosition.z) || camera.position.z,
      )
    }
    // Apply yaw/pitch by rotating camera around target on a sphere of current radius.
    const yaw = (Number(defaultYaw) || 0) * Math.PI / 180
    const pitch = (Number(defaultPitch) || 0) * Math.PI / 180
    if (yaw !== 0 || pitch !== 0) {
      const t = controls.target
      const offset = new THREE.Vector3().subVectors(camera.position, t)
      const radius = offset.length() || 1
      const baseAzimuth = Math.atan2(offset.x, offset.z)
      const basePolar = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)))
      const az = baseAzimuth + yaw
      const po = Math.max(0.01, Math.min(Math.PI - 0.01, basePolar + pitch))
      camera.position.set(
        t.x + radius * Math.sin(po) * Math.sin(az),
        t.y + radius * Math.cos(po),
        t.z + radius * Math.sin(po) * Math.cos(az),
      )
    }
    camera.lookAt(controls.target)
    controls.update?.()
  }, deps) // eslint-disable-line
  return null
}

// Custom auto-rotate — supports x/y/z axis + idle delay + external pause.
function CustomAutoRotate({ enabled, axis = 'y', speedDegPerSec = 30, pausedRef, idleDelayMs = 0, lastInteractRef }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls)
  const last = useRef(performance.now())
  useFrame(() => {
    if (!enabled || !controls) return
    const now = performance.now()
    const dt = (now - last.current) / 1000
    last.current = now
    if (pausedRef?.current) return
    if (idleDelayMs > 0 && lastInteractRef?.current && (now - lastInteractRef.current) < idleDelayMs) return
    const ang = ((Number(speedDegPerSec) || 0) * Math.PI / 180) * dt
    if (ang === 0) return
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target)
    const ax = axis === 'x' ? new THREE.Vector3(1, 0, 0)
      : axis === 'z' ? new THREE.Vector3(0, 0, 1)
      : new THREE.Vector3(0, 1, 0)
    offset.applyAxisAngle(ax, ang)
    camera.position.copy(controls.target).add(offset)
    camera.lookAt(controls.target)
    controls.update?.()
  })
  return null
}

// Track user input start time to support auto-rotate idle delay.
function InteractWatcher({ lastInteractRef }) {
  const controls = useThree((s) => s.controls)
  useEffect(() => {
    if (!controls) return
    const onStart = () => { if (lastInteractRef) lastInteractRef.current = performance.now() }
    controls.addEventListener?.('start', onStart)
    return () => controls.removeEventListener?.('start', onStart)
  }, [controls, lastInteractRef])
  return null
}

// Per-variant FOV / zoom adjustment after Bounds fit.
function ZoomAdjust({ deps, initialZoomMul }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls)
  useLayoutEffect(() => {
    if (!controls || !initialZoomMul || initialZoomMul === 1) return
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target)
    offset.multiplyScalar(Number(initialZoomMul) || 1)
    camera.position.copy(controls.target).add(offset)
    controls.update?.()
  }, deps) // eslint-disable-line
  return null
}

// Fog scene effect.
function SceneFog({ enabled, color = '#ffffff', density = 0.02, near, far, type = 'exp2' }) {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    if (!enabled) {
      scene.fog = null
      return
    }
    scene.fog = type === 'linear'
      ? new THREE.Fog(color, Number(near) || 1, Number(far) || 50)
      : new THREE.FogExp2(color, Number(density) || 0.02)
    return () => { scene.fog = null }
  }, [scene, enabled, color, density, near, far, type])
  return null
}

// Snap OrbitControls rotation to a step (degrees) on pointer release.
function RotationSnap({ stepDeg }) {
  const controls = useThree((s) => s.controls)
  useEffect(() => {
    if (!controls || !stepDeg || stepDeg <= 0) return
    const step = (Number(stepDeg) || 0) * Math.PI / 180
    const handler = () => {
      const sph = new THREE.Spherical().setFromVector3(
        new THREE.Vector3().subVectors(controls.object.position, controls.target),
      )
      sph.theta = Math.round(sph.theta / step) * step
      const v = new THREE.Vector3().setFromSpherical(sph)
      controls.object.position.copy(controls.target).add(v)
      controls.update?.()
    }
    controls.addEventListener?.('end', handler)
    return () => controls.removeEventListener?.('end', handler)
  }, [controls, stepDeg])
  return null
}

export function SaunaViewer3D({
  glb,               // backward compat: single GLB URL
  glbLayers,         // new: array of { url, materialOverrides }
  stackTransform     = null, // per-variant transform applied to the whole stack
  materialOverrides  = {},
  autoRotate         = false,
  autoRotateSpeed    = 1,
  allowZoom          = true,
  fov                = 42,
  // lighting
  environment        = 'studio',
  envIntensity       = 1,
  ambientIntensity   = 0.5,
  keyIntensity       = 1.2,
  fillIntensity      = 0.3,
  keyPosition        = [6, 10, 8],
  fillPosition       = [-6, 4, -4],
  shadows            = true,
  background         = false,
  exposure           = 1,
  surroundLighting   = false,
  animationOverride  = null,
  // ── orbit controls ──
  enablePan          = false,
  minPolarDeg        = 22.5,
  maxPolarDeg        = 81.8,
  minAzimuthDeg      = null,
  maxAzimuthDeg      = null,
  minDistance        = 2,
  maxDistance        = 30,
  rotateSpeed        = 1,
  dampingFactor      = 0.07,
  snapRotationDeg    = 0,
  // ── camera ──
  orthographic       = false,
  initialCameraPosition = null,
  targetOffset       = null,
  defaultYaw         = 0,
  defaultPitch       = 0,
  initialZoomMul     = 1,
  // ── render ──
  backgroundColor    = null,
  toneMapping        = 'aces',
  dpr                = 2,
  wireframe          = false,
  renderMode         = 'solid',     // 'solid' | 'wireframe' | 'xray'
  xrayOpacity        = 0.35,
  flatShading        = false,
  // ── ground + shadows ──
  contactShadows     = false,
  contactShadowOpacity = 0.55,
  contactShadowBlur  = 2.2,
  groundPlane        = false,
  groundColor        = '#cccccc',
  gridHelper         = false,
  showResetView      = false,
  // ── auto-rotate behaviour ──
  autoRotateAxis     = 'y',
  pauseAutoRotateOnHover = true,
  autoRotateIdleDelayMs  = 0,
  // ── light colors ──
  ambientColor       = '#ffffff',
  keyColor           = '#ffffff',
  fillColor          = '#ffffff',
  shadowMapSize      = 1024,
  shadowRadius       = 1,
  // ── fog ──
  fogEnabled         = false,
  fogColor           = '#ffffff',
  fogDensity         = 0.02,
  fogType            = 'exp2',
  fogNear            = 1,
  fogFar             = 50,
  // ── UX overlays ──
  showFps            = false,
  showScreenshotButton = false,
  cursorStyle        = 'grab',
  // ── animation extras ──
  animationCrossfade = 0,
}) {
  const env = ENV_PRESETS.includes(environment) ? environment : 'studio'

  // Normalize to a layers array — supports both old single-glb and new glbLayers prop
  const layers = glbLayers
    ? glbLayers.filter((l) => l.url)
    : (glb ? [{ url: glb, materialOverrides }] : [])

  const toneMap = TONE_MAPPINGS[toneMapping] ?? THREE.ACESFilmicToneMapping
  const dprClamped = Math.max(0.5, Math.min(3, Number(dpr) || 2))

  const fitDeps = useMemo(
    () => [layers.map((l) => l.url).join('|'), JSON.stringify(stackTransform), JSON.stringify(initialCameraPosition), JSON.stringify(targetOffset), defaultYaw, defaultPitch, initialZoomMul, fov],
    [layers, stackTransform, initialCameraPosition, targetOffset, defaultYaw, defaultPitch, initialZoomMul, fov],
  )
  const [resetCounter, setResetCounter] = useResetCounter()
  const fitDepsWithReset = useMemo(() => [...fitDeps, resetCounter], [fitDeps, resetCounter])

  const wrapperRef = useRef(null)
  const hoveredRef = useRef(false)
  const lastInteractRef = useRef(0)
  const pausedRef = useRef(false)
  const [, forceCursorRender] = useState(0)
  const draggingRef = useRef(false)

  const setHover = (v) => {
    hoveredRef.current = v
    pausedRef.current = pauseAutoRotateOnHover && v
  }

  function downloadScreenshot() {
    const canvas = wrapperRef.current?.querySelector('canvas')
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `viewer-${Date.now()}.png`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    })
  }

  const useCustomAutoRotate = autoRotate && autoRotateAxis !== 'y'
  const orbitAutoRotate = autoRotate && autoRotateAxis === 'y'

  return (
    <div
      ref={wrapperRef}
      style={{ width: '100%', height: '100%', position: 'relative', cursor: draggingRef.current ? 'grabbing' : cursorStyle }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onPointerDown={() => { draggingRef.current = true; forceCursorRender((n) => n + 1) }}
      onPointerUp={() => { draggingRef.current = false; forceCursorRender((n) => n + 1) }}
    >
    <Canvas
      shadows={!surroundLighting && shadows}
      dpr={[1, dprClamped]}
      orthographic={orthographic}
      camera={orthographic
        ? { position: [8, 4, 12], zoom: 80, near: -100, far: 100 }
        : { fov, position: [8, 4, 12] }}
      style={{ width: '100%', height: '100%' }}
      gl={{
        toneMappingExposure: exposure,
        preserveDrawingBuffer: true,
        antialias: true,
        toneMapping: toneMap,
        outputColorSpace: THREE.SRGBColorSpace,
        powerPreference: 'high-performance',
      }}
    >
      {backgroundColor && <color attach="background" args={[backgroundColor]} />}
      <Suspense fallback={null}>
        <Environment preset={env} background={background && !backgroundColor} environmentIntensity={envIntensity} />
        <ambientLight intensity={ambientIntensity} color={ambientColor} />
        {surroundLighting ? (
          <>
            <directionalLight color={keyColor} position={[ 6,  6,  6]} intensity={keyIntensity * 0.6} />
            <directionalLight color={keyColor} position={[-6,  6,  6]} intensity={keyIntensity * 0.6} />
            <directionalLight color={keyColor} position={[ 6,  6, -6]} intensity={keyIntensity * 0.6} />
            <directionalLight color={keyColor} position={[-6,  6, -6]} intensity={keyIntensity * 0.6} />
          </>
        ) : (
          <>
            <directionalLight
              color={keyColor}
              position={keyPosition}
              intensity={keyIntensity}
              castShadow={shadows}
              shadow-mapSize={[Number(shadowMapSize) || 1024, Number(shadowMapSize) || 1024]}
              shadow-radius={Number(shadowRadius) || 1}
              shadow-bias={-0.0005}
            />
            <directionalLight color={fillColor} position={fillPosition} intensity={fillIntensity} />
          </>
        )}

        <SceneFog enabled={fogEnabled} color={fogColor} density={fogDensity} near={fogNear} far={fogFar} type={fogType} />

        <Bounds fit clip margin={1.2}>
          <GlbStack
            layers={layers}
            animationOverride={animationOverride}
            transform={stackTransform}
            wireframe={wireframe}
            renderMode={renderMode}
            xrayOpacity={xrayOpacity}
            flatShading={flatShading}
            crossfade={animationCrossfade}
            globalCastShadow={shadows}
            globalReceiveShadow={shadows}
          />
          <CameraFit deps={fitDepsWithReset} />
        </Bounds>

        <CameraPoseInit
          deps={fitDepsWithReset}
          defaultYaw={defaultYaw}
          defaultPitch={defaultPitch}
          initialCameraPosition={initialCameraPosition}
          targetOffset={targetOffset}
        />
        <ZoomAdjust deps={fitDepsWithReset} initialZoomMul={initialZoomMul} />
        <InteractWatcher lastInteractRef={lastInteractRef} />
        <CustomAutoRotate
          enabled={useCustomAutoRotate}
          axis={autoRotateAxis}
          speedDegPerSec={(Number(autoRotateSpeed) || 1) * 30}
          pausedRef={pausedRef}
          idleDelayMs={autoRotateIdleDelayMs}
          lastInteractRef={lastInteractRef}
        />

        {contactShadows && (
          <ContactShadows
            position={[0, -0.001, 0]}
            opacity={contactShadowOpacity}
            blur={contactShadowBlur}
            far={20}
            scale={30}
            resolution={1024}
          />
        )}
        {groundPlane && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color={groundColor} />
          </mesh>
        )}
        {gridHelper && (
          <Grid
            position={[0, 0, 0]}
            args={[20, 20]}
            cellColor="#888"
            sectionColor="#444"
            fadeDistance={30}
            infiniteGrid
          />
        )}

        <OrbitControls
          makeDefault
          enablePan={enablePan}
          enableZoom={allowZoom}
          enableDamping
          dampingFactor={dampingFactor}
          rotateSpeed={rotateSpeed}
          autoRotate={orbitAutoRotate}
          autoRotateSpeed={autoRotateSpeed}
          minPolarAngle={(Number(minPolarDeg) || 0) * Math.PI / 180}
          maxPolarAngle={(Number(maxPolarDeg) || 180) * Math.PI / 180}
          minAzimuthAngle={minAzimuthDeg != null ? Number(minAzimuthDeg) * Math.PI / 180 : -Infinity}
          maxAzimuthAngle={maxAzimuthDeg != null ? Number(maxAzimuthDeg) * Math.PI / 180 :  Infinity}
          minDistance={minDistance}
          maxDistance={maxDistance}
        />
        <RotationSnap stepDeg={snapRotationDeg} />
        {showFps && <Stats />}
      </Suspense>
    </Canvas>
    {showResetView && <ResetViewButton resetKey={resetCounter} onReset={() => setResetCounter((c) => c + 1)} />}
    {showScreenshotButton && (
      <button
        type="button"
        onClick={downloadScreenshot}
        title="Download screenshot"
        style={{
          position: 'absolute', top: 8, left: 8, zIndex: 5,
          padding: '4px 10px', fontSize: 12, cursor: 'pointer',
          background: 'rgba(0,0,0,0.55)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6,
          backdropFilter: 'blur(4px)',
        }}
      >
        ⤓ PNG
      </button>
    )}
    </div>
  )
}

function useResetCounter() {
  const ref = useRef(0)
  const [, force] = useState(0)
  const set = (updater) => {
    ref.current = typeof updater === 'function' ? updater(ref.current) : updater
    force((n) => n + 1)
  }
  return [ref.current, set]
}
