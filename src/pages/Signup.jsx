import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { signUp, signInWithGoogle } from '../firebase/auth.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Signup() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState('student')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle(role)
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
    if (password.length < 6) { setError('Parool peab olema vähemalt 6 tähemärki.'); return }
    setError('')
    setLoading(true)
    try {
      await signUp(name, email, password, role)
      navigate('/dashboard')
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('E-post juba registreeritud.')
      else setError(err.code || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <h1>Loo konto</h1>
      {error && <div className="auth-error">{error}</div>}

      <div className="role-toggle">
        <label>
          <input type="radio" checked={role === 'student'} onChange={() => setRole('student')} />
          Õpilane
        </label>
        <label>
          <input type="radio" checked={role === 'teacher'} onChange={() => setRole('teacher')} />
          Õpetaja
        </label>
      </div>

      <button className="btn-google btn-block" onClick={handleGoogle} disabled={loading}>
        Jätka Google'iga
      </button>

      <form onSubmit={handleSubmit} className="auth-form">
        <input required autoFocus placeholder="nimi" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="email" required placeholder="e-post" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" required minLength={6} placeholder="parool (min 6)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? 'Loomine…' : 'Loo konto'}
        </button>
      </form>

      <p className="auth-switch">
        Konto on juba? <Link to="/login">Logi sisse</Link>
      </p>
    </div>
  )
}
