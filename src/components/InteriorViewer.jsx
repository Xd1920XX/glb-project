import { Canvas } from '@react-three/fiber'
import { OrbitControls, useTexture } from '@react-three/drei'
import { Suspense } from 'react'
import * as THREE from 'three'

function PanoSphere({ url }) {
  const texture = useTexture(url)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[5, 64, 32]} />
      <meshBasicMaterial map={texture} side={THREE.FrontSide} />
    </mesh>
  )
}

export function InteriorViewer({ src }) {
  return (
    <Canvas
      camera={{ fov: 80, position: [0, 0, 0.01] }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <PanoSphere url={src} />
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
