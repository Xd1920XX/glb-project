import { Link } from 'react-router-dom'
import { LegalFooter } from './PrivacyPolicy.jsx'

export default function CookiePolicy() {
  return (
    <div className="legal-page">
      <div className="legal-nav">
        <Link to="/" className="legal-nav-back">← GLB Configurator</Link>
      </div>
      <div className="legal-container">
        <div className="legal-header">
          <p className="legal-eyebrow">Nordic Render OÜ</p>
          <h1>Cookie Policy</h1>
          <p className="legal-updated">Last updated: 23 April 2026</p>
        </div>

        <div className="legal-body">

          <section>
            <h2>1. What are cookies</h2>
            <p>Cookies are small text files placed on your device by a website. They are widely used to make websites work, to work more efficiently, and to provide information to site owners. We also use similar technologies such as <strong>localStorage</strong> (data stored in your browser).</p>
          </section>

          <section>
            <h2>2. How we use cookies</h2>
            <p>We keep our cookie use minimal. We use two categories:</p>

            <h3>Strictly necessary (always active)</h3>
            <p>These are required for the platform to function and cannot be disabled.</p>
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Name / Storage key</th>
                  <th>Provider</th>
                  <th>Purpose</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>firebase:authUser:*</code></td>
                  <td>Google Firebase</td>
                  <td>Keeps you logged in to your account. Without this you would be logged out on every page load.</td>
                  <td>Session / until sign-out</td>
                </tr>
                <tr>
                  <td><code>cookie_consent</code></td>
                  <td>GLB Configurator</td>
                  <td>Stores your cookie preference (accepted / declined analytics) so we do not ask again.</td>
                  <td>365 days</td>
                </tr>
              </tbody>
            </table>

            <h3>Analytics (optional — requires consent)</h3>
            <p>If you accept analytics cookies, Google Analytics (Firebase Analytics) is loaded to collect anonymised usage data. We use this to understand which features are most used and to improve the platform.</p>
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Provider</th>
                  <th>Purpose</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>_ga</code></td>
                  <td>Google Analytics</td>
                  <td>Distinguishes unique users using a randomly generated number.</td>
                  <td>2 years</td>
                </tr>
                <tr>
                  <td><code>_ga_*</code></td>
                  <td>Google Analytics</td>
                  <td>Stores and counts page views.</td>
                  <td>2 years</td>
                </tr>
              </tbody>
            </table>
            <p>No advertising, retargeting, or third-party tracking cookies are used.</p>
          </section>

          <section>
            <h2>3. Managing your preferences</h2>
            <p>You can change your cookie preferences at any time by clicking <strong>"Cookie settings"</strong> in the footer of any page, or by clearing your browser's local storage and cookies for this site.</p>
            <p>You can also control cookies at the browser level:</p>
            <ul>
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer">Firefox</a></li>
              <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge" target="_blank" rel="noopener noreferrer">Edge</a></li>
            </ul>
            <p>Note: blocking strictly necessary cookies will prevent you from using the platform.</p>
          </section>

          <section>
            <h2>4. Legal basis</h2>
            <p>Strictly necessary cookies are used on the basis of <em>legitimate interest</em> and are essential to providing the service you have requested. Analytics cookies are only set with your explicit <em>consent</em> (Art. 6(1)(a) GDPR). You may withdraw consent at any time.</p>
          </section>

          <section>
            <h2>5. Contact</h2>
            <p>Questions about our cookie use: <a href="mailto:privacy@nordicrender.com">privacy@nordicrender.com</a></p>
            <p>Full details of how we handle your personal data: <Link to="/privacy">Privacy Policy</Link>.</p>
          </section>

        </div>
      </div>
      <LegalFooter />
    </div>
  )
}
