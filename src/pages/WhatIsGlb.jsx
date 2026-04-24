import { Link } from 'react-router-dom'

export default function WhatIsGlb() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link to="/" className="landing-logo" style={{ textDecoration: 'none', color: 'inherit' }}>GLB Configurator</Link>
        <div className="landing-nav-links">
          <Link to="/glb-models">GLB Models</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup" className="btn-primary">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="glbm-hero">
        <div className="glbm-hero-inner">
          <div className="section-eyebrow">3D File Format Guide</div>
          <h1 className="glbm-hero-title">What is a GLB file?</h1>
          <p className="glbm-hero-sub">
            GLB is the leading 3D file format for the web — compact, self-contained, and supported
            everywhere from Shopify to iOS AR Quick Look. This page explains what GLB is, why it
            matters for e-commerce, and how to get one for your product.
          </p>
        </div>
      </section>

      {/* What is GLB */}
      <section className="wig-section">
        <div className="wig-section-inner">
          <div className="wig-text-block">
            <div className="section-eyebrow">The basics</div>
            <h2 className="section-title">GLB — the web-ready 3D format</h2>
            <p>
              <strong>GLB</strong> (GL Transmission Format Binary) is the binary version of
              <strong> glTF</strong>, an open standard developed by the Khronos Group — the same
              organisation behind OpenGL and Vulkan. Unlike older 3D formats such as OBJ, FBX, or
              DAE, glTF/GLB was designed specifically for efficient transmission and loading on the
              web and mobile devices.
            </p>
            <p>
              A single <code>.glb</code> file bundles everything into one compact binary package:
              geometry (vertices, normals, UVs), materials (PBR — physically based rendering),
              textures, animations, and scene hierarchy. No separate texture folders. No missing
              files. Just one file you can drop anywhere.
            </p>
            <p>
              The result is typically <strong>5–10× smaller</strong> than an equivalent FBX or OBJ
              export, loads <strong>in seconds</strong> even on mobile, and renders with
              photorealistic quality using the device's native GPU.
            </p>
          </div>

          <div className="wig-fact-grid">
            <div className="wig-fact-card">
              <div className="wig-fact-label">Full name</div>
              <div className="wig-fact-value">GL Transmission Format Binary</div>
            </div>
            <div className="wig-fact-card">
              <div className="wig-fact-label">Extension</div>
              <div className="wig-fact-value">.glb</div>
            </div>
            <div className="wig-fact-card">
              <div className="wig-fact-label">Developed by</div>
              <div className="wig-fact-value">Khronos Group (open standard)</div>
            </div>
            <div className="wig-fact-card">
              <div className="wig-fact-label">Shading model</div>
              <div className="wig-fact-value">Physically Based Rendering (PBR)</div>
            </div>
            <div className="wig-fact-card">
              <div className="wig-fact-label">Includes</div>
              <div className="wig-fact-value">Geometry + materials + textures + animations</div>
            </div>
            <div className="wig-fact-card">
              <div className="wig-fact-label">Compared to FBX</div>
              <div className="wig-fact-value">5–10× smaller, web-native</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why GLB for e-commerce */}
      <section className="wig-why">
        <div className="wig-why-inner">
          <div className="section-eyebrow">E-commerce</div>
          <h2 className="section-title">Why 3D product models matter</h2>
          <p className="wig-why-lead">
            Studies consistently show that interactive 3D product views reduce returns and increase
            conversion. Shoppers who can rotate, zoom, and explore a product are more confident in
            their purchase — and less likely to send it back.
          </p>
          <div className="wig-why-grid">
            <div className="wig-why-card">
              <div className="wig-why-stat">94%</div>
              <div className="wig-why-desc">lower return rate reported by brands using 3D product views (Shopify)</div>
            </div>
            <div className="wig-why-card">
              <div className="wig-why-stat">2.5×</div>
              <div className="wig-why-desc">higher conversion rate vs. static product images alone</div>
            </div>
            <div className="wig-why-card">
              <div className="wig-why-stat">40%</div>
              <div className="wig-why-desc">of consumers say they would pay more for a product they could experience in AR/3D</div>
            </div>
          </div>
        </div>
      </section>

      {/* GLB vs other formats */}
      <section className="wig-section wig-section-alt">
        <div className="wig-section-inner">
          <div className="section-eyebrow">Format comparison</div>
          <h2 className="section-title">GLB vs. other 3D formats</h2>
          <div className="wig-table-wrap">
            <table className="wig-table">
              <thead>
                <tr>
                  <th>Format</th>
                  <th>Web ready</th>
                  <th>Self-contained</th>
                  <th>File size</th>
                  <th>AR support</th>
                  <th>Best for</th>
                </tr>
              </thead>
              <tbody>
                <tr className="wig-table-highlight">
                  <td><strong>GLB</strong></td>
                  <td>✓ Native</td>
                  <td>✓ Yes</td>
                  <td>Small</td>
                  <td>✓ Yes</td>
                  <td>Web, e-commerce, AR</td>
                </tr>
                <tr>
                  <td>FBX</td>
                  <td>No</td>
                  <td>Partial</td>
                  <td>Large</td>
                  <td>No</td>
                  <td>DCC / game engines</td>
                </tr>
                <tr>
                  <td>OBJ</td>
                  <td>Partial</td>
                  <td>No (needs MTL)</td>
                  <td>Medium</td>
                  <td>No</td>
                  <td>Simple meshes</td>
                </tr>
                <tr>
                  <td>USDZ</td>
                  <td>iOS only</td>
                  <td>✓ Yes</td>
                  <td>Medium</td>
                  <td>iOS AR</td>
                  <td>Apple AR Quick Look</td>
                </tr>
                <tr>
                  <td>STL</td>
                  <td>No</td>
                  <td>✓ Yes</td>
                  <td>Large</td>
                  <td>No</td>
                  <td>3D printing</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Where GLB is supported */}
      <section className="wig-section">
        <div className="wig-section-inner">
          <div className="section-eyebrow">Platform support</div>
          <h2 className="section-title">Where GLB files work</h2>
          <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
            GLB has become the industry default for 3D on the web. It's natively supported by every
            major platform and browser.
          </p>
          <div className="wig-platforms">
            {[
              { name: 'Shopify', desc: '3D product media, AR in iOS Safari' },
              { name: 'WordPress', desc: 'Via 3D viewer plugins' },
              { name: 'Wix / Squarespace', desc: 'Embed via iframe or JS widget' },
              { name: 'iOS Safari', desc: 'AR Quick Look — tap to view in your room' },
              { name: 'Android Chrome', desc: 'Scene Viewer AR integration' },
              { name: 'Meta / Facebook', desc: 'Spark AR, 3D post formats' },
              { name: 'Three.js / Babylon', desc: 'Direct GLTFLoader support' },
              { name: 'Sketchfab', desc: 'Native upload and embed' },
              { name: 'GLB Configurator', desc: 'Upload → configure → embed in minutes' },
            ].map((p) => (
              <div key={p.name} className="wig-platform-card">
                <div className="wig-platform-name">{p.name}</div>
                <div className="wig-platform-desc">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to create a GLB */}
      <section className="wig-section wig-section-alt">
        <div className="wig-section-inner">
          <div className="section-eyebrow">Creating GLB files</div>
          <h2 className="section-title">How to get a GLB file for your product</h2>
          <div className="wig-creation-grid">
            <div className="wig-creation-card">
              <div className="wig-creation-num">01</div>
              <h3>Hire a 3D artist</h3>
              <p>
                The most reliable way. A professional creates a photorealistic model from your
                product photos, technical drawings, or CAD files and delivers an optimised GLB
                ready for the web. Typical turnaround: 2–5 business days.
              </p>
              <Link to="/glb-models" className="wig-creation-link">We can do this for you →</Link>
            </div>
            <div className="wig-creation-card">
              <div className="wig-creation-num">02</div>
              <h3>Export from your CAD software</h3>
              <p>
                Many CAD tools (Fusion 360, SolidWorks, Rhino) can export directly to glTF/GLB.
                You may need to re-apply materials and textures since CAD materials differ from
                PBR rendering materials.
              </p>
            </div>
            <div className="wig-creation-card">
              <div className="wig-creation-num">03</div>
              <h3>Use Blender (free)</h3>
              <p>
                Blender is a free, open-source 3D tool with built-in glTF/GLB export. Import
                your existing FBX or OBJ, set up PBR materials, and export as GLB. Requires 3D
                experience — learning curve is steep for beginners.
              </p>
            </div>
            <div className="wig-creation-card">
              <div className="wig-creation-num">04</div>
              <h3>Photogrammetry / scanning</h3>
              <p>
                Take 50–200 photos of a physical product from all angles and use software like
                RealityCapture or Meshroom to generate a 3D mesh. Works best for organic shapes;
                requires post-processing cleanup before use in a configurator.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tips for good GLB files */}
      <section className="wig-section">
        <div className="wig-section-inner">
          <div className="section-eyebrow">Best practices</div>
          <h2 className="section-title">What makes a good GLB for configurators</h2>
          <div className="glbm-feature-grid">
            <div className="glbm-feature-card">
              <div className="glbm-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <h3>Keep geometry clean</h3>
              <p>Under 100k triangles for most web use cases. Remove hidden interior geometry — it's wasted polygons the browser still has to process.</p>
            </div>
            <div className="glbm-feature-card">
              <div className="glbm-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                </svg>
              </div>
              <h3>Use power-of-two textures</h3>
              <p>Texture dimensions like 512×512, 1024×1024, or 2048×2048 load faster and render more efficiently than arbitrary sizes.</p>
            </div>
            <div className="glbm-feature-card">
              <div className="glbm-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
              <h3>Name your materials</h3>
              <p>Give every material a clear name (e.g. "Body_Paint", "Chrome_Trim"). This makes it possible to apply per-material colour overrides in a configurator.</p>
            </div>
            <div className="glbm-feature-card">
              <div className="glbm-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
              </div>
              <h3>Split into logical layers</h3>
              <p>Separate the model into distinct meshes per configurable part — body, doors, wheels, accessories — so each can be toggled or re-coloured independently.</p>
            </div>
            <div className="glbm-feature-card">
              <div className="glbm-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/><path d="M12 8v4l3 3"/>
                </svg>
              </div>
              <h3>Centre and scale correctly</h3>
              <p>Place the model origin at the base centre, scale to real-world units (metres). This ensures the model sits correctly in auto-framing viewers without manual offset hacks.</p>
            </div>
            <div className="glbm-feature-card">
              <div className="glbm-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3>Test on mobile first</h3>
              <p>Most of your viewers will be on phones. Open the file in your mobile browser before going live — if it stutters there, optimise further.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="wig-section wig-section-alt">
        <div className="wig-section-inner wig-faq-inner">
          <div className="section-eyebrow">FAQ</div>
          <h2 className="section-title">Common questions</h2>
          <div className="wig-faq">
            {[
              {
                q: 'What is the difference between GLB and glTF?',
                a: 'glTF is the text-based JSON format that references external binary and texture files. GLB is the binary container that packages everything — the JSON, geometry buffers, and textures — into one single file. For web use, GLB is almost always preferable.',
              },
              {
                q: 'Can I use my existing FBX or OBJ files?',
                a: 'Yes. You can convert them to GLB using Blender (free) or online converters. However, materials and textures often need manual re-assignment after conversion because FBX and OBJ materials don\'t map directly to glTF\'s PBR material model.',
              },
              {
                q: 'What file size should I aim for?',
                a: 'Under 5 MB is ideal for web. Under 2 MB is excellent. Files above 15 MB will result in slow load times on mobile and may be blocked by some platforms. Compress textures with tools like gltfpack or Draco geometry compression to hit these targets.',
              },
              {
                q: 'Do GLB files support animations?',
                a: 'Yes. glTF/GLB fully supports skeletal animations, morph targets, and node-level transformations. You can even have multiple named animation clips in a single file — like "Open", "Close", "Idle" — and play them independently.',
              },
              {
                q: 'Does GLB work with AR on iPhone?',
                a: 'Indirectly. iOS AR Quick Look uses the USDZ format natively. However, many platforms (including Shopify) will auto-convert your GLB to USDZ on the fly so it can trigger AR on iPhones. Android Chrome supports GLB in AR via Scene Viewer directly.',
              },
              {
                q: 'I don\'t have a 3D model. What can I do?',
                a: 'We can create one for you. Send us photos, technical drawings, or CAD files and our team will deliver an optimised, configurator-ready GLB file.',
              },
            ].map((item) => (
              <div key={item.q} className="wig-faq-item">
                <div className="wig-faq-q">{item.q}</div>
                <div className="wig-faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2>Need a GLB model for your product?</h2>
          <p>Our team creates professional, optimised GLB files — ready for your configurator.</p>
          <div className="hero-actions">
            <Link to="/glb-models" className="btn-primary btn-lg">See our model service →</Link>
            <Link to="/signup" className="btn-ghost btn-lg">Start free trial</Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} Nordic Render OÜ · Reg. 16885822</span>
          <div className="landing-footer-legal">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
