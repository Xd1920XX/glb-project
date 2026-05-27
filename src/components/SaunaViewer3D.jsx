import { Canvas, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls, Bounds, useBounds, Environment } from '@react-three/drei'
import { Suspense, useLayoutEffect, useMemo, useEffect } from 'react'
import * as THREE from 'three'

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

function Model({ url, materialOverrides = {} }) {
  const { scene } = useGLTF(url)
  const { gl } = useThree()
  const maxAniso = useMemo(() => gl?.capabilities?.getMaxAnisotropy?.() ?? 8, [gl])

  // Clone scene + clone every material so we never mutate the cache.
  // Also bumps texture quality: high anisotropy + correct colour spaces + mipmaps.
  const cloned = useMemo(() => {
    const root = scene.clone(true)
    root.traverse((node) => {
      if (!node.isMesh) return
      node.castShadow = true
      node.receiveShadow = true
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

    cloned.traverse((node) => {
      if (!node.isMesh) return
      const mats = Array.isArray(node.material) ? node.material : [node.material]
      mats.forEach((mat) => {
        // Cache original color + map ONCE so we can restore when override removed
        if (mat.userData._origColor === undefined) {
          mat.userData._origColor = mat.color ? mat.color.getHex() : null
        }
        if (mat.userData._origMap === undefined) {
          mat.userData._origMap = mat.map ?? null
        }

        const ov = materialOverrides[mat.name]
        if (!ov || ov.type === 'none') {
          // Reset to original (in case prior override was applied)
          if (mat.userData._origMap !== undefined) mat.map = mat.userData._origMap
          if (mat.userData._origColor !== undefined && mat.userData._origColor !== null && mat.color) {
            mat.color.setHex(mat.userData._origColor)
          }
          mat.needsUpdate = true
          return
        }

        if (ov.type === 'color' && ov.color) {
          mat.color.set(ov.color)
          mat.map = null
          mat.needsUpdate = true
        } else if (ov.type === 'texture' && ov.textureUrl) {
          loadCachedTexture(ov.textureUrl).then((tex) => {
            if (cancelled) return
            mat.map = tex
            mat.needsUpdate = true
          })
        }
      })
    })

    return () => {
      cancelled = true
      // Reset materials to GLB originals; cached textures stay alive in TEX_CACHE
      cloned.traverse((node) => {
        if (!node.isMesh) return
        const mats = Array.isArray(node.material) ? node.material : [node.material]
        mats.forEach((mat) => {
          if (mat.userData._origMap !== undefined) mat.map = mat.userData._origMap
          if (mat.userData._origColor !== undefined && mat.userData._origColor !== null && mat.color) {
            mat.color.setHex(mat.userData._origColor)
          }
          mat.needsUpdate = true
        })
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloned, JSON.stringify(materialOverrides)])

  return <primitive object={cloned} />
}

// ── Camera auto-fit ───────────────────────────────────────────────

function CameraFit() {
  const bounds = useBounds()
  useLayoutEffect(() => { bounds.refresh().fit() }, []) // eslint-disable-line
  return null
}

// ── Main viewer ───────────────────────────────────────────────────

export function SaunaViewer3D({
  glb,               // backward compat: single GLB URL
  glbLayers,         // new: array of { url, materialOverrides }
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
}) {
  const env = ENV_PRESETS.includes(environment) ? environment : 'studio'

  // Normalize to a layers array — supports both old single-glb and new glbLayers prop
  const layers = glbLayers
    ? glbLayers.filter((l) => l.url)
    : (glb ? [{ url: glb, materialOverrides }] : [])

  return (
    <Canvas
      shadows={!surroundLighting && shadows}
      dpr={[1, 2]}
      camera={{ fov, position: [8, 4, 12] }}
      style={{ width: '100%', height: '100%' }}
      gl={{
        toneMappingExposure: exposure,
        preserveDrawingBuffer: true,
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
        powerPreference: 'high-performance',
      }}
    >
      <Suspense fallback={null}>
        <Environment preset={env} background={background} environmentIntensity={envIntensity} />
        <ambientLight intensity={ambientIntensity} />
        {surroundLighting ? (
          <>
            <directionalLight position={[ 6,  6,  6]} intensity={keyIntensity * 0.6} />
            <directionalLight position={[-6,  6,  6]} intensity={keyIntensity * 0.6} />
            <directionalLight position={[ 6,  6, -6]} intensity={keyIntensity * 0.6} />
            <directionalLight position={[-6,  6, -6]} intensity={keyIntensity * 0.6} />
          </>
        ) : (
          <>
            <directionalLight position={keyPosition}  intensity={keyIntensity}  castShadow={shadows} shadow-mapSize={[1024, 1024]} />
            <directionalLight position={fillPosition} intensity={fillIntensity} />
          </>
        )}

        <Bounds fit clip margin={1.2}>
          <CameraFit />
          {layers.map((layer) => (
            <Model key={layer.url} url={layer.url} materialOverrides={layer.materialOverrides ?? {}} />
          ))}
        </Bounds>

        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={allowZoom}
          enableDamping
          dampingFactor={0.07}
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={2}
          maxDistance={30}
        />
      </Suspense>
    </Canvas>
  )
}
