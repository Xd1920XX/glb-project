import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublishedConfigurator } from '../firebase/db.js'
import { ConfiguratorRenderer } from '../components/ConfiguratorRenderer.jsx'

export default function EmbedView() {
  const { id } = useParams()
  const [config, setConfig] = useState(undefined) // undefined = loading

  useEffect(() => {
    getPublishedConfigurator(id).then(setConfig)
  }, [id])

  if (config === undefined) return <div className="embed-loading">Loading…</div>

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

  return <ConfiguratorRenderer config={config} />
}
