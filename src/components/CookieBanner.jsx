import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const KEY        = 'cookie_consent'
const EXPIRY_MS  = 365 * 24 * 60 * 60 * 1000  // 12 months — GDPR re-consent interval

function loadConsent() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function saveConsent(prefs) {
  localStorage.setItem(KEY, JSON.stringify({ ...prefs, expiresAt: Date.now() + EXPIRY_MS }))
}

export function CookieBanner() {
  const [visible,      setVisible]      = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [analytics,    setAnalytics]    = useState(true)

  useEffect(() => {
    if (!loadConsent()) setVisible(true)
  }, [])

  function acceptAll() {
    saveConsent({ analytics: true })
    setVisible(false)
  }

  function saveSettings() {
    saveConsent({ analytics })
    setVisible(false)
  }

  function declineAll() {
    saveConsent({ analytics: false })
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      {!showSettings ? (
        <>
          <div className="cookie-banner-text">
            <strong>We use cookies</strong>
            <p>
              We use strictly necessary cookies to keep you logged in, and optional analytics cookies to improve the platform.
              See our <Link to="/cookies" onClick={() => setVisible(false)}>Cookie Policy</Link>.
            </p>
          </div>
          <div className="cookie-banner-actions">
            <button className="cookie-btn cookie-btn-ghost" onClick={() => setShowSettings(true)}>Manage</button>
            <button className="cookie-btn cookie-btn-ghost" onClick={declineAll}>Decline</button>
            <button className="cookie-btn cookie-btn-primary" onClick={acceptAll}>Accept all</button>
          </div>
        </>
      ) : (
        <>
          <div className="cookie-banner-text">
            <strong>Cookie settings</strong>
            <div className="cookie-toggles">
              <label className="cookie-toggle-row">
                <div>
                  <div className="cookie-toggle-name">Strictly necessary</div>
                  <div className="cookie-toggle-desc">Authentication and preference storage. Cannot be disabled.</div>
                </div>
                <input type="checkbox" checked disabled />
              </label>
              <label className="cookie-toggle-row">
                <div>
                  <div className="cookie-toggle-name">Analytics</div>
                  <div className="cookie-toggle-desc">Anonymised usage data via Google Analytics to improve the platform.</div>
                </div>
                <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
              </label>
            </div>
          </div>
          <div className="cookie-banner-actions">
            <button className="cookie-btn cookie-btn-ghost" onClick={() => setShowSettings(false)}>Back</button>
            <button className="cookie-btn cookie-btn-primary" onClick={saveSettings}>Save settings</button>
          </div>
        </>
      )}
    </div>
  )
}
