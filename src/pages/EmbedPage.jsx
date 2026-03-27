import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Viewer3D } from '../components/Viewer3D.jsx'
import { ConfigPanel } from '../components/ConfigPanel.jsx'
import { OrderModal } from '../components/OrderModal.jsx'
import { FRAMES, LIDS, FRONT_PANELS } from '../config/models.js'
import { api } from '../api/client.js'

export default function EmbedPage() {
  const { id } = useParams()
  const [ready, setReady] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const [frameId, setFrameId] = useState('B3')
  const [lidId, setLidId] = useState('Bio')
  const [showPanels, setShowPanels] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [configuratorId, setConfiguratorId] = useState(null)

  useEffect(() => {
    api.getPublicConfigurator(id)
      .then((cfg) => {
        setFrameId(cfg.default_frame)
        setLidId(cfg.default_lid)
        setShowPanels(Boolean(cfg.default_panels))
        setConfiguratorId(cfg.id)
        if (cfg.accent_color) {
          document.documentElement.style.setProperty('--accent', cfg.accent_color)
        }
        setReady(true)
      })
      .catch(() => setNotFound(true))
  }, [id])

  if (notFound) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Configurator not found.</div>
  if (!ready) return null

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
          configuratorId={configuratorId}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
