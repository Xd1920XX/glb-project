import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { ImageSpinner } from '../components/ImageSpinner.jsx'
import { InteriorViewer } from '../components/InteriorViewer.jsx'
import { SaunaViewer3D } from '../components/SaunaViewer3D.jsx'
import { SaunaPanel } from '../components/SaunaPanel.jsx'
import { MODELS, FRAME_COUNT } from '../config/sauna.js'

export default function SaunaConfigurator() {
  const { modelId } = useParams()
  const model = MODELS[modelId] ?? MODELS['city-xs']

  const [colorId, setColorId]       = useState(model.colors[0].id)
  const [frameIndex, setFrameIndex] = useState(0)
  const [view, setView]             = useState('exterior')
  const [show3D, setShow3D]         = useState(false)
  const [interiorId, setInteriorId] = useState(model.interiors[0].id)
  const [roomId, setRoomId]         = useState(model.rooms?.[0]?.id ?? null)

  const color    = model.colors.find((c) => c.id === colorId)
  const interior = model.interiors.find((i) => i.id === interiorId)

  const materialOverrides = useMemo(() => {
    if (!color.texture || !color.textureMaterials) return {}
    return Object.fromEntries(
      color.textureMaterials.map((m) => [m, { type: 'texture', textureUrl: color.texture }])
    )
  }, [color])

  function handleColorChange(id) {
    const newColor = model.colors.find((c) => c.id === id)
    setColorId(id)
    if (!newColor?.glb) setShow3D(false)
  }

  function renderViewer() {
    if (view === 'interior') {
      const currentRoom = model.rooms?.find((r) => r.id === roomId)
      const src = currentRoom?.path ?? interior.path
      return <InteriorViewer key={src} src={src} />
    }
    if (view === 'order') {
      const src = `${color.folder}/1.jpg`
      return <img key={color.id} src={src} alt={color.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    }
    if (show3D && color.glb) {
      return <SaunaViewer3D key={color.id} glb={color.glb} materialOverrides={materialOverrides} />
    }
    return (
      <ImageSpinner
        folder={color.folder}
        fileSuffix={color.fileSuffix || ''}
        frameCount={FRAME_COUNT}
        frameIndex={frameIndex}
        onFrameChange={setFrameIndex}
      />
    )
  }

  const can3D = view === 'exterior' && color.glb

  return (
    <div className="app">
      <div className="viewer-pane" style={{ position: 'relative' }}>
        {renderViewer()}
        {can3D && (
          <button className={`view-3d-btn${show3D ? ' active' : ''}`}
            onClick={() => setShow3D((v) => !v)}>
            {show3D ? 'Renders' : '3D'}
          </button>
        )}
      </div>
      <div className="config-pane">
        <SaunaPanel
          modelName={model.name}
          colors={model.colors}
          interiors={model.interiors}
          rooms={model.rooms}
          colorId={colorId}
          view={view}
          interiorId={interiorId}
          roomId={roomId}
          onColorChange={handleColorChange}
          onViewChange={setView}
          onInteriorChange={setInteriorId}
          onRoomChange={setRoomId}
        />
      </div>
    </div>
  )
}
