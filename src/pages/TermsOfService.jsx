import { Link } from 'react-router-dom'
import { LegalFooter } from './PrivacyPolicy.jsx'

export default function TermsOfService() {
  return (
    <div className="legal-page">
      <div className="legal-nav">
        <Link to="/" className="legal-nav-back">← GLB Configurator</Link>
      </div>
      <div className="legal-container">
        <div className="legal-header">
          <p className="legal-eyebrow">Nordic Render OÜ</p>
          <h1>Terms of Service</h1>
          <p className="legal-updated">Last updated: 23 April 2026</p>
        </div>

        <div className="legal-body">

          <section>
            <h2>1. Agreement</h2>
            <p>These Terms of Service ("Terms") constitute a legally binding agreement between you ("Customer") and <strong>Nordic Render OÜ</strong> (Reg. no. 16885822, A. H. Tammsaare tee 47, 11316 Tallinn, Estonia) governing your use of the GLB Configurator platform at <strong>glbconfigurator.com</strong> ("Service").</p>
            <p>By creating an account or using the Service you agree to these Terms. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2>2. The Service</h2>
            <p>GLB Configurator is a software-as-a-service (SaaS) platform that allows users to upload 3D assets (GLB/360° images), build interactive product configurators, publish branded landing pages, and generate embeddable iframes.</p>
            <p>We reserve the right to modify, suspend, or discontinue any part of the Service at any time. We will provide reasonable advance notice of material changes.</p>
          </section>

          <section>
            <h2>3. Accounts</h2>
            <ul>
              <li>You must provide accurate and complete registration information.</li>
              <li>You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.</li>
              <li>You must be at least 18 years old to use the Service.</li>
              <li>One account per person or legal entity; accounts may not be shared or transferred.</li>
              <li>You must notify us immediately of any unauthorised access at <a href="mailto:support@nordicrender.com">support@nordicrender.com</a>.</li>
            </ul>
          </section>

          <section>
            <h2>4. Subscription and billing</h2>

            <h3>Free trial</h3>
            <p>New accounts receive a 3-day free trial. No credit card is required for the trial. Access is limited to the Starter plan embed count during the trial.</p>

            <h3>Plans and pricing</h3>
            <p>Paid subscriptions are billed monthly in euros (EUR) inclusive of Estonian VAT at the applicable rate (currently 22%). Current pricing is listed at <Link to="/#pricing">glbconfigurator.com/#pricing</Link>. Prices may change with 30 days' notice.</p>

            <h3>Payment</h3>
            <p>Payments are processed by Stripe, Inc. By subscribing you authorise us to charge your payment method on a recurring monthly basis. All amounts are non-refundable except as required by applicable law or as stated in Section 5.</p>

            <h3>Invoices</h3>
            <p>VAT-compliant invoices are issued automatically after each successful payment and are available in your Billing dashboard.</p>

            <h3>Failed payments</h3>
            <p>If a payment fails, your account status moves to <em>past due</em>. Access may be restricted until payment is resolved. After 14 days of failed payments we may cancel your subscription.</p>
          </section>

          <section>
            <h2>5. Cancellation and refunds</h2>
            <p>You may cancel your subscription at any time from your Billing page. Cancellation takes effect at the end of the current billing period; you retain full access until then.</p>
            <p>We do not offer pro-rata refunds for partial months. If we terminate your account without cause, we will refund the unused portion of the current billing period.</p>
          </section>

          <section>
            <h2>6. Acceptable use</h2>
            <p>You may not use the Service to:</p>
            <ul>
              <li>Upload or distribute illegal, defamatory, obscene, or infringing content.</li>
              <li>Distribute malware, phishing pages, or deceptive content.</li>
              <li>Reverse-engineer, decompile, or attempt to extract source code.</li>
              <li>Resell or sublicense the Service without written permission.</li>
              <li>Circumvent usage limits or access controls.</li>
              <li>Use the Service in a manner that could damage, disable, or impair our infrastructure.</li>
              <li>Violate any applicable law or regulation.</li>
            </ul>
            <p>We reserve the right to suspend or terminate accounts that violate these rules without refund.</p>
          </section>

          <section>
            <h2>7. Your content</h2>
            <p>You retain all rights to 3D models, images, and other content you upload ("Customer Content"). You grant us a limited, non-exclusive licence to store, process, and serve that content solely to provide the Service.</p>
            <p>You warrant that you have all necessary rights to upload and use Customer Content and that it does not infringe any third-party intellectual property rights.</p>
            <p>We do not claim ownership of Customer Content. Upon account deletion, Customer Content is permanently removed within 90 days.</p>
          </section>

          <section>
            <h2>8. Our intellectual property</h2>
            <p>The GLB Configurator platform, including its software, design, and documentation, is owned by Nordic Render OÜ and protected by copyright and other intellectual property laws. Nothing in these Terms grants you any rights to our intellectual property beyond the limited licence to use the Service.</p>
          </section>

          <section>
            <h2>9. Embed limits</h2>
            <p>Your plan includes a set number of simultaneously active embed configurations. Exceeding your plan limit may result in embeds being deactivated. Upgrading your plan re-activates embeds immediately.</p>
          </section>

          <section>
            <h2>10. Availability and SLA</h2>
            <p>We aim for 99.5% monthly uptime, excluding scheduled maintenance. We do not guarantee uninterrupted or error-free service. We are not liable for downtime caused by third-party providers (Firebase, Stripe, CDN) or events outside our reasonable control.</p>
          </section>

          <section>
            <h2>11. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, Nordic Render OÜ's total liability for any claim arising under these Terms shall not exceed the amount paid by you in the 12 months preceding the claim.</p>
            <p>We are not liable for indirect, incidental, consequential, or special damages including loss of revenue, loss of data, or loss of business, even if advised of the possibility of such damages.</p>
          </section>

          <section>
            <h2>12. Indemnification</h2>
            <p>You agree to indemnify and hold harmless Nordic Render OÜ and its officers, directors, and employees from any claims, damages, or expenses (including legal fees) arising from your use of the Service, your Customer Content, or your breach of these Terms.</p>
          </section>

          <section>
            <h2>13. Governing law and disputes</h2>
            <p>These Terms are governed by the laws of the <strong>Republic of Estonia</strong>. Any dispute shall first be attempted to be resolved by good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to the exclusive jurisdiction of <strong>Harju County Court</strong> (Harju Maakohus), Tallinn, Estonia.</p>
            <p>If you are a consumer in the EU, you may also use the EU Online Dispute Resolution platform at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.</p>
          </section>

          <section>
            <h2>14. Changes to Terms</h2>
            <p>We may update these Terms. We will notify you by email at least 14 days before material changes take effect. Continued use of the Service after the effective date constitutes acceptance. If you disagree, you may cancel before the effective date.</p>
          </section>

          <section>
            <h2>15. Contact</h2>
            <p><strong>Nordic Render OÜ</strong><br />
            A. H. Tammsaare tee 47, 11316 Tallinn, Estonia<br />
            <a href="mailto:support@nordicrender.com">support@nordicrender.com</a></p>
          </section>

        </div>
      </div>
      <LegalFooter />
    </div>
  )
}
