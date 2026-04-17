import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { listUserFiles, uploadFile, deleteFile } from '../firebase/storage.js'
import { CmsSidebar } from '../components/CmsSidebar.jsx'

function fmtSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function mediaType(contentType = '', name = '') {
  if (contentType.startsWith('image/')) return 'image'
  if (contentType.includes('gltf') || name.toLowerCase().endsWith('.glb')) return 'model'
  return 'other'
}

export default function Media() {
  const { user } = useAuth()

  const [files, setFiles]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [uploads, setUploads]   = useState([])
  const [selected, setSelected] = useState(new Set())
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [sortBy, setSortBy]     = useState('date')
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied]     = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef    = useRef()
  const dragCounter = useRef(0)

  useEffect(() => {
    if (!user) return
    listUserFiles(user.uid).then((list) => { setFiles(list); setLoading(false) })
  }, [user])

  async function optimizeImage(file) {
    // Only optimize images, and only if larger than 1.5MB
    if (!file.type.startsWith('image/') || file.size < 1.5 * 1024 * 1024) return file
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const MAX = 2048
        let { width, height } = img
        if (width <= MAX && height <= MAX) { resolve(file); return }
        const scale = MAX / Math.max(width, height)
        width  = Math.round(width  * scale)
        height = Math.round(height * scale)
        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() })),
          'image/jpeg', 0.88
        )
      }
      img.src = url
    })
  }

  async function handleFiles(fileList) {
    const toUpload = [...fileList]
    const batch = toUpload.map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name, progress: 0, error: '',
    }))
    setUploads((u) => [...u, ...batch])

    for (let i = 0; i < toUpload.length; i++) {
      const file = await optimizeImage(toUpload[i])
      const uploadId = batch[i].id
      try {
        const result = await uploadFile(user.uid, file, (p) =>
          setUploads((u) => u.map((x) => x.id === uploadId ? { ...x, progress: p } : x))
        )
        const entry = {
          storagePath: result.storagePath,
          name: file.name,
          url: result.url,
          size: file.size,
          contentType: file.type || '',
          createdAt: new Date().toISOString(),
        }
        setFiles((prev) => [entry, ...prev])
        setUploads((u) => u.filter((x) => x.id !== uploadId))
      } catch {
        setUploads((u) => u.map((x) => x.id === uploadId ? { ...x, error: 'Upload failed' } : x))
        setTimeout(() => setUploads((u) => u.filter((x) => x.id !== uploadId)), 3000)
      }
    }
  }

  async function handleDelete(file, e) {
    e?.stopPropagation()
    if (!confirm(`Delete "${file.name}"?`)) return
    await deleteFile(file.storagePath)
    setFiles((f) => f.filter((x) => x.storagePath !== file.storagePath))
    setSelected((s) => { const n = new Set(s); n.delete(file.storagePath); return n })
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} file${selected.size > 1 ? 's' : ''}?`)) return
    setDeleting(true)
    for (const path of selected) {
      await deleteFile(path)
    }
    setFiles((f) => f.filter((x) => !selected.has(x.storagePath)))
    setSelected(new Set())
    setDeleting(false)
  }

  function toggleSelect(path, e) {
    e.stopPropagation()
    setSelected((s) => { const n = new Set(s); n.has(path) ? n.delete(path) : n.add(path); return n })
  }

  function copyUrl(url, path, e) {
    e.stopPropagation()
    navigator.clipboard.writeText(url)
    setCopied(path)
    setTimeout(() => setCopied(null), 2000)
  }

  function onDragEnter(e) { e.preventDefault(); dragCounter.current++; setDragging(true) }
  function onDragLeave(e) { e.preventDefault(); if (--dragCounter.current === 0) setDragging(false) }
  function onDrop(e) {
    e.preventDefault(); dragCounter.current = 0; setDragging(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  const displayed = files
    .filter((f) => filter === 'all' || mediaType(f.contentType, f.name) === filter)
    .filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'size') return (b.size ?? 0) - (a.size ?? 0)
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })

  const allSelected = displayed.length > 0 && displayed.every((f) => selected.has(f.storagePath))

  return (
    <div className="cms-layout media-page"
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <CmsSidebar active="media" />
      <main className="cms-content media-main">
        {/* Toolbar */}
        <div className="media-toolbar">
          <div className="media-toolbar-left">
            <h1 className="media-title">Media</h1>
            <div className="media-filter-tabs">
              {[['all', 'All'], ['image', 'Images'], ['model', '3D Models']].map(([val, label]) => (
                <button key={val}
                  className={`media-filter-tab${filter === val ? ' active' : ''}`}
                  onClick={() => setFilter(val)}>
                  {label}
                  <span className="media-filter-count">
                    {val === 'all' ? files.length : files.filter((f) => mediaType(f.contentType, f.name) === val).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="media-toolbar-right">
            <div className="media-search-wrap">
              <input className="media-search" placeholder="Search files…"
                value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && <button className="media-search-clear" onClick={() => setSearch('')}>✕</button>}
            </div>
            <select className="vs-select media-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date">Newest first</option>
              <option value="name">Name A–Z</option>
              <option value="size">Largest first</option>
            </select>
            <input ref={inputRef} type="file" multiple style={{ display: 'none' }}
              onChange={(e) => { handleFiles(e.target.files); inputRef.current.value = '' }} />
            <button className="btn-primary media-upload-btn" onClick={() => inputRef.current.click()}>
              ↑ Upload
            </button>
          </div>
        </div>

        {/* Active uploads */}
        {uploads.length > 0 && (
          <div className="media-uploads-bar">
            <span className="media-uploads-label">Uploading {uploads.length} file{uploads.length > 1 ? 's' : ''}…</span>
            {uploads.map((u) => (
              <div key={u.id} className="media-upload-item">
                <span className="media-upload-name">{u.name}</span>
                {u.error
                  ? <span className="media-upload-error">{u.error}</span>
                  : <><div className="media-upload-track"><div style={{ width: `${u.progress}%` }} /></div>
                      <span className="media-upload-pct">{u.progress}%</span></>
                }
              </div>
            ))}
          </div>
        )}

        {/* Selection bar */}
        {selected.size > 0 && (
          <div className="media-selection-bar">
            <span className="media-sel-count">{selected.size} selected</span>
            <button className="btn-ghost btn-sm" onClick={() =>
              setSelected(allSelected ? new Set() : new Set(displayed.map((f) => f.storagePath)))}>
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            <button className="btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
            <button className="btn-ghost btn-sm" onClick={() => {
              const urls = [...selected].map((path) => {
                const f = files.find((x) => x.storagePath === path)
                return f?.url ?? ''
              }).filter(Boolean).join('\n')
              navigator.clipboard.writeText(urls)
            }}>Copy URLs</button>
            <button className="media-bulk-delete-btn" onClick={handleBulkDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : `Delete ${selected.size} file${selected.size > 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="media-empty"><span>Loading…</span></div>
        ) : displayed.length === 0 ? (
          <div className="media-empty">
            {files.length === 0 ? (
              <>
                <div className="media-empty-icon">⬆</div>
                <p>No files yet.</p>
                <p className="media-empty-sub">Drag &amp; drop here, or click Upload.</p>
                <button className="btn-primary" onClick={() => inputRef.current.click()}>Upload files</button>
              </>
            ) : <p>No files match your search or filter.</p>}
          </div>
        ) : (
          <div className="media-grid">
            {displayed.map((file) => {
              const type  = mediaType(file.contentType, file.name)
              const isSel = selected.has(file.storagePath)
              return (
                <div key={file.storagePath}
                  className={`media-card${isSel ? ' selected' : ''}`}
                  onClick={(e) => toggleSelect(file.storagePath, e)}>
                  <div className="media-card-thumb">
                    {type === 'image'
                      ? <img src={file.url} alt={file.name} loading="lazy" />
                      : type === 'model'
                        ? <div className="media-card-type-badge glb">GLB</div>
                        : <div className="media-card-type-badge file">FILE</div>
                    }
                    <div className="media-card-overlay">
                      <label className="media-card-check-wrap" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isSel}
                          onChange={(e) => toggleSelect(file.storagePath, e)} />
                        <span className="media-card-check-box" />
                      </label>
                      <div className="media-card-actions">
                        <button className="media-action-btn"
                          title={copied === file.storagePath ? 'Copied!' : 'Copy URL'}
                          onClick={(e) => copyUrl(file.url, file.storagePath, e)}>
                          {copied === file.storagePath ? '✓' : '⧉'}
                        </button>
                        <button className="media-action-btn danger" title="Delete"
                          onClick={(e) => handleDelete(file, e)}>✕</button>
                      </div>
                    </div>
                  </div>
                  <div className="media-card-info">
                    <span className="media-card-name" title={file.name}>{file.name}</span>
                    <span className="media-card-meta">
                      {fmtSize(file.size)}{file.size && file.createdAt ? ' · ' : ''}{fmtDate(file.createdAt)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {dragging && (
        <div className="media-drop-overlay">
          <div className="media-drop-box">
            <div className="media-drop-arrow">↑</div>
            <p>Drop to upload</p>
          </div>
        </div>
      )}
    </div>
  )
}
