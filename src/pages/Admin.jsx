import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { getAllUsers, updateUser, deleteUser } from '../firebase/db.js'
import { CmsSidebar } from '../components/CmsSidebar.jsx'
import { PLANS } from '../config/plans.js'

const SUPER_ADMIN_UID = 'kMZlGUDl3lPFm2VIyc5eyYHhA752'

const STATUS_OPTIONS = ['trial', 'active', 'cancelled', 'past_due']
const STATUS_COLORS  = { trial: '#d97706', active: '#16a34a', cancelled: '#dc2626', past_due: '#dc2626' }

export default function Admin() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID
  const isAdmin      = isSuperAdmin || profile?.isAdmin

  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [editing,  setEditing]  = useState(null) // user being edited
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    if (user === undefined) return
    if (!isAdmin) { navigate('/dashboard'); return }
    // Ensure the super admin's Firestore doc has isAdmin: true
    if (isSuperAdmin && !profile?.isAdmin) {
      updateUser(SUPER_ADMIN_UID, { isAdmin: true }).catch(() => {})
    }
    load()
  }, [user, isAdmin])

  async function load() {
    setLoading(true)
    try {
      const list = await getAllUsers()
      setUsers(list)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    const { id, ...data } = editing
    const patch = {
      subscriptionStatus: data.subscriptionStatus,
      planId:             data.planId ?? null,
      isAdmin:            data.isAdmin ?? false,
      ...(data.name  !== undefined ? { name:  data.name  } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
    }
    await updateUser(id, patch)
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u))
    setSaving(false)
    setEditing(null)
  }

  async function handleDelete(uid) {
    if (!confirm('Permanently delete this account? This cannot be undone.')) return
    setDeleting(uid)
    await deleteUser(uid)
    setUsers((prev) => prev.filter((u) => u.id !== uid))
    setDeleting(null)
    if (editing?.id === uid) setEditing(null)
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return !q
      || u.email?.toLowerCase().includes(q)
      || u.name?.toLowerCase().includes(q)
      || u.id.includes(q)
  })

  if (user === undefined || loading) {
    return (
      <div className="cms-layout">
        <CmsSidebar active="admin" />
        <div className="cms-content admin-loading">Loading…</div>
      </div>
    )
  }

  return (
    <div className="cms-layout">
      <CmsSidebar active="admin" />
      <div className="cms-content admin-page">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">User Management</h1>
            <p className="admin-subtitle">{users.length} accounts</p>
          </div>
          <input
            className="field-input admin-search"
            placeholder="Search by name, email or UID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="admin-table">
          <div className="admin-table-head">
            <span>User</span>
            <span>Status</span>
            <span>Plan</span>
            <span>Role</span>
            <span></span>
          </div>

          {filtered.length === 0 && (
            <div className="admin-empty">No users found.</div>
          )}

          {filtered.map((u) => {
            const sub   = u.subscriptionStatus ?? 'trial'
            const plan  = PLANS.find((p) => p.id === u.planId)
            const color = STATUS_COLORS[sub] ?? '#888'
            const isSelf = u.id === user.uid

            return (
              <div key={u.id} className="admin-table-row">
                <div className="admin-user-cell">
                  <div className="admin-user-avatar">
                    {(u.name || u.email || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="admin-user-name">
                      {u.name || '—'}
                      {u.id === SUPER_ADMIN_UID && <span className="admin-role-badge super">Super admin</span>}
                      {u.isAdmin && u.id !== SUPER_ADMIN_UID && <span className="admin-role-badge admin">Admin</span>}
                      {isSelf && <span className="admin-role-badge you">You</span>}
                    </div>
                    <div className="admin-user-email">{u.email}</div>
                  </div>
                </div>

                <div>
                  <span className="admin-status-dot" style={{ background: color }} />
                  <span className="admin-status-label" style={{ color }}>
                    {sub.replace('_', ' ')}
                  </span>
                </div>

                <div className="admin-plan-cell">
                  {sub === 'active' && plan ? `${plan.label} · €${plan.price}/mo` : '—'}
                </div>

                <div className="admin-role-cell">
                  {u.isAdmin || u.id === SUPER_ADMIN_UID ? 'Admin' : 'User'}
                </div>

                <div className="admin-actions-cell">
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => setEditing({ ...u })}
                  >
                    Edit
                  </button>
                  {isSuperAdmin && !isSelf && (
                    <button
                      className="btn-ghost btn-sm admin-delete-btn"
                      onClick={() => handleDelete(u.id)}
                      disabled={deleting === u.id}
                    >
                      {deleting === u.id ? '…' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Edit modal */}
        {editing && (
          <div className="admin-modal-backdrop" onClick={() => setEditing(null)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div>
                  <div className="admin-modal-title">{editing.name || editing.email}</div>
                  <div className="admin-modal-uid">UID: {editing.id}</div>
                </div>
                <button className="admin-modal-close" onClick={() => setEditing(null)}>✕</button>
              </div>

              <div className="admin-modal-body">
                {/* Name */}
                <div className="field-row">
                  <label className="field-label">Display name</label>
                  <input
                    className="field-input"
                    value={editing.name ?? ''}
                    onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>

                {/* Email (display only) */}
                <div className="field-row">
                  <label className="field-label">Email</label>
                  <input className="field-input" value={editing.email ?? ''} disabled />
                </div>

                {/* Subscription status */}
                <div className="field-row">
                  <label className="field-label">Subscription status</label>
                  <select
                    className="field-input"
                    value={editing.subscriptionStatus ?? 'trial'}
                    onChange={(e) => setEditing((p) => ({ ...p, subscriptionStatus: e.target.value }))}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                {/* Plan */}
                <div className="field-row">
                  <label className="field-label">Plan</label>
                  <select
                    className="field-input"
                    value={editing.planId ?? ''}
                    onChange={(e) => setEditing((p) => ({ ...p, planId: e.target.value || null }))}
                  >
                    <option value="">— None —</option>
                    {PLANS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label} — €{p.price}/mo</option>
                    ))}
                  </select>
                </div>

                {/* Admin toggle — super admin only, can't demote self */}
                {isSuperAdmin && editing.id !== SUPER_ADMIN_UID && (
                  <div className="admin-toggle-row">
                    <div>
                      <div className="admin-toggle-label">Admin access</div>
                      <div className="admin-toggle-desc">Can manage other users</div>
                    </div>
                    <button
                      className={`admin-toggle-btn${editing.isAdmin ? ' on' : ''}`}
                      onClick={() => setEditing((p) => ({ ...p, isAdmin: !p.isAdmin }))}
                    >
                      {editing.isAdmin ? 'On' : 'Off'}
                    </button>
                  </div>
                )}
              </div>

              <div className="admin-modal-footer">
                {isSuperAdmin && editing.id !== user.uid && (
                  <button
                    className="btn-ghost btn-sm admin-delete-btn"
                    onClick={() => handleDelete(editing.id)}
                    disabled={deleting === editing.id}
                  >
                    Delete account
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <button className="btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
