import { Canvas } from '@react-three/fiber'
import { OrbitControls, useTexture } from '@react-three/drei'
import { Suspense, Component } from 'react'
import * as THREE from 'three'

function PanoSphere({ url }) {
  const texture = useTexture(url)
  texture.colorSpace = THREE.SRGBColorSpace
  return (
    <mesh>
      <sphereGeometry args={[5, 64, 32]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  )
}

class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8,
          fontSize: 13, color: 'var(--text-muted)',
          background: 'var(--bg)',
        }}>
          <span>Could not load panorama</span>
          <span style={{ fontSize: 11 }}>Check Firebase Storage CORS settings</span>
        </div>
      )
    }
    return this.props.children
  }
}

export function InteriorViewer({ src }) {
  return (
    <CanvasErrorBoundary>
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
    </CanvasErrorBoundary>
  )
}
