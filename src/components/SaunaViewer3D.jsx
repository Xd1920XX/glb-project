import { Canvas } from '@react-three/fiber'
import { useGLTF, useTexture, OrbitControls, Bounds, useBounds, Environment } from '@react-three/drei'
import { Suspense, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'

useGLTF.preload('/new/' + encodeURIComponent('Sauna City XS.glb'))

function Model({ url }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

function TexturedModel({ url, textureUrl }) {
  const { scene } = useGLTF(url)
  const texture = useTexture(textureUrl)

  const clonedScene = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    const clone = scene.clone(true)
    const PANEL_MATERIALS = new Set(['black_walls'])
    clone.traverse((child) => {
      if (child.isMesh && PANEL_MATERIALS.has(child.material?.name)) {
        child.material = child.material.clone()
        child.material.color.set(0xffffff)
        child.material.map = texture
        child.material.needsUpdate = true
      }
    })
    return clone
  }, [scene, texture])

  return <primitive object={clonedScene} />
}

function CameraFit() {
  const bounds = useBounds()
  useLayoutEffect(() => {
    bounds.refresh().fit()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export function SaunaViewer3D({ glb, textureUrl, envIntensity = 3 }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 42, position: [8, 4, 12] }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <Environment preset="apartment" background={false} environmentIntensity={envIntensity} />
        {textureUrl && <>
          <directionalLight position={[0, 2, 10]}  intensity={1.5} />
          <directionalLight position={[0, 2, -10]} intensity={1.5} />
        </>}

        <Bounds fit clip margin={1.2}>
          <CameraFit />
          {textureUrl ? <TexturedModel url={glb} textureUrl={textureUrl} /> : <Model url={glb} />}
        </Bounds>

        <OrbitControls
          makeDefault
          autoRotate={false}
          enablePan={false}
          enableDamping={false}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={2}
          maxDistance={30}
        />
      </Suspense>
    </Canvas>
  )
}
