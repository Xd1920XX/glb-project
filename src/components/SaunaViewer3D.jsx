import { Canvas } from '@react-three/fiber'
import { useGLTF, OrbitControls, Bounds, useBounds, Environment } from '@react-three/drei'
import { Suspense, useLayoutEffect, useMemo, useEffect } from 'react'
import * as THREE from 'three'

// Point useGLTF at the local Draco decoder (needed for compressed GLBs)
useGLTF.setDecoderPath('/draco/')

useGLTF.preload(encodeURI('/latest/Sauna City.glb'))
useGLTF.preload(encodeURI('/xs-Exterior/Sauna City XS (1).glb'))
useGLTF.preload(encodeURI('/city_lux/Sauna City LUX.glb'))

export const ENV_PRESETS = [
  'apartment', 'city', 'dawn', 'forest', 'lobby',
  'night', 'park', 'studio', 'sunset', 'warehouse',
]

export const LIGHT_PRESETS = {
  default:  { environment: 'city',      envIntensity: 1,   ambientIntensity: 0.5, keyIntensity: 1.2, fillIntensity: 0.3, shadows: true,  exposure: 1   },
  bright:   { environment: 'warehouse', envIntensity: 1.5, ambientIntensity: 1.2, keyIntensity: 1.0, fillIntensity: 0.6, shadows: false, exposure: 1.2 },
  outdoor:  { environment: 'sunset',    envIntensity: 1.2, ambientIntensity: 0.4, keyIntensity: 2.2, fillIntensity: 0.3, shadows: true,  exposure: 1   },
  dramatic: { environment: 'night',     envIntensity: 0.6, ambientIntensity: 0.1, keyIntensity: 3.0, fillIntensity: 0.1, shadows: true,  exposure: 0.9 },
  soft:     { environment: 'apartment', envIntensity: 1,   ambientIntensity: 1.0, keyIntensity: 0.6, fillIntensity: 0.5, shadows: false, exposure: 1.1 },
  natural:  { environment: 'forest',    envIntensity: 1,   ambientIntensity: 0.5, keyIntensity: 1.5, fillIntensity: 0.4, shadows: true,  exposure: 1   },
}

// ── Helpers ───────────────────────────────────────────────────────

function deglassScene(scene) {
  scene.traverse((child) => {
    if (!child.isMesh) return
    const mats = Array.isArray(child.material) ? child.material : [child.material]
    mats.forEach((mat) => {
      if (!mat) return
      const name = (mat.name || '').toLowerCase()
      if (name.includes('glass') || name.includes('window') || name.includes('glazing')) {
        mat.envMapIntensity = 0
        mat.needsUpdate = true
      }
    })
  })
}

// ── Model with optional material overrides ────────────────────────

function Model({ url, materialOverrides = {} }) {
  const { scene } = useGLTF(url)

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
    deglassScene(root)
    return root
  }, [scene])

  useEffect(() => {
    const loader = new THREE.TextureLoader()

    cloned.traverse((node) => {
      if (!node.isMesh) return
      const mats = Array.isArray(node.material) ? node.material : [node.material]
      mats.forEach((mat) => {
        const ov = materialOverrides[mat.name]
        if (!ov || ov.type === 'none') return

        if (ov.type === 'color' && ov.color) {
          mat.color.set(ov.color)
          mat.map = null
          mat.needsUpdate = true
        } else if (ov.type === 'texture' && ov.textureUrl) {
          loader.load(ov.textureUrl, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            mat.color.set(0xffffff)
            mat.map = tex
            mat.needsUpdate = true
          })
        }
      })
    })
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

// ── Loading overlay ───────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
      color: '#fff', gap: 14, zIndex: 10,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.2)',
        borderTopColor: '#fff',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ fontSize: 13, opacity: 0.85, letterSpacing: '0.02em' }}>Loading 3D model…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// Suspends until the GLB is in the cache — drives the LoadingOverlay
function SceneReady({ glb }) {
  useGLTF(glb)
  return null
}

// ── Main viewer ───────────────────────────────────────────────────

export function SaunaViewer3D({
  glb,
  materialOverrides  = {},
  autoRotate         = false,
  autoRotateSpeed    = 1,
  allowZoom          = true,
  fov                = 42,
  // lighting
  environment        = 'city',
  envIntensity       = 1.5,
  ambientIntensity   = 3,
  keyIntensity       = 3.5,
  fillIntensity      = 2,
  keyPosition        = [6, 10, 8],
  fillPosition       = [-6, 4, -4],
  shadows            = true,
  background         = false,
  exposure           = 1,
  surroundLighting   = true,
}) {
  const env = ENV_PRESETS.includes(environment) ? environment : 'city'

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        shadows={!surroundLighting && shadows}
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
      <Suspense fallback={<LoadingOverlay />}>
        <SceneReady glb={glb} />
      </Suspense>
    </div>
  )
}
