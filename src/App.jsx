import { useState } from 'react'
import { Viewer3D } from './components/Viewer3D.jsx'
import { ConfigPanel } from './components/ConfigPanel.jsx'
import { OrderModal } from './components/OrderModal.jsx'
import { FRONT_PANELS } from './config/models.js'
import { useConfigurator } from './hooks/useConfigurator.js'

export default function App() {
  const cfg = useConfigurator()
  const [modalOpen, setModalOpen] = useState(false)

  const panelsUrl = cfg.showPanels ? FRONT_PANELS.path : null

  return (
    <div className="app">
      <div className="viewer-pane">
        <Viewer3D
          frameUrl={cfg.frame?.path}
          frameId={cfg.frameId}
          lids={cfg.lids}
          panelsUrl={panelsUrl}
          slots={cfg.slots}
        />
      </div>
      <div className="config-pane">
        <ConfigPanel
          frameId={cfg.frameId}
          lids={cfg.lids}
          showPanels={cfg.showPanels}
          price={cfg.price}
          onFrameChange={cfg.setFrame}
          onLidChange={cfg.setLidType}
          onVariantChange={cfg.setLidVariant}
          onPanelsChange={cfg.setShowPanels}
          onOrder={() => setModalOpen(true)}
        />
      </div>

      {modalOpen && (
        <OrderModal
          frameId={cfg.frameId}
          lids={cfg.lids}
          showPanels={cfg.showPanels}
          price={cfg.price}
          onClose={() => setModalOpen(false)}
        />
      )}

    </div>
  )
}
