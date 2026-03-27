import { Canvas, useThree } from '@react-three/fiber'
import { useGLTF, Html, useProgress, Environment, ContactShadows, Bounds, OrbitControls } from '@react-three/drei'
import { Suspense, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { FRAMES, LIDS, FRONT_PANELS } from '../config/models.js'

// Apply visibility for the frame (hide positions beyond visibleSlots)
function applyFrameVisibility(root, visibleSlots) {
  root.traverse((obj) => {
    if (!obj.name) return
    const posMatch = obj.name.match(/Pos(\d+)/i)
    if (!posMatch) return
    obj.visible = parseInt(posMatch[1], 10) <= visibleSlots
  })
}

// Apply visibility for a lid GLB: show only positions where lids[pos-1] === thisType
function applyLidVisibility(root, lids, thisType) {
  root.traverse((obj) => {
    if (!obj.name) return
    const posMatch = obj.name.match(/Pos(\d+)/i)
    if (!posMatch) return
    const pos = parseInt(posMatch[1], 10)
    const typeMatch = obj.name.match(/Pos\d+_([A-Za-z]+)/i)
    if (typeMatch) {
      const nodeType = typeMatch[1].toLowerCase()
      obj.visible =
        pos <= lids.length &&
        nodeType === thisType.toLowerCase() &&
        lids[pos - 1].toLowerCase() === thisType.toLowerCase()
    } else {
      obj.visible = false
    }
  })
}

// Apply visibility for the panels GLB: show position N only if lids[N-1] matches that panel's type
function applyPanelVisibility(root, lids) {
  root.traverse((obj) => {
    if (!obj.name) return
    const posMatch = obj.name.match(/Pos(\d+)/i)
    if (!posMatch) return
    const pos = parseInt(posMatch[1], 10)
    const typeMatch = obj.name.match(/Pos\d+_([A-Za-z]+)/i)
    if (typeMatch) {
      const nodeType = typeMatch[1].toLowerCase()
      obj.visible = pos <= lids.length && lids[pos - 1].toLowerCase() === nodeType
    } else {
      obj.visible = false
    }
  })
}

function FrameModel({ url, slots }) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(true), [scene])
  useEffect(() => { applyFrameVisibility(cloned, slots) }, [cloned, slots])
  return <primitive object={cloned} />
}

function LidModel({ url, lids, type }) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(true), [scene])
  const lidsKey = lids.join(',')
  useEffect(() => { applyLidVisibility(cloned, lids, type) }, [cloned, lidsKey, type])
  return <primitive object={cloned} />
}

function PanelsModel({ url, lids }) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(true), [scene])
  const lidsKey = lids.join(',')
  useEffect(() => { applyPanelVisibility(cloned, lids) }, [cloned, lidsKey])
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
    const sum = colors.reduce((acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }), { r: 0, g: 0, b: 0 })
    const n = colors.length
    threeScene.background = new THREE.Color((sum.r / n) * 0.28, (sum.g / n) * 0.28, (sum.b / n) * 0.28)
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

export function Viewer3D({ frameUrl, lids, panelsUrl, slots }) {
  const uniqueLidTypes = useMemo(() => [...new Set(lids)], [lids.join(',')])

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ fov: 42, position: [0, 1.2, 6] }}>
      <Suspense fallback={<Loader />}>
        {frameUrl && <DynamicBackground frameUrl={frameUrl} />}

        <Environment preset="warehouse" />
        <ambientLight intensity={0.4} />
        <directionalLight position={[4, 8, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 4, -3]} intensity={0.35} />

        <Bounds fit clip observe margin={1.25}>
          <group rotation={[0, -Math.PI / 6, 0]}>
            {frameUrl && <FrameModel url={frameUrl} slots={slots} />}
            {uniqueLidTypes.map((type) => {
              const lid = LIDS.find((l) => l.id === type)
              return lid ? <LidModel key={type} url={lid.path} lids={lids} type={type} /> : null
            })}
            {panelsUrl && <PanelsModel url={panelsUrl} lids={lids} />}
          </group>
        </Bounds>

        <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={10} blur={2} far={4} />

        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.07}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={1}
          maxDistance={12}
        />
      </Suspense>
    </Canvas>
  )
}

;[...FRAMES, ...LIDS, FRONT_PANELS].forEach(({ path }) => useGLTF.preload(path))
