import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase/config.js'

const chatWithClaude = httpsCallable(functions, 'chatWithClaude')
const getAiUsage     = httpsCallable(functions, 'getAiUsage')

const BYOK_STORAGE_KEY = 'anthropic-api-key'

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
  const [quota, setQuota]     = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [byokKey, setByokKey] = useState(() => {
    try { return localStorage.getItem(BYOK_STORAGE_KEY) ?? '' } catch { return '' }
  })
  const listRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!open) return
    getAiUsage().then(({ data }) => setQuota(data)).catch(() => {})
  }, [open])

  function saveByok(value) {
    setByokKey(value)
    try {
      if (value) localStorage.setItem(BYOK_STORAGE_KEY, value)
      else       localStorage.removeItem(BYOK_STORAGE_KEY)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, busy])

  // Build the history exactly the way Anthropic requires: after each
  // assistant tool_use we must emit a user tool_result before the next
  // real user turn. `pendingToolResults` is populated by the prior response
  // handler; here we just splice them onto the correct user message.
  function buildHistoryForSend(newUserContent, pendingToolResults) {
    const out = []
    for (const m of messages) {
      if (m.role === 'user') {
        out.push({ role: 'user', content: m.apiContent ?? [{ type: 'text', text: m.text ?? '' }] })
      } else if (m.role === 'assistant') {
        out.push({ role: 'assistant', content: m.apiContent ?? [{ type: 'text', text: m.text ?? '' }] })
      }
    }
    // The final message will be the new user turn. If the previous assistant
    // turn contained tool_use blocks, we prepend matching tool_result blocks.
    const nextUserContent = [
      ...(pendingToolResults ?? []),
      ...newUserContent,
    ]
    return { history: out, nextUserContent }
  }

  async function send(overrideText) {
    if (busy) return
    // Guard against being wired directly to onClick={send} — the browser passes
    // a SyntheticEvent whose `.trim()` blows up. Only accept strings.
    const text = typeof overrideText === 'string' ? overrideText : input
    if (!text.trim() && !image) return
    setError('')

    // Collect any pending tool_result blocks left over from the previous
    // assistant turn. These MUST be sent as the first blocks of the next
    // user message per Anthropic's tool_use protocol.
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    const pendingToolResults = lastAssistant?.pendingToolResults ?? []

    const newUserBlocks = []
    if (image?.data && image?.mediaType) {
      newUserBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: image.mediaType, data: image.data },
      })
    }
    if (text.trim()) newUserBlocks.push({ type: 'text', text })

    const userTurn = {
      id: uid(),
      role: 'user',
      text,
      imagePreview: image?.preview ?? null,
      // Record what we actually send so subsequent replays match.
      apiContent: [...pendingToolResults, ...newUserBlocks],
    }
    setMessages((m) => {
      // Clear pendingToolResults from the assistant turn we just consumed.
      const updated = m.map((x) =>
        x.id === lastAssistant?.id
          ? { ...x, pendingToolResults: [] }
          : x)
      return [...updated, userTurn]
    })
    const sendImage = image
    setInput('')
    setImage(null)
    setBusy(true)

    try {
      const { history, nextUserContent } = buildHistoryForSend(newUserBlocks, pendingToolResults)
      const payload = {
        history,
        userMessage: text,
        config,
        // New shape: server may prefer explicit user content blocks. Kept
        // userMessage for backward compat with the existing function code.
        userContent: nextUserContent,
      }
      if (sendImage) {
        payload.image = { data: sendImage.base64, mediaType: sendImage.mediaType }
      }
      if (byokKey) {
        payload.userApiKey = byokKey
      }
      const { data } = await chatWithClaude(payload)
      const content = data.content ?? []
      if (data.quota) setQuota((q) => ({ ...q, used: data.quota.used, limit: data.quota.limit }))

      const textBlocks = content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
      const toolBlocks = content.filter((b) => b.type === 'tool_use')

      // Apply tools + capture matching tool_result blocks. These will be
      // attached to the assistant message and consumed by the next send().
      const applied = []
      const nextResults = []
      for (const tb of toolBlocks) {
        let resultText
        try {
          onApplyTool(tb.name, tb.input)
          applied.push(tb.name)
          resultText = 'ok'
        } catch (e) {
          applied.push(`${tb.name} (failed: ${e.message})`)
          resultText = `error: ${e.message}`
        }
        nextResults.push({ type: 'tool_result', tool_use_id: tb.id, content: resultText })
      }

      setMessages((m) => [...m, {
        id: uid(),
        role: 'assistant',
        text: textBlocks || (applied.length ? '' : '(no response)'),
        applied,
        apiContent: content,
        pendingToolResults: nextResults,
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
        <div className="claude-chat-header-actions">
          {byokKey
            ? <span className="claude-chat-badge claude-chat-badge--byok" title="Using your own API key">BYOK</span>
            : quota?.limit != null && (
              <span className={`claude-chat-badge${quota.used >= quota.limit ? ' claude-chat-badge--over' : ''}`}>
                {quota.used} / {quota.limit}
              </span>
            )}
          <button
            className="claude-chat-key-btn"
            onClick={() => setShowSettings((v) => !v)}
            title="Use your own Anthropic API key">
            🔑 {byokKey ? 'Key set' : 'Set key'}
          </button>
          <button className="claude-chat-close" onClick={() => setOpen(false)} title="Close">✕</button>
        </div>
      </div>

      {showSettings && (
        <div className="claude-chat-settings">
          <div className="claude-chat-settings-row">
            <label className="claude-chat-settings-label">Your Anthropic API key (optional — bypasses shared quota)</label>
            <input
              type="password"
              className="claude-chat-settings-input"
              placeholder="sk-ant-…"
              value={byokKey}
              onChange={(e) => saveByok(e.target.value)}
              autoFocus />
            <p className="claude-chat-settings-hint">
              Saved in this browser only. Leave empty to use the shared platform key.
              Get your own at{' '}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a>.
              {byokKey && (
                <> · <button className="btn-link" onClick={() => saveByok('')}>Clear key</button></>
              )}
            </p>
          </div>
        </div>
      )}

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
