import { useState, useRef, useEffect } from 'react'
import { listUserFiles, uploadFile } from '../firebase/storage.js'
import { mediaType } from '../pages/Media.jsx'

function fmtSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function matchesAccept(file, accept) {
  if (!accept || accept === '*') return true
  return accept.split(',').map((a) => a.trim()).some((a) => {
    if (a === 'image/*') return file.contentType?.startsWith('image/')
    if (a === '.glb')   return file.contentType?.includes('gltf') || file.name?.toLowerCase().endsWith('.glb')
    return true
  })
}

/**
 * MediaPickerModal — browse & select previously uploaded files, or upload a new one.
 *
 * Props:
 *   uid      — Firebase user uid
 *   accept   — same as <input accept>, e.g. "image/*" or ".glb"
 *   onSelect — called with { url, storagePath, name } when a file is chosen
 *   onClose  — called when the modal is dismissed
 */
export function MediaPickerModal({ uid, accept, onSelect, onClose }) {
  const [files, setFiles]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [uploadError, setUploadError] = useState('')
  const inputRef = useRef()

  useEffect(() => {
    listUserFiles(uid).then((list) => { setFiles(list); setLoading(false) })
  }, [uid])

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleUpload(fileList) {
    const file = fileList[0]
    if (!file) return
    setUploading(true); setUploadError('')
    try {
      const result = await uploadFile(uid, file, (p) => setProgress(p))
      onSelect({ url: result.url, storagePath: result.storagePath, name: file.name })
    } catch (err) {
      setUploadError(err.code === 'storage/unauthorized'
        ? 'Upload failed: Storage rules not deployed.'
        : `Upload failed: ${err.message}`)
      setUploading(false)
    }
  }

  const displayed = files
    .filter((f) => matchesAccept(f, accept))
    .filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()))

  const typeLabel = accept === '.glb' ? '3D Models' : accept?.startsWith('image') ? 'Images' : 'Files'

  return (
    <div className="mpicker-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="mpicker">
        {/* Header */}
        <div className="mpicker-header">
          <div className="mpicker-header-left">
            <h3 className="mpicker-title">Choose file</h3>
            {accept && <span className="mpicker-type-hint">{typeLabel}</span>}
          </div>
          <button className="mpicker-close" onClick={onClose}>✕</button>
        </div>

        {/* Toolbar */}
        <div className="mpicker-toolbar">
          <div className="mpicker-search-wrap">
            <input className="mpicker-search" placeholder="Search…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button className="mpicker-search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>
          <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }}
            onChange={(e) => { handleUpload(e.target.files); inputRef.current.value = '' }} />
          <button className="btn-primary mpicker-upload-btn"
            disabled={uploading} onClick={() => inputRef.current.click()}>
            {uploading ? `Uploading… ${progress}%` : '↑ Upload new'}
          </button>
        </div>

        {uploadError && <div className="mpicker-error">{uploadError}</div>}

        {/* Upload progress bar */}
        {uploading && (
          <div className="mpicker-progress">
            <div style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Grid */}
        <div className="mpicker-body">
          {loading ? (
            <div className="mpicker-empty">Loading…</div>
          ) : displayed.length === 0 ? (
            <div className="mpicker-empty">
              {files.length === 0
                ? 'No files uploaded yet. Click "Upload new" to add one.'
                : `No ${typeLabel.toLowerCase()} found. Upload one above.`
              }
            </div>
          ) : (
            <div className="mpicker-grid">
              {displayed.map((file) => {
                const type = mediaType(file.contentType, file.name)
                return (
                  <button key={file.storagePath} className="mpicker-card"
                    onClick={() => onSelect({ url: file.url, storagePath: file.storagePath, name: file.name })}>
                    <div className="mpicker-card-thumb">
                      {type === 'image'
                        ? <img src={file.url} alt={file.name} loading="lazy" />
                        : type === 'model'
                          ? <div className="mpicker-card-badge glb">GLB</div>
                          : <div className="mpicker-card-badge file">FILE</div>
                      }
                    </div>
                    <div className="mpicker-card-info">
                      <span className="mpicker-card-name" title={file.name}>{file.name}</span>
                      <span className="mpicker-card-size">{fmtSize(file.size)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
