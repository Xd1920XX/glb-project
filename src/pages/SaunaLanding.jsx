import { useNavigate } from 'react-router-dom'

const MODELS = [
  { id: '01', name: 'City XS',          image: encodeURI('/Mudelid/02_City XS/Pööratav must/1.jpg'),            modelId: 'city-xs' },
  { id: '02', name: 'Saun City',        image: encodeURI('/Mudelid/03_Saun City/Pööratav must/1.jpg'),          modelId: 'city' },
  { id: '03', name: 'Saun City LUX',    image: encodeURI('/Mudelid/04_Saun City LUX/Pööratav must/1.jpg'),      modelId: 'city-lux' },
  { id: '04', name: 'City XL',          image: encodeURI('/Mudelid/05_City XL/Pööratav must/1.jpg'),            modelId: 'city-xl' },
  { id: '05', name: 'Panorama',         image: encodeURI('/Mudelid/06_Panorama/Pööratav must/1.jpg'),           modelId: 'panorama' },
  { id: '06', name: 'Saun City Elegant',image: encodeURI('/Mudelid/07_Saun City Elegant/Must pööratav/1.jpg'),  modelId: 'city-elegant' },
  { id: '07', name: 'Grande',           image: encodeURI('/Mudelid/08_Grande/Pööratav_Must/1.jpg'),             modelId: 'grande' },
  { id: '08', name: 'Saun Elegant',     image: encodeURI('/Mudelid/09_Saun Elegant/Must pööratav/1.jpg'),       modelId: 'elegant' },
  { id: '09', name: 'Denmark',          image: encodeURI('/Mudelid/10_Denmark/Pööratav must/1.jpg'),            modelId: 'denmark' },
  { id: '10', name: 'Saun Duširuumiga', image: encodeURI('/Mudelid/01_Saun Duširuumiga/Pööratav must/1.jpg'),   modelId: 'sauna-dushiga' },
]


export default function SaunaLanding() {
  const navigate = useNavigate()

  return (
    <div className="sl-page">

      {/* ── Header ── */}
      <header className="sl-header">
        <span className="sl-logo">
          <img src="https://minisaun.ee/wp-content/uploads/2022/08/Minisaunlogo2-valge-1024x289.png"></img>
        </span>
        {/* <nav className="sl-nav">
          <a href="#models">Models</a>
          <a href="#contact">Contact</a>
        </nav> */}
        <button className="sl-header-cta" onClick={() => navigate('/configure')}>
          Configure →
        </button>
      </header>

      {/* ── Hero ── */}
      {/* <section className="sl-hero">
        <div className="sl-hero-content">
          <p className="sl-hero-eyebrow">Handcrafted in Estonia</p>
          <h1 className="sl-hero-title">Your perfect<br />sauna awaits</h1>
          <p className="sl-hero-sub">
            Nine models. Infinite configurations.<br />
            Built to last a lifetime.
          </p>
          <button className="sl-hero-btn" onClick={() => navigate('/configure')}>
            Open configurator
          </button>
        </div>
        <div className="sl-hero-image-wrap">
          <img src={MODELS[0].image} alt="Sauna City XS" className="sl-hero-img" />
        </div>
      </section> */}

      {/* ── Models grid ── */}
      <section className="sl-models" id="models">
        <div className="sl-models-header">
          <p className="sl-section-eyebrow">Our models</p>
          <h2 className="sl-section-title">Choose your model</h2>
        </div>

        <div className="sl-models-grid">
          {MODELS.map((model) => (
            <div key={model.id} className="sl-model-card"
              onClick={() => navigate(model.modelId ? `/configure/${model.modelId}` : '/configure')}>
              <div className="sl-model-img-wrap">
                <img src={model.image} alt={model.name} loading="lazy" />
                <div className="sl-model-overlay">
                  <span className="sl-model-configure">Configure →</span>
                </div>
              </div>
              <div className="sl-model-info">
                <span className="sl-model-num">{model.id}</span>
                <span className="sl-model-name">{model.name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──
      <section className="sl-features">
        {[
          { icon: '⬡', title: 'Premium Materials', desc: 'Nordic spruce and thermowood selected for beauty and durability.' },
          { icon: '◎', title: '3D Configurator', desc: 'Visualise your sauna in real-time before ordering.' },
          { icon: '◈', title: 'Custom Build', desc: 'Every sauna is built to order, tailored to your exact specifications.' },
        ].map((f) => (
          <div key={f.title} className="sl-feature">
            <span className="sl-feature-icon">{f.icon}</span>
            <h3 className="sl-feature-title">{f.title}</h3>
            <p className="sl-feature-desc">{f.desc}</p>
          </div>
        ))}
      </section> */}

      {/* ── CTA banner ── */}
      {/* <section className="sl-cta">
        <h2 className="sl-cta-title">Ready to build yours?</h2>
        <p className="sl-cta-sub">Use our 3D configurator to design your ideal sauna.</p>
        <button className="sl-cta-btn" onClick={() => navigate('/configure')}>
          Open configurator
        </button>
      </section> */}

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
