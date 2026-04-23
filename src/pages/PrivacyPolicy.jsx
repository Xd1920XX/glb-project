import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-nav">
        <Link to="/" className="legal-nav-back">← GLB Configurator</Link>
      </div>
      <div className="legal-container">
        <div className="legal-header">
          <p className="legal-eyebrow">Nordic Render OÜ</p>
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: 23 April 2026</p>
        </div>

        <div className="legal-body">

          <section>
            <h2>1. Who we are</h2>
            <p>This Privacy Policy applies to the GLB Configurator platform operated by <strong>Nordic Render OÜ</strong>, a private limited company registered in Estonia (Reg. no. 16885822, VAT EE102691294), with registered address at A. H. Tammsaare tee 47, Kristiine linnaosa, 11316 Tallinn, Estonia.</p>
            <p>We are the data controller for personal data collected through our platform at <strong>glbconfigurator.com</strong>.</p>
            <p>Contact us: <a href="mailto:privacy@nordicrender.com">privacy@nordicrender.com</a></p>
          </section>

          <section>
            <h2>2. What data we collect and why</h2>

            <h3>Account data</h3>
            <p>When you register, we collect your <strong>email address</strong> and optionally your name. This is required to create and manage your account. Legal basis: <em>performance of a contract</em> (Art. 6(1)(b) GDPR).</p>

            <h3>Billing data</h3>
            <p>To issue VAT-compliant invoices, we collect billing details you provide: full name, company name, VAT/Tax ID, street address, city, postal code, and country. Legal basis: <em>legal obligation</em> (Art. 6(1)(c) GDPR) and <em>performance of a contract</em>.</p>

            <h3>Payment data</h3>
            <p>Payments are processed by <strong>Stripe, Inc.</strong> We do not store your card details. Stripe transmits to us a transaction ID and subscription status. Stripe's privacy policy: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">stripe.com/privacy</a>.</p>

            <h3>Usage data</h3>
            <p>We collect information about how you use the platform — pages visited, configurators created, embeds published — to improve the service and for billing purposes (embed count). Legal basis: <em>legitimate interest</em> (Art. 6(1)(f) GDPR).</p>

            <h3>Technical data</h3>
            <p>Standard server and browser data including IP address, browser type, operating system, referring URL, and session identifiers are collected automatically. Legal basis: <em>legitimate interest</em>.</p>

            <h3>Communications</h3>
            <p>We send transactional emails (account confirmation, invoices, subscription status) via <strong>SendGrid (Twilio Inc.)</strong>. We do not send marketing emails without your explicit consent. Legal basis: <em>performance of a contract</em>.</p>
          </section>

          <section>
            <h2>3. Cookies and tracking</h2>
            <p>We use the following cookies and local storage:</p>
            <ul>
              <li><strong>Authentication (necessary):</strong> Firebase Authentication stores a session token in your browser's local storage to keep you logged in. Without this, the platform cannot function.</li>
              <li><strong>Analytics (optional):</strong> If you consent, Google Analytics (Firebase Analytics) collects anonymised usage statistics to help us understand how the platform is used. You can withdraw consent at any time via the cookie settings.</li>
            </ul>
            <p>We do not use advertising or third-party tracking cookies.</p>
            <p>See our full <Link to="/cookies">Cookie Policy</Link>.</p>
          </section>

          <section>
            <h2>4. Who we share your data with</h2>
            <p>We do not sell your personal data. We share data only with the following processors, each under a data processing agreement:</p>
            <ul>
              <li><strong>Google / Firebase</strong> — authentication, database (Firestore), file storage, and hosting. Data may be processed in the US under Standard Contractual Clauses.</li>
              <li><strong>Stripe, Inc.</strong> — payment processing. Data processed in the US under Standard Contractual Clauses.</li>
              <li><strong>Twilio SendGrid</strong> — transactional email delivery. Data processed in the US under Standard Contractual Clauses.</li>
            </ul>
          </section>

          <section>
            <h2>5. Data retention</h2>
            <ul>
              <li><strong>Account data:</strong> retained for the duration of your account and deleted within 90 days of account closure.</li>
              <li><strong>Invoices and billing records:</strong> retained for 7 years as required by Estonian accounting law (Raamatupidamise seadus § 12).</li>
              <li><strong>Usage logs:</strong> retained for up to 12 months.</li>
            </ul>
          </section>

          <section>
            <h2>6. Your rights under GDPR</h2>
            <p>As a data subject in the EU/EEA, you have the right to:</p>
            <ul>
              <li><strong>Access</strong> — request a copy of all personal data we hold about you.</li>
              <li><strong>Rectification</strong> — correct inaccurate data.</li>
              <li><strong>Erasure</strong> — request deletion of your data (subject to legal retention obligations).</li>
              <li><strong>Portability</strong> — receive your data in a structured, machine-readable format.</li>
              <li><strong>Restriction</strong> — request that we limit processing of your data.</li>
              <li><strong>Objection</strong> — object to processing based on legitimate interest.</li>
              <li><strong>Withdraw consent</strong> — for any processing based solely on consent (e.g. analytics cookies).</li>
            </ul>
            <p>To exercise any right, email <a href="mailto:privacy@nordicrender.com">privacy@nordicrender.com</a>. We will respond within 30 days. If you believe we have violated your rights, you may lodge a complaint with the <strong>Estonian Data Protection Inspectorate</strong> (<a href="https://www.aki.ee" target="_blank" rel="noopener noreferrer">aki.ee</a>).</p>
          </section>

          <section>
            <h2>7. International transfers</h2>
            <p>Some processors (Google, Stripe, Twilio) are located in the United States. Transfers are covered by Standard Contractual Clauses approved by the European Commission under Art. 46(2)(c) GDPR.</p>
          </section>

          <section>
            <h2>8. Security</h2>
            <p>We implement appropriate technical and organisational measures including encrypted data transmission (TLS), access controls, and Firebase security rules. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2>9. Changes to this policy</h2>
            <p>We may update this policy from time to time. We will notify you of material changes by email. Continued use of the platform after the effective date constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2>10. Contact</h2>
            <p><strong>Nordic Render OÜ</strong><br />
            A. H. Tammsaare tee 47, 11316 Tallinn, Estonia<br />
            <a href="mailto:privacy@nordicrender.com">privacy@nordicrender.com</a></p>
          </section>

        </div>
      </div>
      <LegalFooter />
    </div>
  )
}

export function LegalFooter() {
  return (
    <footer className="legal-footer">
      <div className="legal-footer-inner">
        <span>© {new Date().getFullYear()} Nordic Render OÜ · Reg. 16885822 · VAT EE102691294</span>
        <div className="legal-footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/cookies">Cookie Policy</Link>
        </div>
      </div>
    </footer>
  )
}
