import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { isTrialExpired } from '../config/plans.js'

export function ProtectedRoute({ children }) {
  const { user, profile } = useAuth()
  const { pathname } = useLocation()

  if (user === undefined) return <div className="page-loading">Loading…</div>
  if (!user) return <Navigate to="/login" replace />

  // Expired trial users can only access /billing to subscribe
  if (pathname !== '/billing' && isTrialExpired(profile)) {
    return <Navigate to="/billing" replace />
  }

  return children
}
