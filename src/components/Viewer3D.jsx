import { Canvas, useThree } from '@react-three/fiber'
import { useGLTF, Html, useProgress, Stage, PresentationControls } from '@react-three/drei'
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
    <Canvas shadows dpr={[1, 2]} camera={{ fov: 45 }}>
      <Suspense fallback={<Loader />}>
        {frameUrl && <DynamicBackground frameUrl={frameUrl} />}
        <Stage
          environment="warehouse"
          intensity={0.6}
          adjustCamera={1.2}
          shadows="contact"
          preset="soft"
        >
          <PresentationControls
            global
            rotation={[0, -Math.PI / 6, 0]}
            polar={[-Math.PI / 12, Math.PI / 12]}
            azimuth={[-Infinity, Infinity]}
            config={{ mass: 2, tension: 400 }}
            speed={1.5}
          >
            {frameUrl && <Model url={frameUrl} />}
            {lidUrl && <Model url={lidUrl} visibleSlots={slots} />}
            {panelsUrl && <Model url={panelsUrl} visibleSlots={slots} lidType={lidId} />}
          </PresentationControls>
        </Stage>
      </Suspense>
    </Canvas>
  )
}

;[...FRAMES, ...LIDS, FRONT_PANELS].forEach(({ path }) => useGLTF.preload(path))
