import { Canvas, useLoader } from '@react-three/fiber'
import { useGLTF, OrbitControls, Bounds, useBounds, Environment } from '@react-three/drei'
import { Suspense, useLayoutEffect, useMemo, useEffect } from 'react'
import * as THREE from 'three'

useGLTF.preload('/new/' + encodeURIComponent('Sauna City XS.glb'))

export const ENV_PRESETS = [
  'city', 'sunset', 'dawn', 'night', 'warehouse',
  'forest', 'apartment', 'studio', 'park', 'lobby',
]

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
              mat.needsUpdate = true
              resolve()
            })
          })
          pending.push(p)
        }
      })
    })

    return () => {
      // Dispose any textures we loaded when overrides change
      cloned.traverse((node) => {
        if (!node.isMesh) return
        const mats = Array.isArray(node.material) ? node.material : [node.material]
        mats.forEach((mat) => {
          if (mat.map && mat.userData.__ov) {
            mat.map.dispose()
            mat.map = null
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
  glb,
  materialOverrides  = {},
  autoRotate         = false,
  autoRotateSpeed    = 1,
  environment        = 'city',
  allowZoom          = true,
  fov                = 42,
}) {
  const env = ENV_PRESETS.includes(environment) ? environment : 'city'

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov, position: [8, 4, 12] }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <Environment preset={env} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[6, 10, 8]}  intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-6, 4, -4]} intensity={0.3} />

        <Bounds fit clip margin={1.2}>
          <CameraFit />
          <Model url={glb} materialOverrides={materialOverrides} />
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
