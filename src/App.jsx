import { useState } from 'react'
import { Viewer3D } from './components/Viewer3D.jsx'
import { ConfigPanel } from './components/ConfigPanel.jsx'
import { OrderModal } from './components/OrderModal.jsx'
import { FRAMES, LIDS, FRONT_PANELS } from './config/models.js'

export default function App() {
  const [frameId, setFrameId] = useState('B3')
  const [lids, setLids] = useState(['Bio', 'Bio', 'Bio'])
  const [showPanels, setShowPanels] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const frame = FRAMES.find((f) => f.id === frameId)
  const panelsUrl = showPanels ? FRONT_PANELS.path : null
  const slots = frame?.slots ?? 3

  function handleFrameChange(id) {
    const newFrame = FRAMES.find((f) => f.id === id)
    const newSlots = newFrame?.slots ?? slots
    setFrameId(id)
    setLids((prev) => {
      if (newSlots > prev.length) {
        return [...prev, ...Array(newSlots - prev.length).fill(prev[prev.length - 1] ?? 'Bio')]
      }
      return prev.slice(0, newSlots)
    })
  }

  function handleLidChange(slotIndex, lidId) {
    setLids((prev) => prev.map((l, i) => (i === slotIndex ? lidId : l)))
  }

  const lidsPrice = lids.reduce((sum, id) => {
    return sum + (LIDS.find((l) => l.id === id)?.price ?? 0)
  }, 0)
  const price = (frame?.price ?? 0) + lidsPrice + (showPanels ? FRONT_PANELS.price : 0)

  return (
    <div className="app">
      <div className="viewer-pane">
        <Viewer3D
          frameUrl={frame?.path}
          lids={lids}
          panelsUrl={panelsUrl}
          slots={slots}
        />
      </div>
      <div className="config-pane">
        <ConfigPanel
          frameId={frameId}
          lids={lids}
          showPanels={showPanels}
          price={price}
          onFrameChange={handleFrameChange}
          onLidChange={handleLidChange}
          onPanelsChange={setShowPanels}
          onOrder={() => setModalOpen(true)}
        />
      </div>

      {modalOpen && (
        <OrderModal
          config={{ frameId, lids, showPanels }}
          price={price}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
