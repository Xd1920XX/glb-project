import { Canvas } from '@react-three/fiber'
import { useGLTF, OrbitControls, Bounds, useBounds, Environment } from '@react-three/drei'
import { Suspense, useLayoutEffect } from 'react'

useGLTF.preload(encodeURI('/new/Sauna City XS.glb'))

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
      shadows
      dpr={[1, 2]}
      camera={{ fov: 42, position: [8, 4, 12] }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <Environment preset="city" />
        <ambientLight intensity={0.5} />
        <directionalLight position={[6, 10, 8]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-6, 4, -4]} intensity={0.3} />

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
