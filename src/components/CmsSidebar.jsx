import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { logOut } from '../firebase/auth.js'
import { useCmsTheme } from '../hooks/useCmsTheme.jsx'

export function CmsSidebar({ active }) {
  const { profile } = useAuth()
  const { dark, toggleDark } = useCmsTheme()
  const navigate = useNavigate()

  const sub = profile?.subscriptionStatus ?? 'trial'
  const statusColor = { trial: '#d97706', active: '#16a34a', cancelled: '#dc2626', past_due: '#dc2626' }
  const statusLabel = { trial: 'Trial', active: 'Active', cancelled: 'Cancelled', past_due: 'Past due' }
  const initials = (profile?.name || profile?.email || '?').slice(0, 2).toUpperCase()

  return (
    <aside className="cms-sidebar">
      {/* Logo */}
      <div className="cms-sidebar-logo">
        <Link to="/dashboard" className="cms-logo-text">Configurator</Link>
      </div>

      {/* Navigation */}
      <nav className="cms-sidebar-nav">
        <Link to="/dashboard" className={`cms-nav-link${active === 'configurators' ? ' active' : ''}`}>
          <svg className="cms-nav-icon" viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="1" width="6" height="6" rx="1.5" opacity=".9"/>
            <rect x="9" y="1" width="6" height="6" rx="1.5" opacity=".9"/>
            <rect x="1" y="9" width="6" height="6" rx="1.5" opacity=".9"/>
            <rect x="9" y="9" width="6" height="6" rx="1.5" opacity=".9"/>
          </svg>
          Configurators
        </Link>

        <Link to="/media" className={`cms-nav-link${active === 'media' ? ' active' : ''}`}>
          <svg className="cms-nav-icon" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="5.5" cy="5.5" r="1.3" fill="currentColor"/>
            <path d="M1.5 11.5l3.5-3.5 2.5 2.5 2-2 4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Media
        </Link>

        <Link to="/orders" className={`cms-nav-link${active === 'orders' ? ' active' : ''}`}>
          <svg className="cms-nav-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M5 5h5M5 8h5M5 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Orders
        </Link>

        <Link to="/billing" className={`cms-nav-link${active === 'billing' ? ' active' : ''}`}>
          <svg className="cms-nav-icon" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M4 10h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Billing
        </Link>
      </nav>

      {/* Footer */}
      <div className="cms-sidebar-footer">
        {/* Dark mode toggle */}
        <button className="cms-footer-btn" onClick={toggleDark}>
          {dark ? (
            <svg className="cms-nav-icon" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="currentColor"/>
              <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg className="cms-nav-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.5 10.8A6 6 0 015.2 2.5a6.5 6.5 0 108.3 8.3z"/>
            </svg>
          )}
          {dark ? 'Light mode' : 'Dark mode'}
        </button>

        {/* User info → links to billing */}
        <Link to="/billing" className="cms-sidebar-user">
          <span className="cms-user-avatar">{initials}</span>
          <span className="cms-user-info">
            <span className="cms-user-name">{profile?.name || profile?.email}</span>
            <span className="cms-user-plan" style={{ color: statusColor[sub] }}>
              {statusLabel[sub] ?? sub}
            </span>
          </span>
        </Link>

        {/* Sign out */}
        <button className="cms-footer-btn cms-footer-btn--danger"
          onClick={() => { logOut(); navigate('/') }}>
          <svg className="cms-nav-icon" viewBox="0 0 16 16" fill="none">
            <path d="M6 8H2m0 0l2-2M2 8l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8.5 5V3.5A1.5 1.5 0 0110 2h2.5A1.5 1.5 0 0114 3.5v9A1.5 1.5 0 0112.5 14H10a1.5 1.5 0 01-1.5-1.5V11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}
