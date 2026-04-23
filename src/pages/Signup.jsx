import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { signUp, signInWithGoogle } from '../firebase/auth.js'
import { GoogleIcon } from '../components/GoogleIcon.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Signup() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (user) return <Navigate to="/dashboard" replace />
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

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
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError('')
    setLoading(true)
    try {
      await signUp(name, email, password)
      navigate('/dashboard')
    } catch (err) {
      console.error('Signup error:', err.code, err.message)
      if (err.code === 'auth/email-already-in-use') {
        setError('That email is already registered.')
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email sign-up is not enabled. Go to Firebase Console → Authentication → Sign-in method.')
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.')
      } else {
        setError(err.code || err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-split">
      <div className="auth-split-left">
        <Link to="/" className="auth-split-logo">Configurator</Link>
        <div className="auth-split-pitch">
          <h2>Start building in minutes</h2>
          <ul className="auth-split-features">
            <li>3-day free trial, no credit card needed</li>
            <li>Upload models, set up variants, go live</li>
            <li>Embed on any site — plans from €60/month</li>
          </ul>
        </div>
      </div>

      <div className="auth-split-right">
        <div className="auth-form-wrap">
          <h1 className="auth-heading">Create account</h1>
          <p className="auth-sub">3-day free trial · plans from €60/month</p>

          {error && <div className="auth-error">{error}</div>}

          <button className="btn-google btn-block" onClick={handleGoogle} disabled={loading}>
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="auth-divider"><span>or</span></div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field-row">
              <label className="field-label">Name</label>
              <input className="field-input" type="text" required autoFocus
                placeholder="Your name"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field-row">
              <label className="field-label">Email</label>
              <input className="field-input" type="email" required
                placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field-row">
              <label className="field-label">Password</label>
              <input className="field-input" type="password" required minLength={6}
                placeholder="Min. 6 characters"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn-primary btn-block btn-form" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

