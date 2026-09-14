import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { createTeamInvite, getTeamMembers, revokeTeamInvite, getUserConfigurators } from '../firebase/db.js'
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
  // Scope: "all" = full-team access, "some" = per-configurator selection
  const [scope, setScope]         = useState('all')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [configs, setConfigs]     = useState([])

  useEffect(() => {
    if (!user) return
    getTeamMembers(user.uid).then((list) => { setInvites(list); setLoading(false) })
    getUserConfigurators(user.uid).then((list) => {
      // Only offer configs owned by this user — team-shared ones can't be re-shared.
      setConfigs(list.filter((c) => !c._isTeamOwned))
    })
  }, [user])

  function toggleConfig(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!email.trim()) return
    if (scope === 'some' && selectedIds.size === 0) return
    setInviting(true)
    setNewLink(null)
    const code = genCode()
    const ids = scope === 'some' ? Array.from(selectedIds) : null
    await createTeamInvite(user.uid, profile?.email ?? user.email ?? '', email.trim(), code, ids)
    const link = `${window.location.origin}/join/${code}`
    setNewLink(link)
    setInvites((prev) => [
      ...prev,
      { ownerUid: user.uid, inviteeEmail: email.trim(), code, status: 'pending', memberUid: null, configuratorIds: ids },
    ])
    setEmail('')
    setSelectedIds(new Set())
    setScope('all')
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
            <button
              className="btn-primary"
              type="submit"
              disabled={inviting || (scope === 'some' && selectedIds.size === 0)}
            >
              {inviting ? 'Generating…' : 'Generate invite link'}
            </button>
          </form>

          <div className="team-scope">
            <label className="team-scope-option">
              <input
                type="radio"
                name="team-scope"
                value="all"
                checked={scope === 'all'}
                onChange={() => setScope('all')}
              />
              <span>Full team access — every configurator, including future ones</span>
            </label>
            <label className="team-scope-option">
              <input
                type="radio"
                name="team-scope"
                value="some"
                checked={scope === 'some'}
                onChange={() => setScope('some')}
              />
              <span>Only specific configurators</span>
            </label>
            {scope === 'some' && (
              <div className="team-config-list">
                {configs.length === 0 ? (
                  <p className="team-empty">No configurators to share yet.</p>
                ) : configs.map((c) => (
                  <label key={c.id} className="team-config-row">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleConfig(c.id)}
                    />
                    <span className="team-config-name">{c.name || 'Untitled configurator'}</span>
                    <span className="team-config-id">{c.id}</span>
                  </label>
                ))}
                {configs.length > 0 && (
                  <p className="team-invite-hint" style={{ marginTop: 8 }}>
                    {selectedIds.size === 0
                      ? 'Pick at least one configurator.'
                      : `${selectedIds.size} configurator${selectedIds.size === 1 ? '' : 's'} selected`}
                  </p>
                )}
              </div>
            )}
          </div>

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
                    <ScopeBadge invite={inv} configs={configs} />
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
                    <ScopeBadge invite={inv} configs={configs} />
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

function ScopeBadge({ invite, configs }) {
  const ids = Array.isArray(invite.configuratorIds) && invite.configuratorIds.length
    ? invite.configuratorIds
    : (invite.configuratorId ? [invite.configuratorId] : null)
  if (!ids) return <span className="team-scope-badge team-scope-badge--full">All configurators</span>
  const names = ids.map((id) => configs.find((c) => c.id === id)?.name).filter(Boolean)
  const label = names.length ? names.join(', ') : `${ids.length} configurator${ids.length === 1 ? '' : 's'}`
  return <span className="team-scope-badge" title={label}>{label}</span>
}
