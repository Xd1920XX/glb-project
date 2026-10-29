import { useNavigate } from 'react-router-dom'

const COLLECTIONS = [
  {
    id: 'premium',
    label: 'Premium Collection',
    models: [
      { id: '01', name: 'City XS',      folder: '/Mudelid/02_City XS/Pööratav must',           modelId: 'city-xs' },
      { id: '02', name: 'City',         folder: '/Mudelid/03_Saun City/Pööratav must',         modelId: 'city' },
      { id: '03', name: 'City LUX',     folder: '/Mudelid/04_Saun City LUX/Pööratav must',     modelId: 'city-lux' },
      { id: '04', name: 'City XL',      folder: '/Mudelid/05_City XL/Pööratav must',           modelId: 'city-xl' },
      { id: '05', name: 'City Elegant', folder: '/Mudelid/07_Saun City Elegant/Must pööratav', modelId: 'city-elegant' },
    ],
  },
  {
    id: 'premium-plus',
    label: 'Premium Plus Collection',
    models: [
      { id: '06', name: 'Panorama', folder: '/Mudelid/06_Panorama/Pööratav must',          modelId: 'panorama' },
      { id: '07', name: 'Grande',   folder: '/Mudelid/08_Grande/Pööratav_Must',            modelId: 'grande' },
      { id: '08', name: 'Nordic',   folder: '/Mudelid/10_Denmark/Pööratav must',           modelId: 'denmark' },
      { id: '09', name: 'Elegant',  folder: '/Mudelid/09_Saun Elegant/Must pööratav',      modelId: 'elegant' },
      { id: '10', name: 'Imperial', folder: '/Mudelid/01_Saun Duširuumiga/Pööratav must',  modelId: 'sauna-dushiga' },
    ],
  },
]

const frameUrl = (folder, n) => encodeURI(`${folder}/${n}.jpg`)

function ModelCard({ model, onClick }) {
  return (
    <div className="sl-model-card" onClick={onClick}>
      <div className="sl-model-img-wrap">
        <img
          src={frameUrl(model.folder, 1)}
          alt={model.name}
          loading="lazy"
          className="sl-model-frame is-active"
        />
        <div className="sl-model-overlay">
          <span className="sl-model-configure">Configure →</span>
        </div>
      </div>
      <div className="sl-model-info">
        <span className="sl-model-num">{model.id}</span>
        <span className="sl-model-name">{model.name}</span>
      </div>
    </div>
  )
}

export default function SaunaLanding() {
  const navigate = useNavigate()

  return (
    <div className="sl-page">

      {/* ── Header ── */}
      <header className="sl-header">
        <span className="sl-logo">
          <img src="https://minisaun.ee/wp-content/uploads/2022/08/Minisaunlogo2-valge-1024x289.png"></img>
        </span>
        <button className="sl-header-cta" onClick={() => navigate('/configure')}>
          Configure →
        </button>
      </header>

      {/* ── Models (grouped by collection) ── */}
      <section className="sl-models" id="models">
        <div className="sl-models-header">
          <p className="sl-section-eyebrow">Our models</p>
          <h2 className="sl-section-title">Choose your model</h2>
        </div>

        {COLLECTIONS.map((col) => (
          <div key={col.id} className="sl-collection">
            <h3 className="sl-collection-label">{col.label}</h3>
            <div className="sl-models-grid">
              {col.models.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  onClick={() => navigate(model.modelId ? `/configure/${model.modelId}` : '/configure')}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── Footer ── */}
      <footer className="sl-footer" id="contact">
        <span className="sl-logo">
                    <img src="https://minisaun.ee/wp-content/uploads/2022/08/Minisaunlogo2-valge-1024x289.png"></img>
        </span>
        <p className="sl-footer-copy">© {new Date().getFullYear()} All rights reserved.</p>
      </footer>
    </div>
  )
}
