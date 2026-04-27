import { useNavigate } from 'react-router-dom'

const MODELS = [
  { id: '01', name: 'City XS',      image: '/Mudelid/01_City XS/1.jpg',              modelId: 'city-xs' },
  { id: '02', name: 'City',         image: '/Mudelid/02_City/City_black.png',         modelId: 'city' },
  { id: '03', name: 'City LUX',     image: '/Mudelid/03_City LUX/City LUX_black.png', modelId: 'city-lux' },
  { id: '04', name: 'City XL',      image: '/Mudelid/04_City XL/Saun XL.jpg' },
  { id: '05', name: 'City Elegant', image: '/Mudelid/05_City Elegant/1black.jpg', modelId: 'city-elegant' },
  { id: '06', name: 'Grande',       image: '/Mudelid/06_Grande/Grande.jpg' },
  { id: '07', name: 'Elegant',      image: '/Mudelid/07_Elegant/Elegant.jpg', modelId: 'elegant' },
  { id: '08', name: 'Denmark',      image: '/Mudelid/08_Denmark/Saun-Denmark-nurga-alt-1024x1024.png' },
  { id: '09', name: 'Estonia',      image: '/Mudelid/09_Estonia/saun-city-lux-nurgalt-1024x1024.png' },
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
