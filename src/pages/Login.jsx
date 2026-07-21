import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { signIn, signInWithGoogle } from '../firebase/auth.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Login() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
      navigate('/dashboard')
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(`Google sisselogimine ebaõnnestus: ${err.code}`)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch {
      setError('Vale e-post või parool.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <h1>Logi sisse</h1>
      {error && <div className="auth-error">{error}</div>}

      <button className="btn-google btn-block" onClick={handleGoogle} disabled={loading}>
        Jätka Google'iga
      </button>

      <form onSubmit={handleSubmit} className="auth-form">
        <input type="email" required placeholder="e-post" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" required placeholder="parool" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? 'Sisselogimine…' : 'Logi sisse'}
        </button>
      </form>

      <p className="auth-switch">
        Uus siin? <Link to="/signup">Loo konto</Link>
      </p>
    </div>
  )
}
