import { useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { getPublishedConfigurator, trackView, getOrder } from '../firebase/db.js'
import { ConfiguratorRenderer } from '../components/ConfiguratorRenderer.jsx'
import { parseSelectionFromQuery, selectionFromOrder } from '../embed/embedApi.js'

export default function EmbedView() {
  const { id } = useParams()
  const { search } = useLocation()
  const [config, setConfig] = useState(undefined) // undefined = loading
  const [initialSelection, setInitialSelection] = useState(null)
  const [stateLoading, setStateLoading] = useState(false)

  useEffect(() => {
    getPublishedConfigurator(id).then((cfg) => {
      setConfig(cfg)
      if (cfg) trackView(id)
    })
  }, [id])

  // Resolve initial selection: ?order=ID first (most authoritative), then plain query params.
  useEffect(() => {
    if (!config) return
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    const orderId = params.get('order')
    if (orderId) {
      setStateLoading(true)
      getOrder(orderId)
        .then((order) => {
          if (order && order.configuratorId === id) {
            setInitialSelection(selectionFromOrder(order, config))
          } else {
            // Fall back to query params if order not found / mismatch
            setInitialSelection(parseSelectionFromQuery(search))
          }
        })
        .catch(() => setInitialSelection(parseSelectionFromQuery(search)))
        .finally(() => setStateLoading(false))
      return
    }
    setInitialSelection(parseSelectionFromQuery(search))
  }, [config, search, id])

  if (config === undefined || stateLoading) return <div className="embed-loading">Loading…</div>

  if (!config) {
    return (
      <div className="embed-inactive">
        <div className="embed-inactive-box">
          <h2>Configurator unavailable</h2>
          <p>This configurator is not published or the subscription is inactive.</p>
        </div>
      </div>
    )
  }

  return (
    <ConfiguratorRenderer
      config={config}
      initialSelection={initialSelection}
      enableEmbedApi
    />
  )
}
