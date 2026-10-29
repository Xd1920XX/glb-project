import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ImageSpinner } from '../components/ImageSpinner.jsx'
import { InteriorViewer } from '../components/InteriorViewer.jsx'
import { SaunaPanel } from '../components/SaunaPanel.jsx'
import { MODELS, FRAME_COUNT } from '../config/sauna.js'

export default function SaunaConfigurator() {
  const { modelId } = useParams()
  const model = MODELS[modelId] ?? MODELS['city-xs']

  const [colorId, setColorId]       = useState(model.colors[0].id)
  const [frameIndex, setFrameIndex] = useState(0)
  const [view, setView]             = useState('exterior')
  const [interiorId, setInteriorId] = useState(model.interiors[0].id)
  const [roomId, setRoomId]         = useState(model.rooms?.[0]?.id ?? null)

  const color    = model.colors.find((c) => c.id === colorId)
  const interior = model.interiors.find((i) => i.id === interiorId)

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

  return (
    <div className="app">
      <div className="viewer-pane" style={{ position: 'relative' }}>
        {renderViewer()}
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
          onColorChange={setColorId}
          onViewChange={setView}
          onInteriorChange={setInteriorId}
          onRoomChange={setRoomId}
        />
      </div>
    </div>
  )
}
