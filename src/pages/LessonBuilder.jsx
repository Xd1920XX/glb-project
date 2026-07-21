import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { getLesson, saveLesson, getUserRuleTables } from '../firebase/db.js'

// LessonBuilder — teacher-side editor for a lesson. Configures parameter locks,
// grading criteria, module palette, and class code.
// TODO: 3D module palette + drag-to-place workflow; publish flow with generated
// class code; attempt review panel.

export default function LessonBuilder() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [lesson, setLesson] = useState(null)
  const [ruleTables, setRuleTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getLesson(id),
      getUserRuleTables(user.uid),
    ]).then(([l, rt]) => {
      setLesson(l)
      setRuleTables(rt)
      setLoading(false)
    })
  }, [id, user])

  async function handleSave() {
    setSaving(true)
    await saveLesson(id, {
      name: lesson.name,
      description: lesson.description,
      parameterLocks: lesson.parameterLocks,
      gradingCriteria: lesson.gradingCriteria,
      ruleTableId: lesson.ruleTableId,
      modules: lesson.modules,
    })
    setSaving(false)
  }

  if (loading) return <div className="page-loading">Laadimine…</div>
  if (!lesson) return <div className="page-loading">Ülesannet ei leitud.</div>

  return (
    <div className="lesson-builder">
      <header className="builder-topbar">
        <Link to="/dashboard" className="btn-ghost">← Tagasi</Link>
        <input
          className="builder-name"
          value={lesson.name}
          onChange={(e) => setLesson({ ...lesson, name: e.target.value })}
        />
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvestamine…' : 'Salvesta'}
        </button>
      </header>

      <div className="builder-body">
        <aside className="builder-sidebar">
          <section>
            <h3>Kirjeldus</h3>
            <textarea
              value={lesson.description ?? ''}
              onChange={(e) => setLesson({ ...lesson, description: e.target.value })}
              placeholder="Õpilastele nähtav ülesande kirjeldus"
            />
          </section>

          <section>
            <h3>Reeglitabel</h3>
            <select
              value={lesson.ruleTableId ?? ''}
              onChange={(e) => setLesson({ ...lesson, ruleTableId: e.target.value || null })}
            >
              <option value="">— vali —</option>
              {ruleTables.map((rt) => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
          </section>

          <section>
            <h3>Parameetri lukud</h3>
            <p className="hint">TODO: lisa parameetri lukud siia</p>
          </section>

          <section>
            <h3>Hindamiskriteeriumid</h3>
            <p className="hint">TODO: lisa hindamiskriteeriumid siia</p>
          </section>
        </aside>

        <main className="builder-canvas">
          <p className="hint">3D moodulipalett + paigutus tuleb siia.</p>
        </main>
      </div>
    </div>
  )
}
