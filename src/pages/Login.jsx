import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { signIn, signInWithGoogle } from '../firebase/auth.js'
import { GoogleIcon } from '../components/GoogleIcon.jsx'
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
        setError(`Google sign-in failed: ${err.code}`)
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
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-split">
      <div className="auth-split-left">
        <Link to="/" className="auth-split-logo">GLB Configurator</Link>
        <div className="auth-split-pitch">
          <h2>Build configurators your customers will love</h2>
          <ul className="auth-split-features">
            <li>Upload 3D models, rotation images &amp; panoramas</li>
            <li>Visual builder — no coding required</li>
            <li>Embed on any website with one line of HTML</li>
          </ul>
        </div>
      </div>

      <div className="auth-split-right">
        <div className="auth-form-wrap">
          <h1 className="auth-heading">Sign in</h1>
          <p className="auth-sub">Welcome back</p>

          {error && <div className="auth-error">{error}</div>}

          <button className="btn-google btn-block" onClick={handleGoogle} disabled={loading}>
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="auth-divider"><span>or</span></div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field-row">
              <label className="field-label">Email</label>
              <input className="field-input" type="email" required autoFocus
                placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field-row">
              <label className="field-label">Password</label>
              <input className="field-input" type="password" required
                placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn-primary btn-block btn-form" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="auth-switch">
            No account? <Link to="/signup">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

