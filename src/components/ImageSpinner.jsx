import { useRef, useState, useEffect } from 'react'
import { COLORS } from '../config/sauna.js'

const SENSITIVITY = 25 // px of drag per frame step
const FALLBACK_FOLDER = COLORS[0].folder // natural is always the fallback

export function ImageSpinner({ folder, frameCount, frameIndex, onFrameChange }) {
  const [dragging, setDragging] = useState(false)
  const [useFallback, setUseFallback] = useState(false)
  const startX = useRef(0)

  useEffect(() => { setUseFallback(false) }, [folder])
  const startFrame = useRef(0)

  function handlePointerDown(e) {
    setDragging(true)
    startX.current = e.clientX
    startFrame.current = frameIndex
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!dragging) return
    const delta = e.clientX - startX.current
    const steps = Math.round(delta / SENSITIVITY)
    const next = ((startFrame.current - steps) % frameCount + frameCount) % frameCount
    onFrameChange(next)
  }

  function handlePointerUp() {
    setDragging(false)
  }

  const activeFolder = useFallback ? FALLBACK_FOLDER : folder
  const src = `${activeFolder}/${frameIndex + 1}.jpg`

  return (
    <div
      className={`image-spinner${dragging ? ' dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        onError={() => { if (!useFallback) setUseFallback(true) }}
      />
      <div className="spinner-hint">Drag to rotate</div>
    </div>
  )
}
