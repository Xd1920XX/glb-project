import { Canvas } from '@react-three/fiber'
import { OrbitControls, useTexture } from '@react-three/drei'
import { Suspense } from 'react'
import * as THREE from 'three'

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

export function InteriorViewer({ src }) {
  return (
    <Canvas
      dpr={[1, 2]}
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
