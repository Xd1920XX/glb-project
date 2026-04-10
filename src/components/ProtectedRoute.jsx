import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (user === undefined) return <div className="page-loading">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}
