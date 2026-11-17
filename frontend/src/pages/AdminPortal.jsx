import { useEffect, useMemo, useRef, useState } from 'react'
import { onValue, push, ref } from 'firebase/database'
import { db } from '../firebase'
import ThemeToggle from '../components/ThemeToggle.jsx'

const ADMIN_SESSION_KEY = 'portfolio_admin_authed'

function hasAdminSession() {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function setAdminSession() {
  try {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, '1')
  } catch {
    // Keep this admin session active for the current page when storage is unavailable.
  }
}

function clearAdminSession() {
  try {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY)
  } catch {
    // The session is cleared in memory even when browser storage is unavailable.
  }
}

function formatDateTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

function notifyVisitorMessage(sessionId, message) {
  // Placeholder hook for AfroMessage/SMS
  // eslint-disable-next-line no-console
  console.log('[sms-hook] New visitor message:', { sessionId, message })
}

export default function AdminPortal() {
  const [adminPassword, setAdminPassword] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authed, setAuthed] = useState(hasAdminSession)
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError] = useState('')

  const [sessions, setSessions] = useState([])
  const [sessionSearch, setSessionSearch] = useState('')
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const lastSeenBySessionRef = useRef(new Map())
  const messagesEndRef = useRef(null)

  const chatsRef = useMemo(() => ref(db, 'chats'), [])
  const adminPasswordRef = useMemo(() => ref(db, 'admin_config/password'), [])
  const filteredSessions = useMemo(() => {
    const search = sessionSearch.trim().toLowerCase()
    if (!search) return sessions
    return sessions.filter((session) =>
      [session.name, session.lastMessage, session.sessionId]
        .join(' ')
        .toLowerCase()
        .includes(search),
    )
  }, [sessions, sessionSearch])

  useEffect(() => {
    const unsub = onValue(adminPasswordRef, (snap) => {
      const val = snap.val()
      setAdminPassword(typeof val === 'string' ? val : null)
      setAuthReady(true)
    })
    return () => unsub()
  }, [adminPasswordRef])

  const logout = () => {
    clearAdminSession()
    setAuthed(false)
    setPasswordInput('')
    setLoginError('')
  }

  const attemptLogin = () => {
    const expected = (adminPassword || '').trim()
    const given = passwordInput.trim()
    if (!expected) {
      setLoginError('Admin password is not set in Firebase yet.')
      return
    }
    if (given !== expected) {
      setLoginError('Incorrect password.')
      return
    }
    setAdminSession()
    setAuthed(true)
    setLoginError('')
    setPasswordInput('')
  }

  useEffect(() => {
    if (!authed) return
    const unsub = onValue(chatsRef, (snap) => {
      const val = snap.val() || {}
      const next = Object.entries(val).map(([sessionId, chat]) => {
        const profile = chat?.profile || {}
        const msgObj = chat?.messages || {}
        const msgArr = Object.entries(msgObj).map(([key, m]) => ({ key, ...m }))
        msgArr.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
        const last = msgArr[msgArr.length - 1]

        const prevKey = lastSeenBySessionRef.current.get(sessionId)
        if (last?.key && prevKey && last.key !== prevKey && last.sender === 'visitor') {
          notifyVisitorMessage(sessionId, last)
        }
        if (last?.key) lastSeenBySessionRef.current.set(sessionId, last.key)

        return {
          sessionId,
          name: profile?.name || 'Guest Visitor',
          lastMessage: last?.text || '',
          lastTimestamp: last?.timestamp || 0,
        }
      })

      next.sort((a, b) => (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0))
      setSessions(next)

      if (!activeSessionId && next.length > 0) setActiveSessionId(next[0].sessionId)
    })

    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatsRef, authed])

  useEffect(() => {
    if (!authed) return
    if (!activeSessionId) {
      setMessages([])
      return
    }
    const sessionMessagesRef = ref(db, `chats/${activeSessionId}/messages`)
    const unsub = onValue(sessionMessagesRef, (snap) => {
      const val = snap.val() || {}
      const arr = Object.entries(val).map(([key, m]) => ({ key, ...m }))
      arr.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
      setMessages(arr)
    })
    return () => unsub()
  }, [activeSessionId, authed])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const sendReply = async () => {
    const trimmed = reply.trim()
    if (!trimmed || !activeSessionId) return
    setSending(true)
    setSendError('')
    try {
      const sessionMessagesRef = ref(db, `chats/${activeSessionId}/messages`)
      await push(sessionMessagesRef, {
        sender: 'admin',
        text: trimmed,
        timestamp: Date.now(),
      })
      setReply('')
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : 'Could not send your reply. Please try again.',
      )
    } finally {
      setSending(false)
    }
  }

  const activeSession = sessions.find((s) => s.sessionId === activeSessionId) || null

  return (
    <div className="admin-page min-h-screen font-sans">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
        {/* Global header */}
        <header className="mb-6 flex items-center justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 ring-1 ring-slate-700/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.3)]" />
              Admin
            </div>
            <h1 className="text-xl font-semibold text-slate-50 md:text-2xl">Chat Console</h1>
            <p className="text-xs text-slate-400 md:text-sm">
              Manage live conversations stored under <span className="font-mono text-slate-300">chats/</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700/70 bg-[#151921] px-3 py-2 text-xs font-medium text-slate-100 shadow-sm backdrop-blur-xl transition hover:border-slate-500 hover:bg-[#1b2130]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>Back to site</span>
            </a>
          </div>
        </header>

        {/* LOGIN */}
        {!authed && (
          <main className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/70 bg-[#151921]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
              <div className="mb-5">
                <div className="text-sm font-semibold text-slate-100">Sign in to Admin Console</div>
                <div className="mt-1 text-xs text-slate-400">
                  {authReady ? 'Enter the admin password to continue.' : 'Loading admin configuration…'}
                </div>
              </div>

              <label className="block text-xs font-semibold text-slate-300">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value)
                  setLoginError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') attemptLogin()
                }}
                disabled={!authReady}
                className="mt-2 w-full rounded-2xl border border-slate-700/70 bg-[#0B0E14]/80 px-3 py-2.5 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-600 focus:border-indigo-400/70 focus:ring-4 focus:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="••••••••"
              />

              {loginError && <div className="mt-3 text-xs font-medium text-rose-300">{loginError}</div>}

              <button
                type="button"
                onClick={attemptLogin}
                disabled={!authReady || !passwordInput.trim()}
                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Login
              </button>

              <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
                This is a lightweight client-side gate. For production, pair this with Firebase Auth and Realtime Database
                rules so only authenticated admins can read <span className="font-mono text-slate-300">chats/</span>.
              </p>
            </div>
          </main>
        )}

        {/* MAIN DASHBOARD */}
        {authed && (
          <main className="admin-dashboard flex min-h-0 flex-1 flex-col gap-4 md:flex-row md:gap-6">
            <aside className="admin-chat-list flex min-h-[220px] w-full shrink-0 flex-col gap-3 rounded-3xl border border-slate-800/80 bg-[#151921] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)] md:max-h-full md:w-[320px]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-50">Conversations</h2>
                  <p className="mt-0.5 text-xs text-slate-400">Visitor messages in real time</p>
                </div>
                <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300">
                  {sessions.length}
                </span>
              </div>

              <label className="relative block">
                <span className="sr-only">Search conversations</span>
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500" aria-hidden="true"></i>
                <input
                  type="search"
                  value={sessionSearch}
                  onChange={(event) => setSessionSearch(event.target.value)}
                  placeholder="Search name or message"
                  className="w-full rounded-xl border border-slate-700/70 bg-[#0B0E14]/80 py-2.5 pl-9 pr-3 text-xs text-slate-50 outline-none placeholder:text-slate-500 focus:border-indigo-400/80 focus:ring-2 focus:ring-indigo-500/25"
                />
              </label>

              <div className="admin-chat-list-items flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
                {filteredSessions.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-3 py-6 text-center">
                    <i className="fas fa-comments mb-2 text-xl text-slate-600" aria-hidden="true"></i>
                    <p className="text-xs text-slate-400">
                      {sessions.length === 0
                        ? 'No conversations yet.'
                        : 'No conversations match your search.'}
                    </p>
                  </div>
                ) : (
                  filteredSessions.map((session) => {
                    const isActive = session.sessionId === activeSessionId
                    const initial = (session.name || 'U').trim().charAt(0).toUpperCase()
                    return (
                      <button
                        key={session.sessionId}
                        type="button"
                        aria-current={isActive ? 'true' : undefined}
                        onClick={() => setActiveSessionId(session.sessionId)}
                        className={`admin-chat-item group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                          isActive
                            ? 'border-indigo-400/50 bg-indigo-500/15'
                            : 'border-transparent bg-[#0B0E14]/50 hover:border-slate-700/80 hover:bg-[#11151f]'
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                            isActive
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-800 text-slate-200 group-hover:bg-slate-700'
                          }`}
                        >
                          {initial || '?'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-slate-50">
                              {session.name}
                            </span>
                            <span className="shrink-0 text-[10px] text-slate-500">
                              {session.lastTimestamp
                                ? new Date(session.lastTimestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </span>
                          </span>
                          <span className="mt-1 block truncate text-xs text-slate-400">
                            {session.lastMessage || 'No messages yet'}
                          </span>
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </aside>

            <section className="admin-conversation relative flex min-h-[480px] min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-800/80 bg-[#121722]/95 shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
              <header className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-4 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  {activeSession ? (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-200">
                      {(activeSession.name || 'U').trim().charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                      <i className="fas fa-comment-dots" aria-hidden="true"></i>
                    </span>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-slate-50">
                      {activeSession ? activeSession.name : 'Select a conversation'}
                    </h2>
                    <p className="truncate text-xs text-slate-400">
                      {activeSession
                        ? `Session ${activeSession.sessionId}`
                        : 'Choose a visitor from the conversation list'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700/80 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-rose-400/60 hover:bg-rose-500/10 hover:text-rose-200"
                >
                  <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </header>

              <div className="admin-message-list flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 md:px-6">
                {messages.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-400">
                      <i className="fas fa-comment-slash" aria-hidden="true"></i>
                    </span>
                    <p className="text-sm font-medium text-slate-300">
                      {activeSession ? 'No messages in this conversation yet' : 'Your inbox is ready'}
                    </p>
                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                      {activeSession
                        ? 'New messages from this visitor will appear here.'
                        : 'Select a conversation to view messages and reply.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4" role="log" aria-live="polite">
                    {messages.map((message) => {
                      const fromAdmin = message.sender === 'admin'
                      return (
                        <div
                          key={message.key}
                          className={`flex ${fromAdmin ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className="max-w-[88%] md:max-w-[72%]">
                            <div
                              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                                fromAdmin
                                  ? 'bg-indigo-500 text-white'
                                  : 'border border-slate-700/70 bg-[#22272E] text-slate-100'
                              }`}
                            >
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-75">
                                {fromAdmin ? 'You' : activeSession?.name || 'Visitor'}
                              </p>
                              <p className="whitespace-pre-wrap break-words">{message.text}</p>
                            </div>
                            <p
                              className={`mt-1 text-[10px] text-slate-500 ${
                                fromAdmin ? 'text-right' : 'text-left'
                              }`}
                            >
                              {message.timestamp ? formatDateTime(message.timestamp) : ''}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <form
                className="admin-reply-form border-t border-slate-800/80 bg-[#0B0E14]/70 px-4 py-4 md:px-6"
                onSubmit={(event) => {
                  event.preventDefault()
                  void sendReply()
                }}
              >
                <label className="sr-only" htmlFor="admin-reply">
                  Write a reply
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="admin-reply"
                    value={reply}
                    onChange={(event) => {
                      setReply(event.target.value)
                      setSendError('')
                    }}
                    className="min-w-0 flex-1 rounded-xl border border-slate-700/70 bg-[#151921] px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-indigo-400/80 focus:ring-2 focus:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder={activeSessionId ? 'Write a reply…' : 'Select a conversation first'}
                    disabled={!activeSessionId || sending}
                  />
                  <button
                    type="submit"
                    disabled={!activeSessionId || sending || !reply.trim()}
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Send reply"
                  >
                    <i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} aria-hidden="true"></i>
                    <span className="hidden sm:inline">{sending ? 'Sending' : 'Send'}</span>
                  </button>
                </div>
                {sendError && (
                  <p className="mt-2 text-xs font-medium text-rose-300" role="alert">
                    {sendError}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-slate-500">
                  Replies are sent to the selected visitor in real time.
                </p>
              </form>
            </section>
          </main>
        )}
      </div>
    </div>
  )
}

