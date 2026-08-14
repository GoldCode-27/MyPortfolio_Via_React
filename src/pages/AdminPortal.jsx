import { useEffect, useMemo, useRef, useState } from 'react'
import { onValue, push, ref } from 'firebase/database'
import { db } from '../firebase'

const ADMIN_SESSION_KEY = 'portfolio_admin_authed'

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
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(ADMIN_SESSION_KEY) === '1')
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError] = useState('')

  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const lastSeenBySessionRef = useRef(new Map())

  const chatsRef = useMemo(() => ref(db, 'chats'), [])
  const adminPasswordRef = useMemo(() => ref(db, 'admin_config/password'), [])

  useEffect(() => {
    const unsub = onValue(adminPasswordRef, (snap) => {
      const val = snap.val()
      setAdminPassword(typeof val === 'string' ? val : null)
      setAuthReady(true)
    })
    return () => unsub()
  }, [adminPasswordRef])

  const logout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
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
    sessionStorage.setItem(ADMIN_SESSION_KEY, '1')
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

  const sendReply = async () => {
    const trimmed = reply.trim()
    if (!trimmed || !activeSessionId) return
    setSending(true)
    try {
      const sessionMessagesRef = ref(db, `chats/${activeSessionId}/messages`)
      await push(sessionMessagesRef, {
        sender: 'admin',
        text: trimmed,
        timestamp: Date.now(),
      })
      setReply('')
    } finally {
      setSending(false)
    }
  }

  const activeSession = sessions.find((s) => s.sessionId === activeSessionId) || null

  return (
    <div className="min-h-screen bg-[#0B0E14] bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18)_0,_transparent_55%)] font-sans text-slate-50">
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
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700/70 bg-[#151921] px-3 py-2 text-xs font-medium text-slate-100 shadow-sm backdrop-blur-xl transition hover:border-slate-500 hover:bg-[#1b2130]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>Back to site</span>
          </a>
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
          <main className="flex flex-1 gap-4 md:gap-6">
            {/* Sidebar */}
            <aside className="flex w-[280px] shrink-0 flex-col gap-3 rounded-3xl border border-slate-800/80 bg-[#151921] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
              <div className="flex items-center justify-between px-1 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.35)]" />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                    Active Chats
                  </div>
                </div>
                <div className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300">
                  {sessions.length} live
                </div>
              </div>

              <div className="mt-1 flex-1 space-y-1 overflow-y-auto pr-1">
                {sessions.length === 0 ? (
                  <div className="mt-6 px-3 text-xs text-slate-500">No sessions yet.</div>
                ) : (
                  sessions.map((s) => {
                    const isActive = s.sessionId === activeSessionId
                    const initial = (s.name || 'U').trim().charAt(0).toUpperCase()
                    return (
                      <button
                        key={s.sessionId}
                        type="button"
                        onClick={() => setActiveSessionId(s.sessionId)}
                        className={[
                          'group flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-all duration-300',
                          isActive
                            ? 'bg-indigo-500/15 ring-1 ring-indigo-500/70 shadow-[0_0_0_1px_rgba(15,23,42,0.9)]'
                            : 'bg-[#0B0E14]/60 hover:bg-[#11151f]',
                        ].join(' ')}
                      >
                        <div
                          className={[
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase',
                            isActive
                              ? 'bg-indigo-500 text-white shadow-[0_0_0_3px_rgba(129,140,248,0.6)]'
                              : 'bg-slate-800 text-slate-100 shadow-[0_0_0_2px_rgba(15,23,42,0.9)] group-hover:bg-slate-700',
                          ].join(' ')}
                        >
                          {initial || '?'}
                        </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="truncate text-xs font-semibold text-slate-50">{s.name}</div>
                              <div className="shrink-0 text-[10px] text-slate-500">
                                {s.lastTimestamp ? formatDateTime(s.lastTimestamp) : ''}
                              </div>
                            </div>
                            <div className="mt-0.5 truncate text-[11px] text-slate-400">{s.lastMessage}</div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </aside>

            {/* Conversation area */}
            <section className="relative flex flex-1 flex-col overflow-hidden rounded-3xl border border-slate-800/80 bg-[#121722]/95 shadow-[0_28px_90px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
              {/* Top bar: selected user + logout */}
              <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 md:px-6 md:py-4">
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    {activeSession ? 'Conversation' : 'No session selected'}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {activeSession && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold uppercase text-slate-100">
                        {(activeSession.name || 'U').trim().charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-50">
                        {activeSession ? activeSession.name : 'Select a session on the left'}
                      </div>
                      {activeSession && (
                        <div className="truncate text-[11px] font-mono text-slate-500">
                          {activeSession.sessionId}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={logout}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/70 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 shadow-sm transition hover:bg-rose-500/20"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    Logout
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(51,65,85,0.45)_0,_transparent_65%)] px-3 py-3 md:px-5 md:py-5">
                {messages.length === 0 ? (
                  <div className="mt-10 text-center text-sm text-slate-500">
                    {activeSession
                      ? 'No messages yet in this conversation.'
                      : 'Choose a chat session from the left to begin.'}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {messages.map((m) => {
                      const fromAdmin = m.sender === 'admin'
                      return (
                        <div key={m.key} className={`flex ${fromAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className="max-w-[80%] md:max-w-[70%] transition-all duration-300">
                            <div
                              className={[
                                'rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-sm ring-1',
                                fromAdmin
                                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white ring-indigo-400/50'
                                  : 'bg-[#22272E] text-slate-100 ring-slate-700/80',
                              ].join(' ')}
                            >
                              <div className="flex items-baseline justify-between gap-3">
                                <div
                                  className={`truncate text-[11px] ${
                                    fromAdmin ? 'text-indigo-100/90' : 'text-slate-300'
                                  }`}
                                >
                                  {fromAdmin ? 'admin' : m.sender || 'visitor'}
                                </div>
                              </div>
                              <div className="mt-1 whitespace-pre-wrap break-words">{m.text}</div>
                            </div>
                            <div
                              className={`mt-1 text-[10px] ${
                                fromAdmin ? 'text-indigo-200/80 text-right' : 'text-slate-500'
                              }`}
                            >
                              {m.timestamp ? formatDateTime(m.timestamp) : ''}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-slate-800/80 bg-[#0B0E14]/85 px-3 py-3 backdrop-blur-xl md:px-5 md:py-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="relative flex-1">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') sendReply()
                      }}
                      className="w-full rounded-2xl border border-slate-700/70 bg-[#151921]/90 px-3.5 py-2.5 pr-10 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-indigo-400/80 focus:ring-4 focus:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder={activeSessionId ? 'Reply as admin…' : 'Select a session first…'}
                      disabled={!activeSessionId}
                    />
                    {/* Send icon */}
                    <button
                      type="button"
                      onClick={sendReply}
                      disabled={!activeSessionId || sending || !reply.trim()}
                      className="absolute inset-y-0 right-1.5 my-1.5 inline-flex w-8 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
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
                <div className="mt-2 text-[11px] text-slate-500">
                  Tip: open your portfolio in another browser or device to watch new sessions appear in real time.
                </div>
              </div>
            </section>
          </main>
        )}
      </div>
    </div>
  )
}

