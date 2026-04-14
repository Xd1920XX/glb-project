import { Canvas } from '@react-three/fiber'
import { useGLTF, OrbitControls, Bounds, useBounds, Environment } from '@react-three/drei'
import { Suspense, useLayoutEffect } from 'react'

useGLTF.preload('/new/' + encodeURIComponent('Sauna City XS.glb'))

function Model({ url }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

function CameraFit() {
  const bounds = useBounds()
  useLayoutEffect(() => {
    bounds.refresh().fit()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export function SaunaViewer3D({ glb }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 42, position: [8, 4, 12] }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <Environment preset="apartment" background={false} environmentIntensity={2} />
        <ambientLight intensity={1.8} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} />

        <Bounds fit clip margin={1.2}>
          <CameraFit />
          <Model url={glb} />
        </Bounds>

        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.07}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={2}
          maxDistance={30}
        />
      </Suspense>
    </Canvas>
  )
}
