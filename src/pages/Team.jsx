import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { createTeamInvite, getTeamMembers, revokeTeamInvite } from '../firebase/db.js'
import { CmsSidebar } from '../components/CmsSidebar.jsx'

function genCode() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
}

export default function Team() {
  const { user, profile } = useAuth()
  const [invites, setInvites]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [email, setEmail]         = useState('')
  const [inviting, setInviting]   = useState(false)
  const [newLink, setNewLink]     = useState(null)
  const [copied, setCopied]       = useState(false)

  useEffect(() => {
    if (!user) return
    getTeamMembers(user.uid).then((list) => { setInvites(list); setLoading(false) })
  }, [user])

  async function handleInvite(e) {
    e.preventDefault()
    if (!email.trim()) return
    setInviting(true)
    setNewLink(null)
    const code = genCode()
    await createTeamInvite(user.uid, profile?.email ?? user.email ?? '', email.trim(), code)
    const link = `${window.location.origin}/join/${code}`
    setNewLink(link)
    setInvites((prev) => [
      ...prev,
      { ownerUid: user.uid, inviteeEmail: email.trim(), code, status: 'pending', memberUid: null },
    ])
    setEmail('')
    setInviting(false)
  }

  async function handleRevoke(invite) {
    if (!confirm(`Revoke access for ${invite.inviteeEmail}?`)) return
    await revokeTeamInvite(invite.code)
    setInvites((prev) => prev.filter((i) => i.code !== invite.code))
  }

  function copyLink(code) {
    const link = `${window.location.origin}/join/${code}`
    navigator.clipboard.writeText(link)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const members = invites.filter((i) => i.status === 'accepted')
  const pending = invites.filter((i) => i.status === 'pending')

  return (
    <div className="cms-layout team-page">
      <CmsSidebar active="team" />
      <main className="cms-content team-main">
        <h1 className="team-title">Team</h1>
        <p className="team-sub">
          Invite teammates to edit your configurators. Members get full edit access to all your configurators.
        </p>

        {/* Invite form */}
        <section className="team-section">
          <h2 className="team-section-title">Invite a member</h2>
          <form className="team-invite-form" onSubmit={handleInvite}>
            <input
              className="field-input team-email-input"
              type="email"
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="btn-primary" type="submit" disabled={inviting}>
              {inviting ? 'Generating…' : 'Generate invite link'}
            </button>
          </form>
          {newLink && (
            <div className="team-invite-link-box">
              <code className="team-invite-link">{newLink}</code>
              <button className="btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(newLink); setCopied('new'); setTimeout(() => setCopied(null), 2000) }}>
                {copied === 'new' ? '✓ Copied' : 'Copy'}
              </button>
              <p className="team-invite-hint">Send this link to your teammate. They'll need to sign in or create an account to accept.</p>
            </div>
          )}
        </section>

        {/* Active members */}
        <section className="team-section">
          <h2 className="team-section-title">Active members ({loading ? '…' : members.length})</h2>
          {!loading && members.length === 0 ? (
            <p className="team-empty">No active members yet. Invite someone above.</p>
          ) : (
            <div className="team-list">
              {members.map((inv) => (
                <div key={inv.code} className="team-member-row">
                  <div className="team-member-info">
                    <span className="team-member-email">{inv.inviteeEmail}</span>
                    <span className="team-member-badge team-badge--active">Active</span>
                  </div>
                  <button className="btn-ghost btn-sm" onClick={() => handleRevoke(inv)}>Revoke</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending invites */}
        {pending.length > 0 && (
          <section className="team-section">
            <h2 className="team-section-title">Pending invites ({pending.length})</h2>
            <div className="team-list">
              {pending.map((inv) => (
                <div key={inv.code} className="team-member-row">
                  <div className="team-member-info">
                    <span className="team-member-email">{inv.inviteeEmail}</span>
                    <span className="team-member-badge team-badge--pending">Pending</span>
                  </div>
                  <div className="team-member-actions">
                    <button className="btn-ghost btn-sm" onClick={() => copyLink(inv.code)}>
                      {copied === inv.code ? '✓ Copied' : 'Copy link'}
                    </button>
                    <button className="btn-ghost btn-sm" onClick={() => handleRevoke(inv)}>Cancel</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
