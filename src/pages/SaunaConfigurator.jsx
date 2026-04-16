import { useState } from 'react'
import { ImageSpinner } from '../components/ImageSpinner.jsx'
import { InteriorViewer } from '../components/InteriorViewer.jsx'
import { SaunaViewer3D } from '../components/SaunaViewer3D.jsx'
import { SaunaPanel } from '../components/SaunaPanel.jsx'
import { COLORS, FRAME_COUNT, INTERIORS } from '../config/sauna.js'

export default function SaunaConfigurator() {
  const [colorId, setColorId]     = useState(COLORS[0].id)
  const [frameIndex, setFrameIndex] = useState(0)
  const [view, setView]           = useState('exterior')
  const [show3D, setShow3D]       = useState(false)
  const [interiorId, setInteriorId] = useState(INTERIORS[0].id)

  const color    = COLORS.find((c) => c.id === colorId)
  const interior = INTERIORS.find((i) => i.id === interiorId)

  function handleColorChange(id) { setColorId(id); setShow3D(false) }

  function renderViewer() {
    if (view === 'interior') {
      return <InteriorViewer key={interior.id} src={interior.path} />
    }
    if (show3D && color.glb) {
      return <SaunaViewer3D key={color.id} glb={color.glb} textureUrl={color.texture} envIntensity={color.texture ? 1 : 3} />
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
