import { useEffect, useMemo, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { getPublishedConfigurator, trackView, getOrder } from '../firebase/db.js'
import { ConfiguratorRenderer } from '../components/ConfiguratorRenderer.jsx'
import { parseSelectionFromQuery, selectionFromOrder } from '../embed/embedApi.js'
import { applyConfigTranslations } from '../utils/configTranslations.js'

export default function EmbedView() {
  const { id } = useParams()
  const { search } = useLocation()
  const [config, setConfig] = useState(undefined) // undefined = loading
  // undefined = pending resolution, null = resolved with no selection, object = resolved
  const [initialSelection, setInitialSelection] = useState(undefined)

  useEffect(() => {
    getPublishedConfigurator(id).then((cfg) => {
      setConfig(cfg)
      if (cfg) trackView(id)
    })
  }, [id])

  // Resolve initial selection: ?order=ID first (most authoritative), then plain query params.
  // Must complete BEFORE ConfiguratorRenderer mounts — its useState initializers only run once.
  useEffect(() => {
    if (!config) return
    setInitialSelection(undefined)
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    const orderId = params.get('order')
    const fromQuery = parseSelectionFromQuery(search)
    if (orderId) {
      getOrder(orderId)
        .then((order) => {
          if (order && order.configuratorId === id) {
            setInitialSelection(selectionFromOrder(order, config))
          } else {
            setInitialSelection(fromQuery)
          }
        })
        .catch(() => setInitialSelection(fromQuery))
      return
    }
    setInitialSelection(fromQuery)
  }, [config, search, id])

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

  // Wait for selection resolution before mounting renderer.
  // ConfiguratorRenderer reads initialSelection in useState initializers (runs once only),
  // so we must not mount until the parsed value is available.
  if (initialSelection === undefined) return <div className="embed-loading">Loading…</div>

  return <TranslatedRenderer config={config} initialSelection={initialSelection} search={search} />
}

function TranslatedRenderer({ config, initialSelection, search }) {
  const initialLang = useMemo(() => {
    const p = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    return p.get('lang') || null
  }, [search])

  const [lang, setLang] = useState(initialLang)

  // Available locales = anything the config has translations for, plus the
  // implicit default (no translation overlay = original strings).
  const locales = useMemo(() => {
    const keys = config?.translations ? Object.keys(config.translations) : []
    return [null, ...keys]
  }, [config])

  const translatedConfig = useMemo(
    () => applyConfigTranslations(config, lang),
    [config, lang]
  )

  // Reflect language in URL so the choice is shareable/back-button-friendly.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (lang) params.set('lang', lang)
    else params.delete('lang')
    const qs = params.toString()
    const next = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash
    window.history.replaceState(null, '', next)
  }, [lang])

  // Key the renderer by selection + lang so changes re-mount fresh state.
  const renderKey = `${lang || 'default'}::${JSON.stringify(initialSelection)}`

  return (
    <ConfiguratorRenderer
      key={renderKey}
      config={translatedConfig}
      initialSelection={initialSelection}
      enableEmbedApi
      locales={locales}
      currentLocale={lang}
      onLocaleChange={setLang}
    />
  )
}
