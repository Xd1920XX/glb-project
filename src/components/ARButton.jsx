import { useState } from 'react'
import { buildUsdzBlob } from '../utils/glbToUsdz.js'

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isAndroid() {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

function supportsARQuickLook() {
  const a = document.createElement('a')
  return !!(a.relList && a.relList.supports && a.relList.supports('ar'))
}

/**
 * "View in AR" button. iOS uses AR Quick Look (USDZ built on-demand from
 * the current GLB layers + material overrides). Android uses Scene Viewer
 * with the first GLB layer URL.
 *
 * LiDAR is engaged automatically by iOS AR Quick Look on supported devices
 * (iPad/iPhone Pro). No additional API call is required.
 */
export function ARButton({ glbLayers, label = 'View in AR' }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState(null)

  const ios = isIOS()
  const android = isAndroid()
  if (!ios && !android) return null
  if (!glbLayers?.length) return null
  if (ios && !supportsARQuickLook()) return null

  async function handleClick() {
    setErr(null)
    if (ios) {
      setBusy(true)
      try {
        const blob = await buildUsdzBlob(glbLayers)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.rel = 'ar'
        a.href = url
        const img = document.createElement('img')
        img.style.display = 'none'
        a.appendChild(img)
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      } catch (e) {
        console.error('AR build failed', e)
        setErr('AR unavailable')
      } finally {
        setBusy(false)
      }
      return
    }
    // Android: Scene Viewer with first layer GLB URL.
    // Multi-layer / material overrides are not applied on Android.
    const primary = glbLayers.find((l) => l.url)
    if (!primary) return
    const fileUrl = encodeURIComponent(primary.url)
    const fallback = encodeURIComponent(window.location.href)
    const intent =
      `intent://arvr.google.com/scene-viewer/1.0?file=${fileUrl}&mode=ar_preferred` +
      `#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;` +
      `S.browser_fallback_url=${fallback};end;`
    window.location.href = intent
  }

  return (
    <button
      className="view-ar-btn"
      onClick={handleClick}
      disabled={busy}
      title="View in your space using LiDAR / ARCore"
    >
      {busy ? 'Preparing…' : (err || label)}
    </button>
  )
}
