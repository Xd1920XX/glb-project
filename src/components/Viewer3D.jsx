import { Canvas, useThree } from '@react-three/fiber'
import {
  OrbitControls,
  useGLTF,
  Html,
  useProgress,
  Environment,
  ContactShadows,
  Bounds,
  useBounds,
} from '@react-three/drei'
import { Suspense, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { FRAMES, LIDS, FRONT_PANELS } from '../config/models.js'

function applyVisibility(root, visibleSlots, lidType) {
  root.traverse((obj) => { obj.visible = true })
  root.traverse((obj) => {
    if (!obj.name) return
    const posMatch = obj.name.match(/Pos(\d+)/i)
    if (!posMatch) return
    const pos = parseInt(posMatch[1], 10)
    if (pos > visibleSlots) { obj.visible = false; return }
    if (lidType) {
      const typeMatch = obj.name.match(/Pos\d+_([A-Za-z]+)/i)
      if (typeMatch) obj.visible = typeMatch[1].toLowerCase() === lidType.toLowerCase()
    }
  })
}

function Model({ url, visibleSlots, lidType }) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(true), [scene])
  useEffect(() => {
    if (visibleSlots !== undefined) applyVisibility(cloned, visibleSlots, lidType)
  }, [cloned, visibleSlots, lidType])
  return <primitive object={cloned} />
}

function DynamicBackground({ frameUrl }) {
  const { scene } = useGLTF(frameUrl)
  const threeScene = useThree((s) => s.scene)
  useEffect(() => {
    const colors = []
    scene.traverse((obj) => {
      if (obj.isMesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((mat) => { if (mat.color) colors.push(mat.color.clone()) })
      }
    })
    if (colors.length === 0) return
    const sum = colors.reduce(
      (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }),
      { r: 0, g: 0, b: 0 },
    )
    const n = colors.length
    threeScene.background = new THREE.Color(
      (sum.r / n) * 0.28,
      (sum.g / n) * 0.28,
      (sum.b / n) * 0.28,
    )
    return () => { threeScene.background = null }
  }, [scene, threeScene])
  return null
}

// Fits camera to the loaded scene once, then hands off to OrbitControls
function FitCamera() {
  const bounds = useBounds()
  useEffect(() => {
    bounds.refresh().fit()
  }, [])
  return null
}

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="model-loader">Loading… {Math.round(progress)}%</div>
    </Html>
  )
}

export function Viewer3D({ frameUrl, lidUrl, panelsUrl, slots, lidId }) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [4, 2, 6], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 4, -4]} intensity={0.3} />
      <Environment preset="warehouse" />

      <Suspense fallback={<Loader />}>
        {frameUrl && <DynamicBackground frameUrl={frameUrl} />}
        <Bounds fit clip observe margin={1.3}>
          <FitCamera />
          {frameUrl && <Model url={frameUrl} />}
          {lidUrl && <Model url={lidUrl} visibleSlots={slots} />}
          {panelsUrl && <Model url={panelsUrl} visibleSlots={slots} lidType={lidId} />}
        </Bounds>
        <ContactShadows position={[0, -0.01, 0]} opacity={0.35} scale={20} blur={2} />
      </Suspense>

      <OrbitControls
        makeDefault
        autoRotate
        autoRotateSpeed={0.5}
        enableDamping
        dampingFactor={0.05}
        enablePan={false}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.2}
      />
    </Canvas>
  )
}

;[...FRAMES, ...LIDS, FRONT_PANELS].forEach(({ path }) => useGLTF.preload(path))
