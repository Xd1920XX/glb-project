import { useState } from 'react'
import { ImageSpinner } from './components/ImageSpinner.jsx'
import { InteriorViewer } from './components/InteriorViewer.jsx'
import { SaunaViewer3D } from './components/SaunaViewer3D.jsx'
import { SaunaPanel } from './components/SaunaPanel.jsx'
import { COLORS, FRAME_COUNT, INTERIORS } from './config/sauna.js'

export default function App() {
  const [colorId, setColorId] = useState(COLORS[0].id)
  const [frameIndex, setFrameIndex] = useState(0)
  const [view, setView] = useState('exterior')
  const [interiorId, setInteriorId] = useState(INTERIORS[0].id)

  const color = COLORS.find((c) => c.id === colorId)
  const interior = INTERIORS.find((i) => i.id === interiorId)

  function renderViewer() {
    if (view === 'interior') {
      return <InteriorViewer key={interior.id} src={interior.path} />
    }
    if (color.glb) {
      return <SaunaViewer3D key={color.id} glb={color.glb} />
    }
    if (color.image) {
      return (
        <div className="static-image-view">
          <img src={color.image} alt={color.label} draggable={false} />
        </div>
      )
    }
    return (
      <ImageSpinner
        folder={color.folder}
        frameCount={FRAME_COUNT}
        frameIndex={frameIndex}
        onFrameChange={setFrameIndex}
      />
    )
  }

  return (
    <div className="app">
      <div className="viewer-pane">
        {renderViewer()}
      </div>
      <div className="config-pane">
        <SaunaPanel
          colorId={colorId}
          view={view}
          interiorId={interiorId}
          onColorChange={setColorId}
          onViewChange={setView}
          onInteriorChange={setInteriorId}
        />
      </div>
    </div>
  )
}
