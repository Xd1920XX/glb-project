import { useRef, useState, useEffect } from 'react'
import { MODELS, FRAME_COUNT } from '../config/sauna.js'

const SENSITIVITY = 18 // px per frame step
const MIN_SCALE = 1
const MAX_SCALE = 4

// Module-level cache so Image objects are never GC'd
const preloadCache = new Map()

function preloadFolder(folder, count, suffix = '') {
  if (preloadCache.has(folder)) return preloadCache.get(folder)
  const imgs = []
  for (let i = 1; i <= count; i++) {
    const img = new Image()
    img.src = `${folder}/${i}${suffix}.jpg`
    imgs.push(img)
  }
  preloadCache.set(folder, imgs)
  return imgs
}

// Eagerly preload all folders for all models at startup
Object.values(MODELS).forEach((model) => {
  model.colors.forEach((c) => { if (c.folder) preloadFolder(c.folder, FRAME_COUNT, c.fileSuffix || '') })
})

export function ImageSpinner({ folder, fileSuffix = '', frameCount, frameIndex, onFrameChange }) {
  const [dragging, setDragging] = useState(false)
  const [ready, setReady]       = useState(false)
  const [scale, setScale]       = useState(1)

  const prevX            = useRef(0)
  const acc              = useRef(0)
  const frameRef         = useRef(frameIndex)
  frameRef.current       = frameIndex
  const scaleRef         = useRef(1)
  const activePointers   = useRef(new Map())
  const prevPinchDist    = useRef(null)
  const containerRef     = useRef(null)

  // Preload + track readiness whenever folder changes
  useEffect(() => {
    setReady(false)
    const imgs = preloadFolder(folder, frameCount, fileSuffix)

    let done = 0
    const total = imgs.length

    function tick() {
      done++
      if (done >= total) setReady(true)
    }

    imgs.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) {
        done++
      } else {
        img.addEventListener('load',  tick, { once: true })
        img.addEventListener('error', tick, { once: true })
      }
    })

    if (done >= total) setReady(true)

    return () => imgs.forEach((img) => {
      img.removeEventListener('load',  tick)
      img.removeEventListener('error', tick)
    })
  }, [folder, frameCount, fileSuffix])

  // Reset zoom when folder changes
  useEffect(() => { scaleRef.current = 1; setScale(1) }, [folder])

  // Wheel zoom — must be non-passive to call preventDefault
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function onWheel(e) {
      e.preventDefault()
      const delta = e.deltaY * -0.001
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRef.current * (1 + delta)))
      scaleRef.current = next
      setScale(next)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function pinchDist() {
    const pts = [...activePointers.current.values()]
    if (pts.length < 2) return null
    const dx = pts[0].x - pts[1].x
    const dy = pts[0].y - pts[1].y
    return Math.sqrt(dx * dx + dy * dy)
  }

  function handlePointerDown(e) {
    if (!ready) return
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    e.currentTarget.setPointerCapture(e.pointerId)
    if (activePointers.current.size === 1) {
      setDragging(true)
      prevX.current = e.clientX
      acc.current = 0
    } else {
      prevPinchDist.current = pinchDist()
      setDragging(false)
    }
  }

  function handlePointerMove(e) {
    if (!ready || activePointers.current.size === 0) return
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointers.current.size >= 2) {
      const dist = pinchDist()
      if (prevPinchDist.current !== null && dist !== null) {
        const ratio = dist / prevPinchDist.current
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRef.current * ratio))
        scaleRef.current = next
        setScale(next)
      }
      prevPinchDist.current = dist
      return
    }

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

  function handlePointerUp(e) {
    activePointers.current.delete(e.pointerId)
    prevPinchDist.current = null
    if (activePointers.current.size === 0) setDragging(false)
  }

  const src = `${folder}/${frameIndex + 1}${fileSuffix}.jpg`

  return (
    <div
      ref={containerRef}
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
        style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
      />
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
          color: '#fff', gap: 14, zIndex: 10,
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: '#fff',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: 13, opacity: 0.85, letterSpacing: '0.02em' }}>Loading images…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}
      {ready && <div className="spinner-hint">Drag to rotate · Scroll to zoom</div>}
    </div>
  )
}
