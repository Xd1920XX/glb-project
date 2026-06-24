import { Link } from 'react-router-dom'

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Card({ icon, title, children }) {
  return (
    <div className="feature-card">
      <div className="feature-icon-wrap">{icon}</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  )
}

function Section({ eyebrow, title, lead, children }) {
  return (
    <section className="features-section">
      <div className="section-eyebrow">{eyebrow}</div>
      <h2 className="section-title">{title}</h2>
      {lead && <p className="pricing-sub" style={{ maxWidth: 720, margin: '0 auto 40px' }}>{lead}</p>}
      <div className="features">{children}</div>
    </section>
  )
}

export default function Features() {
  return (
    <div className="landing">
      {/* ── Nav ── */}
      <nav className="landing-nav">
        <Link to="/"><img src="/logo.svg" alt="glbconfigurator" className="landing-logo-img" /></Link>
        <div className="landing-nav-links">
          <Link to="/features">Features</Link>
          <Link to="/demo">Demo</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup" className="btn-primary">Get started</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="glbm-hero">
        <div className="glbm-hero-inner">
          <div className="section-eyebrow">All capabilities</div>
          <h1 className="glbm-hero-title">Everything the platform can do</h1>
          <p className="glbm-hero-sub">
            A complete map of the features available to every account. Build configurators,
            customise the viewer, capture orders, publish landing pages, embed anywhere, and
            collaborate as a team — all from one place.
          </p>
          <div className="hero-actions" style={{ marginTop: 28 }}>
            <Link to="/signup" className="btn-primary btn-lg">Start free trial</Link>
            <Link to="/demo" className="btn-ghost btn-lg">See live demo →</Link>
          </div>
        </div>
      </section>

      {/* ── 3D & assets ── */}
      <Section
        eyebrow="3D &amp; Assets"
        title={<>Build with the assets you have</>}
        lead="Upload GLB models, 360° image sequences, or panoramic interiors — combine them in any configurator."
      >
        <Card
          title="GLB 3D models"
          icon={<svg {...ICON_PROPS}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>}
        >
          Upload .glb files and render them with real-time WebGL. PBR materials, animations, and
          Draco-compressed meshes all supported.
        </Card>
        <Card
          title="Stacked GLB layers"
          icon={<svg {...ICON_PROPS}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>}
        >
          Combine multiple GLB files at the same origin to build composite products — body, cushion,
          legs, accessories — each independently toggleable and transformable.
        </Card>
        <Card
          title="Material overrides"
          icon={<svg {...ICON_PROPS}><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><path d="M12 22a10 10 0 0 1 0-20c5.5 0 10 4 10 9 0 3-2 5-5 5h-2a2 2 0 0 0-2 2 3 3 0 0 1-3 3 1.5 1.5 0 0 1-1.5-1.5"/></svg>}
        >
          Per-material color, base map, normal, roughness, metalness, emissive and AO replacements —
          the original GLB is never modified.
        </Card>
        <Card
          title="360° rotation spinner"
          icon={<svg {...ICON_PROPS}><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>}
        >
          Drag-to-rotate image sequences for products you have photographed but not modelled. Auto-
          preload, configurable sensitivity, optional auto-spin.
        </Card>
        <Card
          title="Panoramic interiors"
          icon={<svg {...ICON_PROPS}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
        >
          Equirectangular 360° interior views on a separate embed tab — for saunas, cabins, rooms,
          and vehicles.
        </Card>
        <Card
          title="Built-in media library"
          icon={<svg {...ICON_PROPS}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
        >
          Drag-and-drop uploads, batch operations, auto image optimisation, search, and reuse across
          every configurator on your account.
        </Card>
      </Section>

      {/* ── Variants & options ── */}
      <Section
        eyebrow="Customer-facing options"
        title={<>Turn your product into pickable choices</>}
        lead="Expose colors, parts, and variants as friendly dropdowns and swatches with conditional logic when you need it."
      >
        <Card
          title="Variant groups"
          icon={<svg {...ICON_PROPS}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>}
        >
          Organise variants into categories (Color, Size, Material). Each group renders as one
          picker for your customer.
        </Card>
        <Card
          title="Color options &amp; swatches"
          icon={<svg {...ICON_PROPS}><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>}
        >
          Named colors map to material overrides. Customers see swatches; the configurator updates
          the 3D view instantly.
        </Card>
        <Card
          title="Part options"
          icon={<svg {...ICON_PROPS}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
        >
          Add per-variant sub-pickers like "Legs: Wood / Steel" that swap GLB layers or material
          overrides on the fly.
        </Card>
        <Card
          title="Conditional groups"
          icon={<svg {...ICON_PROPS}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
        >
          Show a group only when another group has a specific selection. Build branching configurators
          without splitting into multiple products.
        </Card>
        <Card
          title="Per-variant pricing"
          icon={<svg {...ICON_PROPS}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
        >
          Attach a price tag to each variant. The embed shows a live "from €X" or per-selection
          total.
        </Card>
        <Card
          title="Animations"
          icon={<svg {...ICON_PROPS}><polygon points="5 3 19 12 5 21 5 3"/></svg>}
        >
          If the GLB ships with animation clips, pick one to autoplay or crossfade between clips as
          the customer switches variants.
        </Card>
      </Section>

      {/* ── Viewer ── */}
      <Section
        eyebrow="Viewer &amp; rendering"
        title={<>Pixel-perfect product visuals</>}
        lead="Forty-plus fine-grained controls — or pick a preset and ship."
      >
        <Card
          title="Camera &amp; orbit controls"
          icon={<svg {...ICON_PROPS}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
        >
          FOV, pan, zoom range, polar / azimuth limits, damping, snap rotation, idle delay, auto-rotate
          with hover pause.
        </Card>
        <Card
          title="Lighting presets"
          icon={<svg {...ICON_PROPS}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 4 12.7V17H8v-2.3A7 7 0 0 1 12 2z"/></svg>}
        >
          Six one-click looks — Default, Bright, Outdoor, Dramatic, Soft, Natural — or tune ambient,
          key, fill, and IBL manually.
        </Card>
        <Card
          title="Environment maps"
          icon={<svg {...ICON_PROPS}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
        >
          Six built-in HDRI environments (city, studio, forest, apartment, dawn, night) driving
          reflections and ambient color.
        </Card>
        <Card
          title="Tone mapping"
          icon={<svg {...ICON_PROPS}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>}
        >
          ACES Filmic, Linear, Reinhard, Cineon, Neutral. Pixel ratio cap and quality dial to balance
          fidelity with performance.
        </Card>
        <Card
          title="Shadows &amp; effects"
          icon={<svg {...ICON_PROPS}><circle cx="12" cy="12" r="5"/><ellipse cx="12" cy="20" rx="6" ry="1.2"/></svg>}
        >
          Real-time shadows, contact shadows, ground plane, fog (linear or exponential), wireframe
          and flat-shade debug modes.
        </Card>
        <Card
          title="Render modes"
          icon={<svg {...ICON_PROPS}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
        >
          Solid or X-ray with adjustable opacity — useful for showing internal structure of complex
          products.
        </Card>
      </Section>

      {/* ── Interactive ── */}
      <Section
        eyebrow="Interactive"
        title={<>Engage customers beyond rotation</>}
      >
        <Card
          title="Hotspots"
          icon={<svg {...ICON_PROPS}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}
        >
          Place clickable pins on the 3D model with label, description, and optional link. Pins rotate
          with the model in world space.
        </Card>
        <Card
          title="iOS AR Quick Look"
          icon={<svg {...ICON_PROPS}><rect x="3" y="5" width="14" height="14" rx="2"/><path d="M21 17V9l-4 4"/></svg>}
        >
          One tap on iPhone / iPad places the product at true scale in the customer's room — USDZ is
          built on demand with the exact material overrides.
        </Card>
        <Card
          title="Android Scene Viewer"
          icon={<svg {...ICON_PROPS}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>}
        >
          The AR button on Android opens Google Scene Viewer with the primary GLB layer for in-room
          placement.
        </Card>
        <Card
          title="Screenshot &amp; share"
          icon={<svg {...ICON_PROPS}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
        >
          Let customers download a PNG of the current view, or copy a stable URL that re-hydrates
          their exact selection.
        </Card>
        <Card
          title="FPS &amp; debug overlays"
          icon={<svg {...ICON_PROPS}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
        >
          On-screen FPS counter, wireframe view, grid helper — designer aids you can toggle during
          tuning and hide before publishing.
        </Card>
        <Card
          title="Customisable cursor"
          icon={<svg {...ICON_PROPS}><path d="M13 13l6 6"/><path d="M5 3l7 17 2-7 7-2z"/></svg>}
        >
          Change the cursor inside the viewer to communicate that the model is interactive.
        </Card>
      </Section>

      {/* ── Branding ── */}
      <Section
        eyebrow="Branding"
        title={<>Make it look like yours</>}
      >
        <Card
          title="Preset themes"
          icon={<svg {...ICON_PROPS}><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><path d="M12 22a10 10 0 0 1 0-20c5.5 0 10 4 10 9 0 3-2 5-5 5h-2a2 2 0 0 0-2 2 3 3 0 0 1-3 3 1.5 1.5 0 0 1-1.5-1.5"/></svg>}
        >
          Five curated themes — Minimal, Slate, Warm, Forest, Bold — as one-click starting points.
        </Card>
        <Card
          title="Custom color tokens"
          icon={<svg {...ICON_PROPS}><path d="M19 11h2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V11h2"/><path d="M12 16V3M5 8l7-7 7 7"/></svg>}
        >
          Override accent, background, surface, border, and text colors with hex codes — each
          configurator can carry its own look.
        </Card>
        <Card
          title="Logo watermark"
          icon={<svg {...ICON_PROPS}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>}
        >
          Place your logo on the viewer with configurable corner, opacity, and size.
        </Card>
        <Card
          title="Fonts &amp; dark mode"
          icon={<svg {...ICON_PROPS}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>}
        >
          Pick sans, serif, mono, or display fonts. Built-in dark mode toggle for both viewer and
          panel.
        </Card>
        <Card
          title="Custom tab labels"
          icon={<svg {...ICON_PROPS}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>}
        >
          Rename the Exterior / Interior / Order tabs to match your product's vocabulary.
        </Card>
        <Card
          title="Branded landing pages"
          icon={<svg {...ICON_PROPS}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>}
        >
          Bundle multiple configurators under one branded URL. Five layouts: Hero, Minimal, Magazine,
          Bento, Split.
        </Card>
      </Section>

      {/* ── Commerce ── */}
      <Section
        eyebrow="Commerce"
        title={<>Capture orders without leaving the configurator</>}
      >
        <Card
          title="Built-in order form"
          icon={<svg {...ICON_PROPS}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
        >
          Text, email, phone, textarea, select, checkbox, and number fields. Drag to reorder, mark
          required, set placeholders and custom labels.
        </Card>
        <Card
          title="Snapshot capture"
          icon={<svg {...ICON_PROPS}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
        >
          Every submission stores a PNG snapshot of the configurator at the moment the customer
          ordered — perfect for confirmation emails.
        </Card>
        <Card
          title="State URLs"
          icon={<svg {...ICON_PROPS}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
        >
          Each order gets a permanent URL that recreates the customer's exact configuration when
          opened.
        </Card>
        <Card
          title="Orders dashboard"
          icon={<svg {...ICON_PROPS}><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg>}
        >
          View every submission with filter by configurator, expandable detail, and one-click CSV
          export.
        </Card>
        <Card
          title="Multi-language storefront"
          icon={<svg {...ICON_PROPS}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
        >
          Translate variant names, labels, and form copy into any locale. Customer sees a language
          switcher and locale-correct copy.
        </Card>
        <Card
          title="WooCommerce / Shopify hooks"
          icon={<svg {...ICON_PROPS}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>}
        >
          Drive the embed from your store's variation dropdowns and attach snapshot + state URL to
          the order line items via the postMessage API.
        </Card>
      </Section>

      {/* ── Embedding & integration ── */}
      <Section
        eyebrow="Embedding &amp; integration"
        title={<>Ship to any website</>}
      >
        <Card
          title="Iframe snippet"
          icon={<svg {...ICON_PROPS}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>}
        >
          A single HTML iframe tag — the simplest path, works on any platform.
        </Card>
        <Card
          title="Auto-resizing JS widget"
          icon={<svg {...ICON_PROPS}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>}
        >
          One-line script that creates an auto-resizing iframe and handles cross-origin quirks on
          iOS.
        </Card>
        <Card
          title="URL parameter API"
          icon={<svg {...ICON_PROPS}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>}
        >
          Pre-select variant, color, part options, interior, view tab and language with query string
          parameters. Re-hydrate any past order with <code>?order=</code>.
        </Card>
        <Card
          title="postMessage API"
          icon={<svg {...ICON_PROPS}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
        >
          Bi-directional <code>glbc:</code> events between parent page and embed — read selections,
          push state, switch language, react to order submission.
        </Card>
        <Card
          title="Live test harness"
          icon={<svg {...ICON_PROPS}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
        >
          In-app API demo page with live iframe and event log for verifying integrations before
          shipping.
        </Card>
        <Card
          title="View analytics"
          icon={<svg {...ICON_PROPS}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
        >
          Total embed views per configurator and per landing page — visible on every dashboard
          card.
        </Card>
      </Section>

      {/* ── Operations ── */}
      <Section
        eyebrow="Operations"
        title={<>Tooling for editing day-to-day</>}
      >
        <Card
          title="Auto-save"
          icon={<svg {...ICON_PROPS}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
        >
          Every change persists 1.5 seconds after you stop interacting — no save button to forget.
        </Card>
        <Card
          title="Revisions"
          icon={<svg {...ICON_PROPS}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>}
        >
          Manual save creates a named revision snapshot. Up to 30 per configurator — restore any
          previous version.
        </Card>
        <Card
          title="Undo / redo"
          icon={<svg {...ICON_PROPS}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>}
        >
          Cmd/Ctrl + Z and Cmd/Ctrl + Shift + Z over a 50-step in-memory history while you work.
        </Card>
        <Card
          title="Duplicate configurators"
          icon={<svg {...ICON_PROPS}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
        >
          One-click clone of an existing configurator — variants, settings, media references all
          come along.
        </Card>
        <Card
          title="Team collaboration"
          icon={<svg {...ICON_PROPS}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        >
          Invite teammates by email. Members get full edit access to your configurators (visible
          with a "Shared" badge).
        </Card>
        <Card
          title="AI assistant (add-on)"
          icon={<svg {...ICON_PROPS}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
        >
          Optional Claude-powered chat in the Builder — context-aware suggestions on naming,
          structure, and styling.
        </Card>
      </Section>

      {/* ── Plan limits ── */}
      <section className="features-section">
        <div className="section-eyebrow">Plan limits</div>
        <h2 className="section-title">What is included on each plan</h2>
        <p className="pricing-sub" style={{ maxWidth: 720, margin: '0 auto 40px' }}>
          Every feature above is available on every paid plan. Plans differ only in volume — how
          many configurators you can publish, storage, and monthly views.
        </p>

        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          <table className="feat-table" style={{
            width: '100%',
            maxWidth: 900,
            margin: '0 auto',
            borderCollapse: 'collapse',
            fontSize: 14,
            textAlign: 'left',
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Limit</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Trial</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Starter</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Pro</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Custom</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Published embeds',   '3',     '3',      '12',     'Unlimited'],
                ['Landing pages',      '1',     '1',      '5',      'Unlimited'],
                ['Monthly views',      '5k',    '5k',     '25k',    'Custom'],
                ['Asset storage',      '1 GB',  '1 GB',   '5 GB',   'Custom'],
                ['Configurators',      'Unlimited (drafts)', 'Unlimited (drafts)', 'Unlimited (drafts)', 'Unlimited'],
                ['Duration',           '3 days', 'Monthly or yearly', 'Monthly or yearly', 'Custom'],
                ['Team members',       '—',     'On request', 'On request', 'Included'],
                ['White-label',        '—',     '—',      '—',      'Included'],
              ].map((row) => (
                <tr key={row[0]} style={{ borderBottom: '1px solid var(--border)' }}>
                  {row.map((cell, i) => (
                    <td key={i} style={{ padding: '14px 16px', color: i === 0 ? 'var(--text)' : 'var(--text-muted)' }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 32 }}>
          <Link to="/#pricing" className="btn-ghost">See full pricing →</Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2>Ready to try every feature?</h2>
          <p>Start the free trial — every capability on this page is unlocked immediately.</p>
          <div className="hero-actions">
            <Link to="/signup" className="btn-primary btn-lg">Start free trial</Link>
            <Link to="/contact" className="btn-ghost btn-lg">Talk to us</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <img src="/logo.svg" alt="glbconfigurator" className="landing-logo-img" />
            <p>Build &amp; embed 3D product configurators. Create branded landing pages. Share anywhere.</p>
          </div>
          <div className="landing-footer-links">
            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <Link to="/features">Features</Link>
              <Link to="/demo">Demo</Link>
              <Link to="/signup">Sign up</Link>
              <Link to="/login">Log in</Link>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Resources</div>
              <Link to="/what-is-glb">What is GLB?</Link>
              <Link to="/glb-models">GLB Model Service</Link>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Company</div>
              <Link to="/contact">Contact</Link>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} Nordic Render OÜ · Reg. 16885822 · VAT EE102691294</span>
          <div className="landing-footer-legal">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
