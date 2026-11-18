import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../api.js'

function getStoredValue(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function storeValue(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Chat remains usable for the current page when browser storage is unavailable.
  }
}

function getOrCreateSessionId() {
  const key = 'portfolio_chat_session_id'
  const existing = getStoredValue(key)
  if (existing) return existing

  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`
  storeValue(key, id)
  return id
}

function getOrCreateVisitorName() {
  const key = 'portfolio_chat_name'
  const existing = getStoredValue(key)
  if (existing) return existing
  return ''
}

function saveVisitorName(name) {
  storeValue('portfolio_chat_name', name)
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Chat() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(getOrCreateVisitorName)
  const [text, setText] = useState('')
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState('')

  const [sessionId] = useState(getOrCreateSessionId)
  const listEndRef = useRef(null)
  const launcherRef = useRef(null)
  const messageInputRef = useRef(null)

  useEffect(() => {
    let active = true
    const messagesPath = `/chat/${encodeURIComponent(sessionId)}/messages`
    const loadMessages = async () => {
      try {
        const { messages: nextMessages } = await apiRequest(messagesPath)
        if (active) {
          setMessages(nextMessages)
          setChatError('')
        }
      } catch (error) {
        if (active) {
          setChatError(error instanceof Error ? error.message : 'Could not load chat messages.')
        }
      }
    }

    void loadMessages()
    const eventSource = new EventSource(
      `/api/chat/${encodeURIComponent(sessionId)}/events`,
    )
    eventSource.addEventListener('ready', () => void loadMessages())
    eventSource.addEventListener('chat-message', (event) => {
      const message = JSON.parse(event.data)
      setMessages((current) =>
        current.some((item) => item.key === message.key)
          ? current
          : [...current, message].sort((a, b) => a.timestamp - b.timestamp),
      )
      setChatError('')
    })
    eventSource.onopen = () => setChatError('')
    eventSource.onerror = () => {
      if (active) setChatError('Chat connection interrupted. Reconnecting…')
    }

    return () => {
      active = false
      eventSource.close()
    }
  }, [sessionId])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      apiRequest(`/chat/${encodeURIComponent(sessionId)}/profile`, {
        method: 'PUT',
        body: JSON.stringify({ name: name?.trim() || null }),
      }).catch((error) => {
        setChatError(error instanceof Error ? error.message : 'Could not save your name.')
      })
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [name, sessionId])

  useEffect(() => {
    if (!open) return
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => {
    if (!open) return
    const launcher = launcherRef.current
    messageInputRef.current?.focus()
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      launcher?.focus()
    }
  }, [open])

  const sendMessage = async () => {
    const trimmed = text.trim()
    if (!trimmed) return

    setSending(true)
    try {
      const { message } = await apiRequest(
        `/chat/${encodeURIComponent(sessionId)}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ name: name?.trim() || null, text: trimmed }),
        },
      )
      setMessages((current) =>
        current.some((item) => item.key === message.key)
          ? current
          : [...current, message].sort((a, b) => a.timestamp - b.timestamp),
      )
      setText('')
      setChatError('')
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Could not send your message.')
    } finally {
      setSending(false)
    }
  }

  const hasName = !!name?.trim()

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`chat-launcher${open ? ' is-open' : ''}`}
        aria-label={open ? 'Close chat' : 'Open chat'}
        aria-expanded={open}
        aria-controls="portfolio-chat-dialog"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9 8.38 8.38 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8.5Z" />
          <path d="M8 10h.01" />
          <path d="M12 10h.01" />
          <path d="M16 10h.01" />
        </svg>
      </button>

      {open && (
        <div className="chat-overlay">
          <button
            type="button"
            className="chat-backdrop"
            aria-label="Close chat window"
            onClick={() => setOpen(false)}
          />

          <section
            id="portfolio-chat-dialog"
            className="chat-window"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-title"
            aria-describedby="chat-description"
          >
            <header className="chat-window-header">
              <span className="chat-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                  <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
                </svg>
              </span>
              <div className="chat-heading">
                <h2 id="chat-title">Workineh&apos;s Portfolio</h2>
                <p id="chat-description">
                  <span className="chat-status-dot" aria-hidden="true" />
                  {hasName ? `Hi ${name.trim()}, ask me about my work.` : 'Ask me about my work and projects.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="chat-close"
                aria-label="Close chat"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m18 6-12 12M6 6l12 12" />
                </svg>
              </button>
            </header>

            {!hasName && (
              <div className="chat-name-panel">
                <label htmlFor="chat-visitor-name">Your name <span>(optional)</span></label>
                <input
                  id="chat-visitor-name"
                  value={name}
                  maxLength={100}
                  onChange={(event) => {
                    setName(event.target.value)
                    saveVisitorName(event.target.value)
                  }}
                  placeholder="How should I address you?"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="chat-messages" role="log" aria-live="polite" aria-relevant="additions text">
              {chatError && <p className="chat-error" role="alert">{chatError}</p>}
              {messages.length === 0 ? (
                <div className="chat-empty">
                  <span className="chat-empty-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9 8.4 8.4 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8.5Z" />
                    </svg>
                  </span>
                  <strong>Start a conversation</strong>
                  <p>Send a message about my projects, skills, or experience.</p>
                </div>
              ) : (
                <div className="chat-message-list">
                  {messages.map((message) => {
                    const fromVisitor = message.sender === 'visitor'
                    return (
                      <div
                        key={message.key}
                        className={`chat-message-row${fromVisitor ? ' from-visitor' : ''}`}
                      >
                        <div className="chat-message-content">
                          <span className="chat-sender">{fromVisitor ? 'You' : 'Workineh'}</span>
                          <div className="chat-message-bubble">
                            <p>{message.text}</p>
                          </div>
                          <time className="chat-message-time">
                            {formatTime(message.timestamp)}
                          </time>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={listEndRef} />
                </div>
              )}
            </div>

            <form
              className="chat-input-area"
              onSubmit={(event) => {
                event.preventDefault()
                void sendMessage()
              }}
            >
              <label className="chat-input-label" htmlFor="chat-message-input">
                Message
              </label>
              <div className="chat-composer">
                  <input
                    ref={messageInputRef}
                    id="chat-message-input"
                    value={text}
                    maxLength={5000}
                    onChange={(event) => setText(event.target.value)}
                    className="chat-message-input"
                    placeholder="Write your message…"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className="chat-send-button"
                    aria-label="Send message"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M22 2 11 13" />
                      <path d="M22 2 15 22 11 13 2 9 22 2z" />
                    </svg>
                  </button>
              </div>
              <p className="chat-composer-hint">
                {sending ? 'Sending your message…' : 'Press Enter to send'}
              </p>
            </form>
          </section>
        </div>
      )}
    </>
  )
}

