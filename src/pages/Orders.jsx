import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { getUserOrders } from '../firebase/db.js'
import { CmsSidebar } from '../components/CmsSidebar.jsx'

function fmtDate(val) {
  if (!val) return ''
  const d = val?.toDate ? val.toDate() : new Date(val)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Orders() {
  const { user } = useAuth()
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [filter, setFilter]     = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (!user) return
    getUserOrders(user.uid)
      .then((list) => { setOrders(list); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [user])

  const configurators = [...new Set(orders.map((o) => o.configuratorName).filter(Boolean))]

  const displayed = filter
    ? orders.filter((o) => o.configuratorName === filter)
    : orders

  function exportCSV() {
    const allKeys = [...new Set(displayed.flatMap((o) => Object.keys(o.formData ?? {})))]
    const header = ['Date', 'Configurator', 'Variant', ...allKeys].join(',')
    const rows = displayed.map((o) => {
      const date = fmtDate(o.createdAt)
      const cfg  = o.configuratorName ?? ''
      const variant = o.variantId ?? ''
      const fields  = allKeys.map((k) => JSON.stringify(o.formData?.[k] ?? '')).join(',')
      return `"${date}","${cfg}","${variant}",${fields}`
    })
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'orders.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="cms-layout orders-page">
      <CmsSidebar active="orders" />
      <main className="cms-content orders-main">
        <div className="orders-toolbar">
          <div className="orders-toolbar-left">
            <h1 className="orders-title">Orders</h1>
            {configurators.length > 0 && (
              <select className="vs-select orders-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="">All configurators</option>
                {configurators.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
          {displayed.length > 0 && (
            <button className="btn-ghost btn-sm" onClick={exportCSV}>↓ Export CSV</button>
          )}
        </div>

        {loading ? (
          <div className="orders-empty">Loading…</div>
        ) : error ? (
          <div className="orders-empty" style={{ flexDirection: 'column', gap: 8 }}>
            <p style={{ color: 'var(--danger)' }}>Failed to load orders: {error}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              If this is a "requires an index" error, deploy Firestore indexes: <code>firebase deploy --only firestore:indexes</code>
            </p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="orders-empty">
            <p>{orders.length === 0 ? 'No orders yet. Enable the order form in your configurator.' : 'No orders match this filter.'}</p>
          </div>
        ) : (
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Configurator</th>
                  <th>Variant</th>
                  <th>Fields</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((order) => {
                  const fieldKeys = Object.keys(order.formData ?? {})
                  const isOpen = expanded === order.id
                  return (
                    <>
                      <tr key={order.id} className={`orders-row${isOpen ? ' open' : ''}`}>
                        <td className="orders-cell-date">{fmtDate(order.createdAt)}</td>
                        <td className="orders-cell-cfg">{order.configuratorName || <em>—</em>}</td>
                        <td className="orders-cell-variant">{order.variantId || <em>—</em>}</td>
                        <td className="orders-cell-fields">
                          {fieldKeys.length > 0
                            ? <span className="orders-field-preview">
                                {Object.entries(order.formData).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                                {fieldKeys.length > 2 && ` +${fieldKeys.length - 2} more`}
                              </span>
                            : <em>—</em>
                          }
                        </td>
                        <td>
                          {fieldKeys.length > 0 && (
                            <button className="btn-ghost btn-sm" onClick={() => setExpanded(isOpen ? null : order.id)}>
                              {isOpen ? 'Hide' : 'View'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={order.id + '-detail'} className="orders-row-detail">
                          <td colSpan={5}>
                            <div className="orders-detail">
                              {Object.entries(order.formData ?? {}).map(([k, v]) => (
                                <div key={k} className="orders-detail-row">
                                  <span className="orders-detail-key">{k}</span>
                                  <span className="orders-detail-val">{v}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
