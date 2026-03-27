import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { api } from '../api/client.js'
import { FRAMES, LIDS } from '../config/models.js'

const STATUS_LABELS = { new: 'New', processing: 'Processing', completed: 'Completed', cancelled: 'Cancelled' }
const STATUS_COLORS = { new: '#e8a844', processing: '#4a7fa5', completed: '#4a8c38', cancelled: '#888' }

export default function OrdersPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getOrders()
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleStatusChange(id, status) {
    await api.updateOrderStatus(id, status)
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="dash-page">
      <header className="dash-header">
        <span className="dash-logo">Container Configurator</span>
        <div className="dash-header-right">
          <span className="dash-user">{user?.name}</span>
          <Link to="/dashboard" className="dash-link">Configurators</Link>
          <button className="dash-logout" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Orders</h2>
        </div>

        {loading ? (
          <p className="dash-empty">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="dash-empty">No orders yet.</p>
        ) : (
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Configurator</th>
                  <th>Customer</th>
                  <th>Configuration</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }}>
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td>{o.configurator_name}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{o.customer_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.customer_email}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {o.frame_id} · {LIDS.find((l) => l.id === o.lid_id)?.label ?? o.lid_id}
                      {o.show_panels ? ' · Panels' : ''}
                    </td>
                    <td style={{ fontWeight: 600 }}>€{o.price}</td>
                    <td>
                      <select
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: 12, width: 'auto', color: STATUS_COLORS[o.status] }}
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      >
                        {Object.entries(STATUS_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
