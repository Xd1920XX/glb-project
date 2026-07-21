import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import {
  getLesson, getRuleTable,
  createAttempt, getAttempt, saveAttempt, submitAttempt,
} from '../firebase/db.js'
import { evaluateAttempt, extractAttemptParams } from '../lib/ruleEngine.js'

// AttemptView — student-side solving view.
// TODO: 3D canvas with module palette + drag-to-stack; parameter panel with
// locks disabled; submit → evaluateAttempt against ruleTable → show pass/near/fail.

export default function AttemptView() {
  const { lessonId, attemptId } = useParams()
  const { user } = useAuth()
  const [lesson, setLesson] = useState(null)
  const [ruleTable, setRuleTable] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!user || !lessonId) return
    getLesson(lessonId).then(async (l) => {
      setLesson(l)
      if (l?.ruleTableId) setRuleTable(await getRuleTable(l.ruleTableId))
      let a
      if (attemptId) {
        a = await getAttempt(attemptId)
      } else {
        const newId = await createAttempt(user.uid, lessonId, { modules: [] })
        a = await getAttempt(newId)
      }
      setAttempt(a)
      setLoading(false)
    })
  }, [user, lessonId, attemptId])

  async function handleSubmit() {
    const params = extractAttemptParams(attempt)
    const r = evaluateAttempt(ruleTable?.rules ?? [], params)
    await submitAttempt(attempt.id, { score: r.score, ruleResults: r.results })
    setResult(r)
  }

  if (loading) return <div className="page-loading">Laadimine…</div>
  if (!lesson) return <div className="page-loading">Ülesannet ei leitud.</div>

  return (
    <div className="attempt-view">
      <header>
        <h1>{lesson.name}</h1>
        {lesson.description && <p className="lesson-desc">{lesson.description}</p>}
      </header>

      <main className="attempt-canvas">
        <p className="hint">3D lahendamisvaade tuleb siia.</p>
      </main>

      <footer className="attempt-actions">
        {!result ? (
          <button className="btn-primary" onClick={handleSubmit}>Esita lahendus</button>
        ) : (
          <div className="attempt-result">
            <h3>Tulemus: {result.score}%</h3>
            <ul>
              {Object.entries(result.results).map(([id, status]) => (
                <li key={id} className={`result-${status}`}>{id}: {status}</li>
              ))}
            </ul>
            <Link to="/dashboard">← Tagasi</Link>
          </div>
        )}
      </footer>
    </div>
  )
}
