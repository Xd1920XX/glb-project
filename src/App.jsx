import { useState } from 'react'
import { Viewer3D } from './components/Viewer3D.jsx'
import { ConfigPanel } from './components/ConfigPanel.jsx'
import { OrderModal } from './components/OrderModal.jsx'
import { FRAMES, LIDS, FRONT_PANELS } from './config/models.js'

export default function App() {
  const [frameId, setFrameId] = useState('B3')
  const [lidId, setLidId] = useState('Bio')
  const [showPanels, setShowPanels] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const frame = FRAMES.find((f) => f.id === frameId)
  const lid = LIDS.find((l) => l.id === lidId)
  const panelsUrl = showPanels ? FRONT_PANELS.path : null
  const slots = frame?.slots ?? 5
  const price = (frame?.price ?? 0) + (lid?.price ?? 0) + (showPanels ? FRONT_PANELS.price : 0)

  return (
    <div className="app">
      <div className="viewer-pane">
        <Viewer3D frameUrl={frame?.path} lidUrl={lid?.path} panelsUrl={panelsUrl} slots={slots} lidId={lidId} />
      </div>
      <div className="config-pane">
        <ConfigPanel
          frameId={frameId}
          lidId={lidId}
          showPanels={showPanels}
          price={price}
          onFrameChange={setFrameId}
          onLidChange={setLidId}
          onPanelsChange={setShowPanels}
          onOrder={() => setModalOpen(true)}
        />
      </div>

      {modalOpen && (
        <OrderModal
          config={{ frameId, lidId, showPanels }}
          price={price}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
