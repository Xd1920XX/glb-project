import { useRef, useState, useEffect } from 'react'
import { COLORS } from '../config/sauna.js'

const SENSITIVITY = 18 // px per frame step
const FALLBACK_FOLDER = COLORS[0].folder

export function ImageSpinner({ folder, frameCount, frameIndex, onFrameChange }) {
  const [dragging, setDragging] = useState(false)
  const [useFallback, setUseFallback] = useState(false)

  const prevX = useRef(0)
  const acc = useRef(0)
  const frameRef = useRef(frameIndex)
  frameRef.current = frameIndex

  useEffect(() => { setUseFallback(false) }, [folder])

  function handlePointerDown(e) {
    setDragging(true)
    prevX.current = e.clientX
    acc.current = 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!dragging) return
    acc.current += e.clientX - prevX.current
    prevX.current = e.clientX
    const steps = Math.trunc(acc.current / SENSITIVITY)
    if (steps !== 0) {
      acc.current -= steps * SENSITIVITY
      const next = ((frameRef.current - steps) % frameCount + frameCount) % frameCount
      frameRef.current = next
      onFrameChange(next)
    }
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
