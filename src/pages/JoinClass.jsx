import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLessonByClassCode } from '../firebase/db.js'

export default function JoinClass() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const lesson = await getLessonByClassCode(code.trim().toUpperCase())
    if (!lesson) return setError('Klassikoodi ei leitud või ülesanne pole avaldatud.')
    navigate(`/attempt/${lesson.id}`)
  }

  return (
    <div className="join-class">
      <h1>Liitu klassiga</h1>
      <form onSubmit={handleSubmit}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Sisesta klassikood"
          autoFocus
        />
        <button type="submit" className="btn-primary">Alusta</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
