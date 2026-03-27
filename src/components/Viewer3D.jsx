import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html, useProgress, Stage } from '@react-three/drei'
import { Suspense, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { FRAMES, LIDS, FRONT_PANELS } from '../config/models.js'

// Node naming conventions found in the GLB files:
//   Lids:   Container_Kaas_Pos1_Bio_Kleeps_...   (one type per file, 5 positions)
//   Panels: Container_Esipaneel_Pos1_Bio          (all 7 types × 5 positions in one file)
//
// Rules:
//   - Hide any node whose PosN > visibleSlots
//   - For panels: additionally hide nodes whose type segment != lidType
function applyVisibility(root, visibleSlots, lidType) {
  root.traverse((obj) => { obj.visible = true })

  root.traverse((obj) => {
    if (!obj.name) return

    const posMatch = obj.name.match(/Pos(\d+)/i)
    if (!posMatch) return

    const pos = parseInt(posMatch[1], 10)

    if (pos > visibleSlots) {
      obj.visible = false
      return
    }

    // Panels file contains all lid-type variants — show only the selected one
    if (lidType) {
      const typeMatch = obj.name.match(/Pos\d+_([A-Za-z]+)/i)
      if (typeMatch) {
        obj.visible = typeMatch[1].toLowerCase() === lidType.toLowerCase()
      }
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
          {frameUrl && <Model url={frameUrl} />}
          {lidUrl && <Model url={lidUrl} visibleSlots={slots} />}
          {panelsUrl && <Model url={panelsUrl} visibleSlots={slots} lidType={lidId} />}
        </Stage>
      </Suspense>

      <OrbitControls
        makeDefault
        autoRotate
        autoRotateSpeed={0.5}
        enablePan={false}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  )
}

;[...FRAMES, ...LIDS, FRONT_PANELS].forEach(({ path }) => useGLTF.preload(path))
