import { Canvas } from '@react-three/fiber'
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

// ── Model with optional material overrides ────────────────────────

function Model({ url, materialOverrides = {} }) {
  const { scene } = useGLTF(url)

  // Clone scene + clone every material so we never mutate the cache
  const cloned = useMemo(() => {
    const root = scene.clone(true)
    root.traverse((node) => {
      if (!node.isMesh) return
      if (Array.isArray(node.material)) {
        node.material = node.material.map((m) => m.clone())
      } else {
        node.material = node.material.clone()
      }
    })
    return root
  }, [scene])

  // Apply overrides whenever they or the clone change
  useEffect(() => {
    const loader = new THREE.TextureLoader()
    const pending = []

    cloned.traverse((node) => {
      if (!node.isMesh) return
      const mats = Array.isArray(node.material) ? node.material : [node.material]
      mats.forEach((mat) => {
        const ov = materialOverrides[mat.name]
        if (!ov || ov.type === 'none') return

        if (ov.type === 'color' && ov.color) {
          mat.color.set(ov.color)
          mat.map = null          // clear any existing texture
          mat.needsUpdate = true
        } else if (ov.type === 'texture' && ov.textureUrl) {
          const p = new Promise((resolve) => {
            loader.load(ov.textureUrl, (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace
              tex.wrapS = tex.wrapT = THREE.RepeatWrapping
              mat.map = tex
              mat.userData._ovTex = true  // mark: we own this texture, dispose on cleanup
              mat.needsUpdate = true
              resolve()
            })
          })
          pending.push(p)
        }
      })
    })

    return () => {
      cloned.traverse((node) => {
        if (!node.isMesh) return
        const mats = Array.isArray(node.material) ? node.material : [node.material]
        mats.forEach((mat) => {
          if (mat.map && mat.userData._ovTex) {
            mat.map.dispose()
            mat.map = null
            mat.userData._ovTex = false
          }
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
      gl={{ toneMappingExposure: exposure }}
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
