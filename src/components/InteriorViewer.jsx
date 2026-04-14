import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useTexture } from '@react-three/drei'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'

const MIN_FOV = 20
const MAX_FOV = 110
const DEFAULT_FOV = 80

function PanoSphere({ url }) {
  const texture = useTexture(url)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.wrapS = THREE.RepeatWrapping
  texture.repeat.set(-1, 1)
  texture.offset.set(1, 0)
  return (
    <mesh>
      <sphereGeometry args={[5, 128, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  )
}

function PanoZoom() {
  const { camera, gl } = useThree()
  const fovRef = useRef(DEFAULT_FOV)
  const pointersRef = useRef(new Map())
  const prevPinchRef = useRef(null)

  useEffect(() => {
    const canvas = gl.domElement

    function applyFov(next) {
      fovRef.current = Math.min(MAX_FOV, Math.max(MIN_FOV, next))
      camera.fov = fovRef.current
      camera.updateProjectionMatrix()
    }

    function onWheel(e) {
      e.preventDefault()
      applyFov(fovRef.current + e.deltaY * 0.05)
    }

    function onPointerDown(e) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    function onPointerMove(e) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointersRef.current.size < 2) return

      const [a, b] = [...pointersRef.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)

      if (prevPinchRef.current !== null) {
        const delta = prevPinchRef.current - dist
        applyFov(fovRef.current + delta * 0.1)
      }
      prevPinchRef.current = dist
    }

    function onPointerUp(e) {
      pointersRef.current.delete(e.pointerId)
      if (pointersRef.current.size < 2) prevPinchRef.current = null
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)

    return () => {
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
    }
  }, [camera, gl])

  return null
}

export function InteriorViewer({ src }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: DEFAULT_FOV, position: [0, 0, 0.01] }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <PanoSphere url={src} />
        <PanoZoom />
        <OrbitControls
          makeDefault
          enableZoom={false}
          enablePan={false}
          rotateSpeed={-0.4}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.8}
        />
      </Suspense>
    </Canvas>
  )
}
