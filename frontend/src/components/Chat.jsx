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
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[99999] inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/90 text-white shadow-xl shadow-indigo-500/40 ring-1 ring-indigo-300/60 backdrop-blur-md transition-transform duration-300 hover:scale-105 hover:bg-indigo-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/60"
        aria-label="Open chat"
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

      {/* Chat window */}
      {open && (
        <div className="fixed inset-0 z-[99998] flex items-end justify-end bg-transparent sm:items-center sm:justify-end">
          {/* Backdrop click to close on mobile */}
          <button
            type="button"
            className="absolute inset-0 block cursor-default bg-black/20 sm:bg-transparent"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />

          <div className="chat-window relative bottom-20 right-4 flex w-[94vw] max-w-sm origin-bottom-right scale-100 flex-col rounded-3xl border border-slate-800/80 bg-[#0B0E14]/95 text-slate-50 shadow-[0_24px_80px_rgba(0,0,0,0.95)] backdrop-blur-md transition-all duration-300 max-h-[500px] sm:bottom-24">
            {/* Header */}
            <div className="chat-window-header flex items-center justify-between rounded-t-3xl bg-[#111827] px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Workineh&apos;s Portfolio
                </div>
                {hasName ? (
                  <div className="mt-0.5 text-xs text-slate-300">Welcome, {name.trim()}</div>
                ) : (
                  <div className="mt-0.5 text-xs text-slate-400">Ask anything about my work.</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/70 text-slate-200 shadow-sm transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/70"
                aria-label="Close chat"
              >
                <span className="text-base leading-none">&times;</span>
              </button>
            </div>

            {/* Name field (only if not set) */}
            {!hasName && (
              <div className="chat-name-panel border-b border-slate-800/80 bg-[#0B0E14] px-4 py-2.5 text-xs sm:px-5">
                <label className="block text-[11px] font-medium text-slate-400">Your name (optional)</label>
                <input
                  value={name}
                  maxLength={100}
                  onChange={(e) => {
                    setName(e.target.value)
                    saveVisitorName(e.target.value)
                  }}
                  className="mt-1 w-full rounded-2xl border border-slate-700/70 bg-[#111827] px-3 py-1.5 text-xs text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-indigo-400/80 focus:ring-2 focus:ring-indigo-500/25"
                  placeholder="e.g. Workineh"
                />
              </div>
            )}

            {/* Messages */}
            <div className="chat-messages flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.18)_0,_transparent_55%)] px-3 py-3 sm:px-4 sm:py-4">
              <div className="flex min-h-full flex-col justify-end">
                {chatError && (
                  <p className="mb-3 rounded-xl border border-rose-400/30 bg-rose-950/40 p-2 text-xs text-rose-200" role="alert">
                    {chatError}
                  </p>
                )}
                {messages.length === 0 ? (
                  <div className="chat-empty mt-4 rounded-2xl border border-slate-800/80 bg-[#111827]/80 p-3 text-xs text-slate-400">
                    No messages yet. Say hi, and I&apos;ll respond as soon as I can.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {messages.map((m) => {
                    const fromVisitor = m.sender === 'visitor'
                    const bubbleBase =
                      'max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-sm transition-all duration-300'
                    const bubbleClasses = fromVisitor
                      ? 'bg-slate-200 text-slate-900 rounded-tr-none ml-auto'
                      : 'bg-indigo-600 text-white rounded-tl-none mr-auto'
                    return (
                      <div key={m.key} className={`flex ${fromVisitor ? 'justify-end' : 'justify-start'}`}>
                        <div className="flex max-w-full flex-col">
                          <div className={`${bubbleBase} ${bubbleClasses}`}>
                            <div className="whitespace-pre-wrap break-words">{m.text}</div>
                          </div>
                          <div
                            className={`mt-0.5 text-[10px] ${
                              fromVisitor ? 'text-slate-500 text-right' : 'text-slate-300 text-left opacity-80'
                            }`}
                          >
                            {formatTime(m.timestamp)}
                          </div>
                        </div>
                      </div>
                    )
                    })}
                    <div ref={listEndRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Input */}
            <div className="chat-input-area border-t border-slate-800/80 bg-[#0B0E14]/95 px-3 py-2.5 backdrop-blur-md sm:px-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    value={text}
                    maxLength={5000}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sendMessage()
                    }}
                    className="w-full rounded-full bg-[#111827] px-3.5 py-2 pr-9 text-xs text-slate-50 shadow-sm shadow-black/40 outline-none ring-0 placeholder:text-slate-500 focus:bg-[#111827] focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="Type a message…"
                  />
                  <button
                    type="button"
                    disabled={sending || !text.trim()}
                    onClick={sendMessage}
                    className="absolute inset-y-0 right-1.5 my-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-white shadow-sm shadow-indigo-500/40 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
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
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

