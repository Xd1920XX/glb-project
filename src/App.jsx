import { useState } from 'react'
import { Viewer3D } from './components/Viewer3D.jsx'
import { ConfigPanel } from './components/ConfigPanel.jsx'
import { OrderModal } from './components/OrderModal.jsx'
import { FRAMES, LIDS, FRONT_PANELS, PRICES } from './config/models.js'

export default function App() {
  const [frameId, setFrameId] = useState('B3')
  const [lidId, setLidId] = useState('Bio')
  const [showPanels, setShowPanels] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const frame = FRAMES.find((f) => f.id === frameId)
  const frameUrl = frame?.path
  const lidUrl = LIDS.find((l) => l.id === lidId)?.path
  const panelsUrl = showPanels ? FRONT_PANELS.path : null
  const slots = frame?.slots ?? 5

  const price =
    PRICES.frames[frameId] +
    PRICES.lids[lidId] +
    (showPanels ? PRICES.panels : 0)

  return (
    <div className="app">
      <div className="viewer-pane">
        <Viewer3D frameUrl={frameUrl} lidUrl={lidUrl} panelsUrl={panelsUrl} slots={slots} lidId={lidId} />
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
