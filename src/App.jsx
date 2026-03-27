import { useState } from 'react'
import { Viewer3D } from './components/Viewer3D.jsx'
import { ConfigPanel } from './components/ConfigPanel.jsx'
import { FRAMES, LIDS, FRONT_PANELS } from './config/models.js'

export default function App() {
  const [frameId, setFrameId] = useState('B3')
  const [lidId, setLidId] = useState('Bio')
  const [showPanels, setShowPanels] = useState(true)

  const frameUrl = FRAMES.find((f) => f.id === frameId)?.path
  const lidUrl = LIDS.find((l) => l.id === lidId)?.path
  const panelsUrl = showPanels ? FRONT_PANELS.path : null

  return (
    <div className="app">
      <div className="viewer-pane">
        <Viewer3D frameUrl={frameUrl} lidUrl={lidUrl} panelsUrl={panelsUrl} />
      </div>
      <div className="config-pane">
        <ConfigPanel
          frameId={frameId}
          lidId={lidId}
          showPanels={showPanels}
          onFrameChange={setFrameId}
          onLidChange={setLidId}
          onPanelsChange={setShowPanels}
        />
      </div>
    </div>
  )
}
