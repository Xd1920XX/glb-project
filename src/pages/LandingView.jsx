import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getLandingPage } from '../firebase/db.js'
import { LandingRenderer } from '../components/LandingRenderer.jsx'

export default function LandingView() {
  const { id }        = useParams()
  const [page, setPage]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    getLandingPage(id).then((lp) => {
      if (!lp || !lp.published) { setNotFound(true); setLoading(false); return }
      setPage(lp)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="page-loading">Loading…</div>
  if (notFound) {
    return (
      <div className="page-loading" style={{ flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 32 }}>404</span>
        <span>This page does not exist or is not published.</span>
      </div>
    )
  }

  return <LandingRenderer page={page} />
}
