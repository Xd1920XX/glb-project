import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.jsx'
import { getUserLessons, createLesson, deleteLesson } from '../firebase/db.js'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) return
    getUserLessons(user.uid).then((list) => {
      setLessons(list)
      setLoading(false)
    })
  }, [user])

  async function handleCreate() {
    setCreating(true)
    const id = await createLesson(user.uid, 'Uus ülesanne')
    navigate(`/lesson/${id}`)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Kustuta see ülesanne?')) return
    await deleteLesson(id)
    setLessons((l) => l.filter((x) => x.id !== id))
  }

  return (
    <div className="dashboard">
      <header className="dash-header">
        <h1>Minu ülesanded</h1>
        <button className="btn-primary" onClick={handleCreate} disabled={creating}>
          {creating ? 'Loomine…' : '+ Uus ülesanne'}
        </button>
      </header>

      {loading ? (
        <div className="dash-empty">Laadimine…</div>
      ) : lessons.length === 0 ? (
        <div className="dash-empty">
          <p>Ühtki ülesannet pole veel.</p>
          <button className="btn-primary" onClick={handleCreate}>Loo esimene</button>
        </div>
      ) : (
        <ul className="lesson-list">
          {lessons.map((l) => (
            <li key={l.id} className="lesson-card" onClick={() => navigate(`/lesson/${l.id}`)}>
              <div className="lesson-name">{l.name}</div>
              <div className="lesson-meta">
                {l.published ? `Avaldatud · kood ${l.classCode ?? '—'}` : 'Mustand'} ·
                {' '}{l.modules?.length ?? 0} moodulit
              </div>
              <button className="lesson-delete" onClick={(e) => handleDelete(l.id, e)}>✕</button>
            </li>
          ))}
        </ul>
      )}

      <div className="dash-links">
        <Link to="/join">Liitu klassikoodiga →</Link>
      </div>
    </div>
  )
}
