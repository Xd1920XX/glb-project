import { useState, useRef, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase/config.js'

const chatWithClaude = httpsCallable(functions, 'chatWithClaude')

function uid() { return Math.random().toString(36).slice(2) }

const PRESET_PROMPTS = [
  { label: '➕ Add variant',         text: 'Add a new variant called "Walnut" with a warm brown swatch (#7a4a2b) at €120' },
  { label: '🎨 Change theme',        text: 'Switch to the warm theme and enable dark mode' },
  { label: '🌅 Set background',      text: 'Set the viewer background to a soft light grey (#f4f4f2)' },
  { label: '🔄 Auto-rotate model',   text: 'Enable auto-rotate on the 3D viewer at a slow speed' },
  { label: '🎬 Animation controls',  text: 'Enable the animation controls overlay so users can play/pause' },
  { label: '📱 Enable AR',           text: 'Turn on AR / LiDAR for mobile users' },
  { label: '📝 Show order form',     text: 'Enable the order form tab so customers can submit inquiries' },
  { label: '❓ How do I use this?',  text: 'How does this builder work? Walk me through adding my first product configurator step by step.' },
]

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload  = () => resolve(r.result.split(',')[1])
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export function ClaudeChat({ config, onApplyTool }) {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput]     = useState('')
  const [image, setImage]     = useState(null)
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')
  const listRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, busy])

  function buildHistory() {
    return messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.apiContent ?? [{ type: 'text', text: m.text ?? '' }] }))
  }

  async function send(overrideText) {
    if (busy) return
    const text = overrideText ?? input
    if (!text.trim() && !image) return
    setError('')
    const userTurn = {
      id: uid(),
      role: 'user',
      text,
      imagePreview: image?.preview ?? null,
    }
    setMessages((m) => [...m, userTurn])
    const userMessage = text
    const sendImage = image
    setInput('')
    setImage(null)
    setBusy(true)

    try {
      const payload = {
        history: buildHistory(),
        userMessage,
        config,
      }
      if (sendImage) {
        payload.image = { data: sendImage.base64, mediaType: sendImage.mediaType }
      }
      const { data } = await chatWithClaude(payload)
      const content = data.content ?? []

      const textBlocks = content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
      const toolBlocks = content.filter((b) => b.type === 'tool_use')

      const applied = []
      for (const tb of toolBlocks) {
        try {
          onApplyTool(tb.name, tb.input)
          applied.push(tb.name)
        } catch (e) {
          applied.push(`${tb.name} (failed: ${e.message})`)
        }
      }

      setMessages((m) => [...m, {
        id: uid(),
        role: 'assistant',
        text: textBlocks || (applied.length ? '' : '(no response)'),
        applied,
        apiContent: content,
      }])
    } catch (e) {
      setError(e.message || 'Chat failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setError('Only image files supported for now')
      return
    }
    const base64 = await fileToBase64(f)
    setImage({ base64, mediaType: f.type, preview: URL.createObjectURL(f) })
    e.target.value = ''
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (!open) {
    return (
      <button className="claude-chat-fab" onClick={() => setOpen(true)} title="Chat with assistant">
        ✦ Ask AI
      </button>
    )
  }

  return (
    <div className="claude-chat-panel">
      <div className="claude-chat-header">
        <span className="claude-chat-title">✦ AI assistant</span>
        <button className="claude-chat-close" onClick={() => setOpen(false)} title="Close">✕</button>
      </div>

      <div className="claude-chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="claude-chat-empty">
            <p>Describe a change, upload a product photo, or pick a quick action:</p>
            <div className="claude-chat-presets">
              {PRESET_PROMPTS.map((p) => (
                <button key={p.label} className="claude-chat-preset"
                  disabled={busy}
                  onClick={() => send(p.text)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`claude-chat-msg claude-chat-msg--${m.role}`}>
            {m.imagePreview && <img src={m.imagePreview} className="claude-chat-msg-img" alt="" />}
            {m.text && <div className="claude-chat-msg-text">{m.text}</div>}
            {m.applied?.length > 0 && (
              <div className="claude-chat-msg-applied">Applied: {m.applied.join(', ')}</div>
            )}
          </div>
        ))}
        {busy && (
          <div className="claude-chat-msg claude-chat-msg--assistant">
            <div className="claude-chat-msg-text">…</div>
          </div>
        )}
      </div>

      {error && <div className="claude-chat-error">{error}</div>}

      {image && (
        <div className="claude-chat-image-preview">
          <img src={image.preview} alt="" />
          <button onClick={() => setImage(null)} title="Remove image">✕</button>
        </div>
      )}

      <div className="claude-chat-input-row">
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={handleFile} />
        <button className="claude-chat-icon-btn" title="Attach image"
          onClick={() => fileRef.current?.click()} disabled={busy}>
          📎
        </button>
        <textarea
          className="claude-chat-input"
          placeholder="Tell me what to change…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          disabled={busy}
        />
        <button className="claude-chat-send-btn" onClick={send}
          disabled={busy || (!input.trim() && !image)}>
          {busy ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
