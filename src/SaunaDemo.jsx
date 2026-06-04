import { useEffect, useState } from 'react'
import { getPublishedConfigurator, trackView } from './firebase/db.js'
import { ConfiguratorRenderer } from './components/ConfiguratorRenderer.jsx'

const DEMO_ID = 'ysiLFw8AYWztMxrTt8x4'

export default function SaunaDemo() {
  const [config, setConfig] = useState(undefined)

  useEffect(() => {
    getPublishedConfigurator(DEMO_ID).then((cfg) => {
      setConfig(cfg)
      if (cfg) trackView(DEMO_ID)
    })
  }, [])

  if (config === undefined) return <div className="embed-loading">Loading…</div>
  if (!config) {
    return (
      <div className="embed-inactive">
        <div className="embed-inactive-box">
          <h2>Demo unavailable</h2>
          <p>The demo configurator is not published or the subscription is inactive.</p>
        </div>
      </div>
    )
  }

  return <ConfiguratorRenderer config={config} />
}
