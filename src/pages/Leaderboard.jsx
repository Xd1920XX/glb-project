import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getLesson, getLessonAttempts } from '../firebase/db.js'

export default function Leaderboard() {
  const { lessonId } = useParams()
  const [lesson, setLesson] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getLesson(lessonId), getLessonAttempts(lessonId)]).then(([l, a]) => {
      setLesson(l)
      setAttempts(a)
      setLoading(false)
    })
  }, [lessonId])

  if (loading) return <div className="page-loading">Laadimine…</div>

  return (
    <div className="leaderboard">
      <header>
        <h1>Edetabel: {lesson?.name}</h1>
        <Link to="/dashboard">← Tagasi</Link>
      </header>
      {attempts.length === 0 ? (
        <p>Ühtki esitatud lahendust pole veel.</p>
      ) : (
        <ol className="leaderboard-list">
          {attempts.map((a, i) => (
            <li key={a.id}>
              <span className="rank">#{i + 1}</span>
              <span className="uid">{a.studentUid.slice(0, 6)}…</span>
              <span className="score">{a.score}%</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
