import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { getTeamInviteByCode, acceptTeamInvite } from '../firebase/db.js'

export default function JoinTeam() {
  const { code } = useParams()
  const { user } = useAuth()
  const [invite, setInvite]     = useState(undefined) // undefined=loading, null=not found
  const [accepting, setAccepting] = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    getTeamInviteByCode(code).then(setInvite)
  }, [code])

  async function handleAccept() {
    setAccepting(true)
    setError(null)
    try {
      await acceptTeamInvite(code, user.uid)
      setDone(true)
    } catch (err) {
      setError('Could not accept invite. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  if (invite === undefined) return <div className="page-loading">Loading…</div>

  if (!invite || invite.status === 'revoked' || invite.status === 'cancelled') {
    return (
      <div className="join-page">
        <div className="join-box">
          <div className="join-icon">✕</div>
          <h2>Invite not found</h2>
          <p>This invite link is invalid or has been cancelled by the team owner.</p>
          <Link to="/" className="btn-primary">Go home</Link>
        </div>
      </div>
    )
  }

  if (invite.status === 'accepted' || done) {
    return (
      <div className="join-page">
        <div className="join-box">
          <div className="join-icon join-icon--success">✓</div>
          <h2>You're in!</h2>
          <p>You now have access to <strong>{invite.ownerEmail}'s</strong> configurators.</p>
          <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="join-page">
      <div className="join-box">
        <div className="join-icon join-icon--invite">◎</div>
        <h2>Team invite</h2>
        <p>
          <strong>{invite.ownerEmail}</strong> has invited you to collaborate on their GLB Configurator projects.
        </p>
        {error && <p className="join-error">{error}</p>}
        {user ? (
          <>
            <p className="join-hint">Signed in as <strong>{user.email}</strong></p>
            <button className="btn-primary join-accept-btn" onClick={handleAccept} disabled={accepting}>
              {accepting ? 'Accepting…' : 'Accept invite'}
            </button>
          </>
        ) : (
          <>
            <p className="join-hint">Sign in or create an account to accept this invite.</p>
            <Link to={`/login?redirect=/join/${code}`} className="btn-primary join-accept-btn">Sign in</Link>
            <Link to={`/signup?redirect=/join/${code}`} className="btn-ghost" style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', color: 'var(--text)', textDecoration: 'none', fontSize: 14 }}>
              Create account
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
