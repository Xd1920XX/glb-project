import { useState } from 'react'
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

  const color    = model.colors.find((c) => c.id === colorId)
  const interior = model.interiors.find((i) => i.id === interiorId)

  function handleColorChange(id) { setColorId(id); setShow3D(false) }

  function renderViewer() {
    if (view === 'interior') {
      return <InteriorViewer key={interior.id} src={interior.path} />
    }
    if (view === 'order') {
      const src = `${color.folder}/1.jpg`
      return <img key={color.id} src={src} alt={color.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    }
    if (show3D && color.glb) {
      return <SaunaViewer3D key={color.id} glb={color.glb} textureUrl={color.texture} textureMaterials={color.textureMaterials} />
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
      <div className="viewer-pane">
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
          colorId={colorId}
          view={view}
          interiorId={interiorId}
          onColorChange={handleColorChange}
          onViewChange={setView}
          onInteriorChange={setInteriorId}
        />
      </div>
    </div>
  )
}
