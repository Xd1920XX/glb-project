import { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'

// Deterministic layout — consistent look on every render
const SHAPE_DATA = Array.from({ length: 26 }, (_, i) => {
  const t = i / 26
  const a = t * Math.PI * 7.3
  const b = t * Math.PI * 4.1
  return {
    position: [
      Math.sin(a) * 13 + Math.cos(b * 0.7) * 3,
      Math.cos(a * 0.8) * 8 + Math.sin(b) * 2,
      -3.5 - Math.abs(Math.sin(t * 11)) * 9,
    ],
    rotation: [t * 7, t * 5.3, t * 3.1],
    scale: 0.22 + Math.abs(Math.sin(t * 13)) * 1.1,
    rotSpeed: Math.sin(t * 9) * 0.45,
    floatSpeed: 0.1 + Math.abs(Math.cos(t * 7)) * 0.28,
    floatAmp: 0.25 + Math.abs(Math.sin(t * 11)) * 0.55,
    floatOffset: t * Math.PI * 5,
    type: i % 4,
    color: ['#6366f1', '#8b5cf6', '#a78bfa', '#818cf8'][i % 4],
    opacity: 0.08 + Math.abs(Math.sin(t * 17)) * 0.18,
  }
})

function FloatingShapes({ mouseRef }) {
  const groupRef = useRef()
  const meshRefs = useRef([])

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime()

    if (groupRef.current) {
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      groupRef.current.rotation.y += (mx * 0.14 - groupRef.current.rotation.y) * 0.035
      groupRef.current.rotation.x += (-my * 0.07 - groupRef.current.rotation.x) * 0.035
    }

    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const d = SHAPE_DATA[i]
      mesh.rotation.x += d.rotSpeed * 0.008
      mesh.rotation.y += d.rotSpeed * 0.006
      mesh.position.y = d.position[1] + Math.sin(elapsed * d.floatSpeed + d.floatOffset) * d.floatAmp
    })
  })

  return (
    <group ref={groupRef}>
      {SHAPE_DATA.map((d, i) => (
        <mesh
          key={i}
          ref={el => { meshRefs.current[i] = el }}
          position={d.position}
          rotation={d.rotation}
          scale={d.scale}
        >
          {d.type === 0 && <boxGeometry args={[1, 1, 1]} />}
          {d.type === 1 && <icosahedronGeometry args={[0.72, 0]} />}
          {d.type === 2 && <octahedronGeometry args={[0.82]} />}
          {d.type === 3 && <torusGeometry args={[0.48, 0.18, 4, 7]} />}
          <meshBasicMaterial wireframe color={d.color} transparent opacity={d.opacity} />
        </mesh>
      ))}
    </group>
  )
}

export default function HeroBackground() {
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div className="page-canvas">
      <Canvas
        camera={{ position: [0, 0, 13], fov: 54 }}
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
        dpr={[1, 1.5]}
        style={{ width: '100%', height: '100%' }}
      >
        <FloatingShapes mouseRef={mouseRef} />
      </Canvas>
    </div>
  )
}
