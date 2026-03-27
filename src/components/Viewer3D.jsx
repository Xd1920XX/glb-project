import { Canvas, useThree } from '@react-three/fiber'
import {
  useGLTF, Html, useProgress,
  Environment, ContactShadows,
  Bounds, useBounds, OrbitControls,
} from '@react-three/drei'
import { Suspense, useMemo, useLayoutEffect, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { FRAMES, LIDS, FRONT_PANELS } from '../config/models.js'

// ── Serialisation ─────────────────────────────────────────────────
// Converts the lids array to a stable string for use as a hook dependency.
// (Array identity changes every render even when content is the same.)
const serializeLids = (lids) => lids.map((l) => `${l.type}:${l.variant}`).join(',')

// ── Scene helpers ─────────────────────────────────────────────────

// Ensure every mesh writes to the depth buffer — prevents z-fighting between
// overlapping geometry from different GLBs at the same world position.
function fixDepth(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
    mats.forEach((m) => { m.depthWrite = true })
  })
}

// Hide slot positions beyond the chosen frame size.
function applyFrameVisibility(root, slots) {
  root.traverse((obj) => {
    const m = obj.name?.match(/Pos(\d+)/i)
    if (m) obj.visible = parseInt(m[1], 10) <= slots
  })
}

// Each lid GLB covers all 5 positions for one type with these node suffixes:
//   Kleeps_Auguta_Ulal   — no hole, top piece
//   Kleeps_Auguta_All    — no hole, bottom piece (carries the sticker)
//   Kleeps_Auguga_Ulal   — hole, top piece (sticker on top)
//   Kleeps_Auguga_All    — hole, bottom piece (sticker on bottom/inside)
//   Kleepsuta_Auguga     — hole ring (no sticker, structural piece)
//
// Each variant shows exactly ONE main piece (+ hole ring for hole variants):
//
//   plain       → Kleeps_Auguta_Ulal                               top board, no hole, sticker on hidden All = no logo visible
//   inside      → Kleeps_Auguta_All                                inside/bottom piece only, logo faces inward
//   hole-top    → Kleeps_Auguga_Ulal  + Kleepsuta_Auguga           hole, sticker on top
//   hole-bottom → Kleeps_Auguga_All   + Kleepsuta_Auguga           hole, sticker inside
//   hole-plain  → Kleepsuta_Auguga                                 hole ring only, no sticker
//
// The old bug: 'inside' matched both Auguta nodes (Ulal + All) — same double-lid issue
// as the hole variants. Now each variant matches exactly one Kleeps_* piece.
function nodeVisible(name, variant) {
  const ulal      = name.includes('Ulal')
  const all       = name.includes('All')
  const auguga    = name.includes('Auguga')
  const auguta    = name.includes('Auguta')
  const kleepsuta = name.includes('Kleepsuta')
  switch (variant) {
    case 'plain':        return auguta && ulal && !kleepsuta
    case 'inside':       return auguta && all  && !kleepsuta
    case 'hole-top':     return (auguga && ulal && !kleepsuta) || kleepsuta
    case 'hole-bottom':  return (auguga && all  && !kleepsuta) || kleepsuta
    case 'hole-plain':   return kleepsuta
    default:             return false
  }
}

function applyLidVisibility(root, lids, thisType) {
  root.traverse((obj) => {
    if (!obj.name) return
    const posM = obj.name.match(/Pos(\d+)/i)
    if (!posM) return
    const pos = parseInt(posM[1], 10)

    const typeM = obj.name.match(/Pos\d+_([A-Za-z]+)/i)
    if (!typeM || typeM[1].toLowerCase() !== thisType.toLowerCase() || pos > lids.length) {
      obj.visible = false
      return
    }

    const { type, variant } = lids[pos - 1]
    if (type.toLowerCase() !== thisType.toLowerCase()) {
      obj.visible = false
      return
    }

    obj.visible = nodeVisible(obj.name, variant)
  })
}

// Panels GLB: Container_Esipaneel_Pos{N}_{Type} — one node per position per type.
function applyPanelVisibility(root, lids) {
  root.traverse((obj) => {
    if (!obj.name) return
    const posM = obj.name.match(/Pos(\d+)/i)
    if (!posM) return
    const pos = parseInt(posM[1], 10)
    const typeM = obj.name.match(/Pos\d+_([A-Za-z]+)/i)
    obj.visible = typeM
      ? pos <= lids.length && lids[pos - 1].type.toLowerCase() === typeM[1].toLowerCase()
      : false
  })
}

// ── Shared model hook ─────────────────────────────────────────────
// Clones the GLTF scene once per URL change, applies initial visibility
// synchronously (preventing a one-frame flash on mount), then re-applies
// via useLayoutEffect which fires before Three.js's RAF render loop.
function useGLBModel(url, applyVisibility, lidsKey) {
  const { scene } = useGLTF(url)
  // Ref so the initial clone can capture current lids without them being a
  // useMemo dependency (which would cause an unnecessary reclone on every change).
  const applyRef = useRef(applyVisibility)
  applyRef.current = applyVisibility

  const cloned = useMemo(() => {
    const c = scene.clone(true)
    fixDepth(c)
    applyRef.current(c)
    return c
  }, [scene]) // intentionally omit applyVisibility — only reclone on URL change

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { applyRef.current(cloned) }, [cloned, lidsKey])

  return cloned
}

// ── Model components ──────────────────────────────────────────────

function FrameModel({ url, slots }) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => { const c = scene.clone(true); fixDepth(c); return c }, [scene])
  useLayoutEffect(() => { applyFrameVisibility(cloned, slots) }, [cloned, slots])
  return <primitive object={cloned} />
}

function LidModel({ url, lids, type }) {
  const lidsKey = serializeLids(lids)
  const apply = (root) => applyLidVisibility(root, lids, type)
  const cloned = useGLBModel(url, apply, lidsKey)
  return <primitive object={cloned} />
}

function PanelsModel({ url, lids }) {
  const lidsKey = serializeLids(lids)
  const apply = (root) => applyPanelVisibility(root, lids)
  const cloned = useGLBModel(url, apply, lidsKey)
  return <primitive object={cloned} />
}

// ── Background ────────────────────────────────────────────────────
// Samples the frame's material colours and sets a darkened version as the
// canvas background, so the background always complements the model.

function DynamicBackground({ frameUrl }) {
  const { scene } = useGLTF(frameUrl)
  const threeScene = useThree((s) => s.scene)
  useEffect(() => {
    const colors = []
    scene.traverse((obj) => {
      if (!obj.isMesh) return
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((m) => { if (m.color) colors.push(m.color.clone()) })
    })
    if (!colors.length) return
    const avg = colors.reduce((a, c) => ({ r: a.r + c.r, g: a.g + c.g, b: a.b + c.b }), { r: 0, g: 0, b: 0 })
    const n = colors.length
    threeScene.background = new THREE.Color((avg.r / n) * 0.28, (avg.g / n) * 0.28, (avg.b / n) * 0.28)
    return () => { threeScene.background = null }
  }, [scene, threeScene])
  return null
}

// ── Camera fit ────────────────────────────────────────────────────
// Refits the camera whenever the frame changes (different physical size),
// but NOT when lids change (they don't affect bounding box).

function CameraFit({ frameId }) {
  const bounds = useBounds()
  useLayoutEffect(() => {
    const t = setTimeout(() => bounds.refresh().fit(), 60)
    return () => clearTimeout(t)
  }, [frameId]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// ── Loader ────────────────────────────────────────────────────────

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="model-loader">Loading… {Math.round(progress)}%</div>
    </Html>
  )
}

// ── Main export ───────────────────────────────────────────────────

export function Viewer3D({ frameUrl, frameId, lids, panelsUrl, slots }) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ fov: 42, position: [0, 1.2, 6] }}>
      <Suspense fallback={<Loader />}>
        {frameUrl && <DynamicBackground frameUrl={frameUrl} />}

        <Environment preset="warehouse" />
        <ambientLight intensity={0.4} />
        <directionalLight position={[4, 8, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 4, -3]} intensity={0.35} />

        <Bounds fit clip margin={1.25}>
          <CameraFit frameId={frameId} />
          <group rotation={[0, -Math.PI / 6, 0]}>
            {frameUrl && <FrameModel url={frameUrl} slots={slots} />}
            {LIDS.map((lid) => (
              <LidModel key={lid.id} url={lid.path} lids={lids} type={lid.id} />
            ))}
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

// Preload all assets so switching is instant
;[...FRAMES, ...LIDS, FRONT_PANELS].forEach(({ path }) => useGLTF.preload(path))
