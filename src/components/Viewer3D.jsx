import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html, useProgress, Stage } from '@react-three/drei'
import { Suspense, useMemo } from 'react'
import { FRAMES, LIDS, FRONT_PANELS } from '../config/models.js'

function Model({ url }) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(true), [scene])
  return <primitive object={cloned} />
}

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="model-loader">Loading… {Math.round(progress)}%</div>
    </Html>
  )
}

export function Viewer3D({ frameUrl, lidUrl, panelsUrl }) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ fov: 45 }}>
      <color attach="background" args={['#eceae8']} />

      <Suspense fallback={<Loader />}>
        <Stage
          environment="studio"
          intensity={0.5}
          adjustCamera={1.2}
          shadows="contact"
          preset="rembrandt"
        >
          {frameUrl && <Model url={frameUrl} />}
          {lidUrl && <Model url={lidUrl} />}
          {panelsUrl && <Model url={panelsUrl} />}
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

// Preload all models so switching is instant
;[...FRAMES, ...LIDS, FRONT_PANELS].forEach(({ path }) => useGLTF.preload(path))
