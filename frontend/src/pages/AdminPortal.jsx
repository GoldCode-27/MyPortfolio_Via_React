import { useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../api.js'
import ThemeToggle from '../components/ThemeToggle.jsx'


function formatDateTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

export default function AdminPortal() {
  const [authReady, setAuthReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordUpdateBusy, setPasswordUpdateBusy] = useState(false)
  const [passwordUpdateError, setPasswordUpdateError] = useState('')
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState('')
  const [liveStatus, setLiveStatus] = useState('connecting')

  const [sessions, setSessions] = useState([])
  const [sessionSearch, setSessionSearch] = useState('')
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [activeView, setActiveView] = useState('inbox')
  const [contactSubmissions, setContactSubmissions] = useState([])
  const [activeContactId, setActiveContactId] = useState(null)
  const [contactLoading, setContactLoading] = useState(false)
  const [contactError, setContactError] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [dashboardError, setDashboardError] = useState('')

  const messagesEndRef = useRef(null)
  const currentPasswordInputRef = useRef(null)
  const passwordActionRef = useRef(null)
  const activeSessionIdRef = useRef(activeSessionId)
  activeSessionIdRef.current = activeSessionId

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
    let active = true
    apiRequest('/admin/session')
      .then(() => {
        if (active) setAuthed(true)
      })
      .catch((error) => {
        if (active && error.status !== 401) {
          setLoginError(error instanceof Error ? error.message : 'Could not reach the server.')
        }
      })
      .finally(() => {
        if (active) setAuthReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  const logout = async () => {
    setDashboardError('')
    try {
      await apiRequest('/admin/logout', { method: 'POST' })
      setAuthed(false)
      setPasswordInput('')
      setLoginError('')
      setSessions([])
      setActiveSessionId(null)
      setMessages([])
      setContactSubmissions([])
      setActiveContactId(null)
    } catch (error) {
      if (error.status === 401) {
        setAuthed(false)
        setSessions([])
        setActiveSessionId(null)
        setMessages([])
        setContactSubmissions([])
        setActiveContactId(null)
      } else {
        setDashboardError(error instanceof Error ? error.message : 'Could not sign out.')
      }
    }
  }

  const attemptLogin = async () => {
    if (!passwordInput) return
    setAuthBusy(true)
    setLoginError('')
    try {
      await apiRequest('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password: passwordInput }),
      })
      setAuthed(true)
      setPasswordInput('')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Could not sign in.')
    } finally {
      setAuthBusy(false)
    }
  }

  useEffect(() => {
    if (!authed) return
    let active = true
    const loadConversations = async () => {
      try {
        const { conversations } = await apiRequest('/admin/conversations')
        if (!active) return
        setSessions(conversations)
        setActiveSessionId((current) =>
          current && conversations.some((item) => item.sessionId === current)
            ? current
            : conversations[0]?.sessionId || null,
        )
        setDashboardError('')
      } catch (error) {
        if (!active) return
        if (error.status === 401) {
          setAuthed(false)
          setLoginError('Your administrator session has expired. Please sign in again.')
        } else {
          setDashboardError(
            error instanceof Error ? error.message : 'Could not load conversations.',
          )
        }
      }
    }
    const loadContactSubmissions = async () => {
      setContactLoading(true)
      try {
        const { submissions } = await apiRequest('/admin/contact-submissions')
        if (!active) return
        setContactSubmissions(submissions)
        setActiveContactId((current) =>
          current && submissions.some((item) => item.id === current)
            ? current
            : submissions[0]?.id || null,
        )
        setContactError('')
      } catch (error) {
        if (!active) return
        if (error.status === 401) {
          setAuthed(false)
          setLoginError('Your administrator session has expired. Please sign in again.')
        } else {
          setContactError(
            error instanceof Error ? error.message : 'Could not load website inquiries.',
          )
        }
      } finally {
        if (active) setContactLoading(false)
      }
    }

    void loadConversations()
    void loadContactSubmissions()
    const eventSource = new EventSource('/api/admin/events')
    eventSource.addEventListener('ready', () => {
      void loadConversations()
      void loadContactSubmissions()
    })
    eventSource.addEventListener('chat-update', (event) => {
      const update = JSON.parse(event.data)
      void loadConversations()
      if (update.sessionId === activeSessionIdRef.current) {
        apiRequest(
          `/admin/conversations/${encodeURIComponent(update.sessionId)}/messages`,
        )
          .then(({ messages: nextMessages }) => {
            if (active) setMessages(nextMessages)
          })
          .catch((error) => {
            if (active) {
              setDashboardError(
                error instanceof Error ? error.message : 'Could not refresh messages.',
              )
            }
          })
          eventSource.addEventListener('contact-update', () => {
            void loadContactSubmissions()
          })
      }
    })
    eventSource.onerror = () => {
      if (!active) return
      setLiveStatus('reconnecting')
      apiRequest('/admin/session').catch((error) => {
        if (!active) return
        if (error.status === 401) {
          setAuthed(false)
          setLoginError('Your administrator session has expired. Please sign in again.')
        } else {
          setDashboardError('Live updates interrupted. Reconnecting…')
        }
      })
    }
    eventSource.onopen = () => {
      if (active) {
        setLiveStatus('live')
        setDashboardError('')
      }
    }

    return () => {
      active = false
      eventSource.close()
    }
  }, [authed])

  useEffect(() => {
    if (!authed) return
    if (!activeSessionId) {
      setMessages([])
      return
    }
    let active = true
    apiRequest(
      `/admin/conversations/${encodeURIComponent(activeSessionId)}/messages`,
    )
      .then(({ messages: nextMessages }) => {
        if (active) setMessages(nextMessages)
      })
      .catch((error) => {
        if (!active) return
        if (error.status === 401) {
          setAuthed(false)
          setLoginError('Your administrator session has expired. Please sign in again.')
        } else {
          setDashboardError(
            error instanceof Error ? error.message : 'Could not load conversation messages.',
          )
        }
      })
    return () => {
      active = false
    }
  }, [activeSessionId, authed])

  useEffect(() => {
    if (!passwordDialogOpen) return
    currentPasswordInputRef.current?.focus()
    const passwordActionButton = passwordActionRef.current
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setPasswordDialogOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      passwordActionButton?.focus()
    }
  }, [passwordDialogOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const sendReply = async () => {
    const trimmed = reply.trim()
    if (!trimmed || !activeSessionId) return
    setSending(true)
    setSendError('')
    try {
      const { message } = await apiRequest(
        `/admin/conversations/${encodeURIComponent(activeSessionId)}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ text: trimmed }),
        },
      )
      setMessages((current) =>
        current.some((item) => item.key === message.key)
          ? current
          : [...current, message].sort((a, b) => a.timestamp - b.timestamp),
      )
      setReply('')
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : 'Could not send your reply. Please try again.',
      )
    } finally {
      setSending(false)
    }
  }

  const closePasswordDialog = () => {
    setPasswordDialogOpen(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordUpdateError('')
    setPasswordUpdateSuccess('')
  }

  const updatePassword = async (event) => {
    event.preventDefault()
    setPasswordUpdateError('')
    setPasswordUpdateSuccess('')

    if (newPassword !== confirmPassword) {
      setPasswordUpdateError('The new passwords do not match.')
      return
    }

    setPasswordUpdateBusy(true)
    try {
      await apiRequest('/admin/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordUpdateSuccess('Your password has been updated successfully.')
    } catch (error) {
      setPasswordUpdateError(
        error instanceof Error ? error.message : 'Could not update your password.',
      )
    } finally {
      setPasswordUpdateBusy(false)
    }
  }

  const activeSession = sessions.find((s) => s.sessionId === activeSessionId) || null
  const activeContact =
    contactSubmissions.find((submission) => submission.id === activeContactId) || null

  return (
    <div className="admin-app">
      {!authed ? (
        <main className="admin-auth-page">
          <section className="admin-auth-card">
            <div className="admin-auth-brand">
              <a className="admin-brand-lockup" href="/" aria-label="Workineh portfolio home">
                <span className="admin-brand-mark">
                  <i className="fas fa-layer-group" aria-hidden="true" />
                </span>
                <span>WORKINEH<span className="admin-brand-dot">.</span></span>
              </a>
              <div className="admin-auth-intro">
                <span className="admin-eyebrow">PORTFOLIO ADMINISTRATION</span>
                <h1>Your conversations,<br />all in one place.</h1>
                <p>Sign in to manage visitor messages and continue conversations in real time.</p>
              </div>
              <div className="admin-auth-feature">
                <span><i className="fas fa-bolt" aria-hidden="true" /></span>
                <div>
                  <strong>Live inbox</strong>
                  <p>New messages appear here as soon as they arrive.</p>
                </div>
              </div>
              <div className="admin-auth-decoration" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="admin-auth-form-panel">
              <div className="admin-auth-form-wrap">
                <div className="admin-auth-mobile-brand">
                  <span className="admin-brand-mark">
                    <i className="fas fa-layer-group" aria-hidden="true" />
                  </span>
                  <span>WORKINEH<span className="admin-brand-dot">.</span></span>
                </div>
                <div className="admin-auth-heading">
                  <span className="admin-auth-icon">
                    <i className="fas fa-lock" aria-hidden="true" />
                  </span>
                  <span className="admin-eyebrow">SECURE ADMIN ACCESS</span>
                  <h2>Welcome back</h2>
                  <p>
                    {authReady
                      ? 'Enter your administrator password to open your inbox.'
                      : 'Checking your secure session…'}
                  </p>
                </div>

                <form
                  className="admin-login-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void attemptLogin()
                  }}
                >
                  <label htmlFor="admin-password">Administrator password</label>
                  <div className="admin-password-field">
                    <i className="fas fa-key" aria-hidden="true" />
                    <input
                      id="admin-password"
                      type="password"
                      value={passwordInput}
                      autoComplete="current-password"
                      onChange={(event) => {
                        setPasswordInput(event.target.value)
                        setLoginError('')
                      }}
                      disabled={!authReady || authBusy}
                      placeholder="Enter your password"
                    />
                  </div>
                  {loginError && (
                    <p className="admin-form-error" role="alert">{loginError}</p>
                  )}
                  <button
                    className="admin-login-button"
                    type="submit"
                    disabled={!authReady || authBusy || !passwordInput}
                  >
                    {authBusy ? (
                      <>
                        <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign in to dashboard
                        <i className="fas fa-arrow-right" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>

                <div className="admin-auth-security">
                  <i className="fas fa-shield-alt" aria-hidden="true" />
                  <span>Your password is verified securely by the backend and is never saved in this browser.</span>
                </div>
                <a className="admin-auth-back-link" href="/">
                  <i className="fas fa-arrow-left" aria-hidden="true" />
                  Back to portfolio
                </a>
              </div>
              <footer className="admin-auth-footer">
                <span>© {new Date().getFullYear()} Workineh Chalachew</span>
                <ThemeToggle />
              </footer>
            </div>
          </section>
        </main>
      ) : (
        <div className="admin-dashboard">
          <aside className="admin-sidebar">
            <a className="admin-brand-lockup" href="/" aria-label="Workineh portfolio home">
              <span className="admin-brand-mark">
                <i className="fas fa-layer-group" aria-hidden="true" />
              </span>
              <span>WORKINEH<span className="admin-brand-dot">.</span></span>
            </a>

            <div className="admin-sidebar-label">WORKSPACE</div>
            <nav className="admin-sidebar-nav" aria-label="Admin navigation">
              <button
                className={`admin-nav-item${activeView === 'inbox' ? ' active' : ''}`}
                type="button"
                aria-current={activeView === 'inbox' ? 'page' : undefined}
                onClick={() => setActiveView('inbox')}
              >
                <i className="fas fa-inbox" aria-hidden="true" />
                <span>Chat inbox</span>
                <span className="admin-nav-count">{sessions.length}</span>
              </button>
              <button
                className={`admin-nav-item${activeView === 'inquiries' ? ' active' : ''}`}
                type="button"
                aria-current={activeView === 'inquiries' ? 'page' : undefined}
                onClick={() => setActiveView('inquiries')}
              >
                <i className="fas fa-envelope-open-text" aria-hidden="true" />
                <span>Website inquiries</span>
                <span className="admin-nav-count">{contactSubmissions.length}</span>
              </button>
            </nav>

            <div className="admin-sidebar-note">
              <span className={`admin-live-dot ${liveStatus}`} />
              <div>
                <strong>{liveStatus === 'live' ? 'Live updates active' : 'Reconnecting'}</strong>
                <p>
                  {liveStatus === 'live'
                    ? 'Connected to your message service'
                    : 'Restoring your live connection'}
                </p>
              </div>
            </div>

            <div className="admin-sidebar-bottom">
              <div className="admin-user-card">
                <span className="admin-user-avatar">WC</span>
                <span className="admin-user-details">
                  <strong>Workineh Chalachew</strong>
                  <span>Administrator</span>
                </span>
              </div>
              <button className="admin-sidebar-logout" type="button" onClick={() => void logout()}>
                <i className="fas fa-sign-out-alt" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </aside>

          <main className="admin-main">
            <header className="admin-topbar">
              <div className="admin-breadcrumb">
                <span>Workspace</span>
                <i className="fas fa-chevron-right" aria-hidden="true" />
                <strong>{activeView === 'inbox' ? 'Chat inbox' : 'Website inquiries'}</strong>
              </div>
              <div className="admin-topbar-actions">
                <button
                  ref={passwordActionRef}
                  className="admin-password-action"
                  type="button"
                  onClick={() => {
                    setPasswordUpdateError('')
                    setPasswordUpdateSuccess('')
                    setPasswordDialogOpen(true)
                  }}
                >
                  <i className="fas fa-key" aria-hidden="true" />
                  <span>Change password</span>
                </button>
                <span className="admin-topbar-status">
                  <span className={`admin-live-dot ${liveStatus}`} />
                    {liveStatus === 'live'
                      ? 'Live'
                      : liveStatus === 'reconnecting'
                        ? 'Reconnecting'
                        : 'Connecting'}
                </span>
                <ThemeToggle />
                <a className="admin-site-link" href="/">
                  <i className="fas fa-external-link-alt" aria-hidden="true" />
                  View portfolio
                </a>
              </div>
            </header>

            <div className="admin-content">
              <div className="admin-page-heading">
                <div>
                  <span className="admin-eyebrow">
                    {activeView === 'inbox' ? 'CUSTOMER MESSAGES' : 'PORTFOLIO CONTACT FORM'}
                  </span>
                  <h1>{activeView === 'inbox' ? 'Chat inbox' : 'Website inquiries'}</h1>
                  <p>
                    {activeView === 'inbox'
                      ? 'Keep up with visitors and reply to their questions.'
                      : 'Messages submitted through the portfolio contact form.'}
                  </p>
                </div>
                <div className="admin-inbox-summary">
                  <span className="admin-summary-icon">
                    <i
                      className={`fas ${activeView === 'inbox' ? 'fa-comments' : 'fa-envelope'}`}
                      aria-hidden="true"
                    />
                  </span>
                  <span>
                    <strong>
                      {activeView === 'inbox' ? sessions.length : contactSubmissions.length}
                    </strong>
                    <small>{activeView === 'inbox' ? 'conversations' : 'inquiries'}</small>
                  </span>
                </div>
              </div>

              {dashboardError && (
                <p className="admin-dashboard-alert" role="alert">
                  <i className="fas fa-exclamation-circle" aria-hidden="true" />
                  {dashboardError}
                </p>
              )}

              {activeView === 'inbox' ? (
              <section className="admin-inbox-layout" id="inbox" aria-label="Message inbox">
                <aside className="admin-inbox-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <h2>Conversations</h2>
                      <p>Your visitor messages</p>
                    </div>
                    <span className="admin-panel-count">{sessions.length}</span>
                  </div>

                  <label className="admin-search">
                    <span className="sr-only">Search conversations</span>
                    <i className="fas fa-search" aria-hidden="true" />
                    <input
                      type="search"
                      value={sessionSearch}
                      onChange={(event) => setSessionSearch(event.target.value)}
                      placeholder="Search conversations"
                    />
                    <kbd>/</kbd>
                  </label>

                  <div className="admin-conversation-list">
                    {filteredSessions.length === 0 ? (
                      <div className="admin-list-empty">
                        <span className="admin-empty-icon">
                          <i className="fas fa-comments" aria-hidden="true" />
                        </span>
                        <strong>
                          {sessions.length === 0 ? 'Your inbox is empty' : 'No matches found'}
                        </strong>
                        <p>
                          {sessions.length === 0
                            ? 'Visitor conversations will show up here.'
                            : 'Try a different name or message.'}
                        </p>
                      </div>
                    ) : (
                      filteredSessions.map((session) => {
                        const isActive = session.sessionId === activeSessionId
                        const initial = (session.name || 'G').trim().charAt(0).toUpperCase()
                        return (
                          <button
                            className={`admin-conversation-item${isActive ? ' active' : ''}`}
                            key={session.sessionId}
                            type="button"
                            aria-current={isActive ? 'true' : undefined}
                            onClick={() => setActiveSessionId(session.sessionId)}
                          >
                            <span className="admin-visitor-avatar">{initial || 'G'}</span>
                            <span className="admin-conversation-copy">
                              <span className="admin-conversation-meta">
                                <strong>{session.name}</strong>
                                <time>
                                  {session.lastTimestamp
                                    ? new Date(session.lastTimestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : ''}
                                </time>
                              </span>
                              <span className="admin-conversation-preview">
                                {session.lastMessage || 'No messages yet'}
                              </span>
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                  <div className="admin-inbox-footer">
                    <i className="fas fa-lock" aria-hidden="true" />
                    Conversations are private to your admin account
                  </div>
                </aside>

                <section className="admin-thread-panel" aria-label="Selected conversation">
                  <header className="admin-thread-header">
                    <div className="admin-thread-identity">
                      {activeSession ? (
                        <span className="admin-visitor-avatar large">
                          {(activeSession.name || 'G').trim().charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <span className="admin-thread-placeholder">
                          <i className="fas fa-comment-dots" aria-hidden="true" />
                        </span>
                      )}
                      <div>
                        <h2>{activeSession ? activeSession.name : 'Select a conversation'}</h2>
                        <p>
                          {activeSession
                            ? 'Visitor'
                            : 'Choose a visitor from the list to view messages'}
                        </p>
                      </div>
                    </div>
                    {activeSession && (
                      <span className="admin-session-badge">
                        <span className="admin-live-dot" />
                        Active conversation
                      </span>
                    )}
                  </header>

                  <div className="admin-message-list">
                    {messages.length === 0 ? (
                      <div className="admin-thread-empty">
                        <span className="admin-empty-icon">
                          <i className="fas fa-comment-dots" aria-hidden="true" />
                        </span>
                        <strong>
                          {activeSession ? 'Start the conversation' : 'Your inbox is ready'}
                        </strong>
                        <p>
                          {activeSession
                            ? 'Send a reply to this visitor using the message box below.'
                            : 'Select a conversation to read messages and reply.'}
                        </p>
                      </div>
                    ) : (
                      <div className="admin-message-log" role="log" aria-live="polite">
                        {messages.map((message) => {
                          const fromAdmin = message.sender === 'admin'
                          return (
                            <div
                              className={`admin-message-row${fromAdmin ? ' from-admin' : ''}`}
                              key={message.key}
                            >
                              <div className="admin-message-content">
                                <div className="admin-message-bubble">
                                  <p>{message.text}</p>
                                </div>
                                <div className="admin-message-meta">
                                  <span>{fromAdmin ? 'You' : activeSession?.name || 'Visitor'}</span>
                                  <time>{message.timestamp ? formatDateTime(message.timestamp) : ''}</time>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  <form
                    className="admin-reply-form"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void sendReply()
                    }}
                  >
                    {sendError && (
                      <p className="admin-form-error" role="alert">{sendError}</p>
                    )}
                    <label className="sr-only" htmlFor="admin-reply">
                      Write a reply
                    </label>
                    <div className="admin-composer">
                      <input
                        id="admin-reply"
                        value={reply}
                        maxLength={5000}
                        onChange={(event) => {
                          setReply(event.target.value)
                          setSendError('')
                        }}
                        placeholder={
                          activeSessionId ? 'Write a message…' : 'Select a conversation first'
                        }
                        disabled={!activeSessionId || sending}
                      />
                      <span className="admin-composer-hint">
                        <i className="fas fa-reply" aria-hidden="true" />
                        Replying as Workineh
                      </span>
                      <button
                        className="admin-send-button"
                        type="submit"
                        disabled={!activeSessionId || sending || !reply.trim()}
                        aria-label="Send reply"
                      >
                        <i
                          className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}
                          aria-hidden="true"
                        />
                        <span>{sending ? 'Sending' : 'Send reply'}</span>
                      </button>
                    </div>
                    <p className="admin-composer-caption">
                      Press Enter to send your reply. Messages are delivered instantly.
                    </p>
                  </form>
                </section>
              </section>
                ) : (
                  <section className="admin-contact-layout" aria-label="Website inquiries">
                    <aside className="admin-contact-list-panel">
                      <div className="admin-panel-heading">
                        <div>
                          <h2>All inquiries</h2>
                          <p>Contact form submissions</p>
                        </div>
                        <span className="admin-panel-count">{contactSubmissions.length}</span>
                      </div>
                      <div className="admin-contact-list">
                        {contactLoading && contactSubmissions.length === 0 ? (
                          <p className="admin-contact-empty" role="status">Loading inquiries…</p>
                        ) : contactError ? (
                          <p className="admin-contact-empty" role="alert">{contactError}</p>
                        ) : contactSubmissions.length === 0 ? (
                          <div className="admin-contact-empty">
                            <span className="admin-empty-icon">
                              <i className="fas fa-envelope" aria-hidden="true" />
                            </span>
                            <strong>No inquiries yet</strong>
                            <p>Messages sent from the portfolio will appear here.</p>
                          </div>
                        ) : (
                          contactSubmissions.map((submission) => {
                            const isActive = submission.id === activeContactId
                            return (
                              <button
                                className={`admin-contact-item${isActive ? ' active' : ''}`}
                                key={submission.id}
                                type="button"
                                aria-current={isActive ? 'true' : undefined}
                                onClick={() => setActiveContactId(submission.id)}
                              >
                                <span className="admin-contact-avatar">
                                  {(submission.name || '?').trim().charAt(0).toUpperCase()}
                                </span>
                                <span className="admin-contact-copy">
                                  <span className="admin-contact-meta">
                                    <strong>{submission.name}</strong>
                                    <time>{formatDateTime(submission.createdAt)}</time>
                                  </span>
                                  <strong className="admin-contact-subject">{submission.subject}</strong>
                                  <span className="admin-contact-preview">{submission.message}</span>
                                </span>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </aside>

                    <article className="admin-contact-detail">
                      {activeContact ? (
                        <>
                          <header className="admin-contact-detail-header">
                            <div>
                              <span className="admin-eyebrow">INQUIRY DETAILS</span>
                              <h2>{activeContact.subject}</h2>
                            </div>
                            <span className={`admin-delivery-status ${activeContact.emailStatus}`}>
                              <i
                                className={`fas ${
                                  activeContact.emailStatus === 'sent'
                                    ? 'fa-check-circle'
                                    : activeContact.emailStatus === 'failed'
                                      ? 'fa-exclamation-circle'
                                      : 'fa-info-circle'
                                }`}
                                aria-hidden="true"
                              />
                              {activeContact.emailStatus === 'sent'
                                ? 'Email sent'
                                : activeContact.emailStatus === 'failed'
                                  ? 'Email failed'
                                  : 'Email not configured'}
                            </span>
                          </header>
                          <div className="admin-contact-sender">
                            <span className="admin-contact-avatar large">
                              {(activeContact.name || '?').trim().charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <strong>{activeContact.name}</strong>
                              <a href={`mailto:${activeContact.email}`}>{activeContact.email}</a>
                            </div>
                            <time>{formatDateTime(activeContact.createdAt)}</time>
                          </div>
                          <div className="admin-contact-message">
                            <p>{activeContact.message}</p>
                          </div>
                          {activeContact.emailError && (
                            <p className="admin-contact-email-error">
                              Delivery detail: {activeContact.emailError}
                            </p>
                          )}
                          {activeContact.emailStatus === 'not_configured' && (
                            <p className="admin-contact-email-error">
                              Configure SMTP in the backend environment to receive email notifications.
                            </p>
                          )}
                          <a
                            className="admin-contact-reply"
                            href={`mailto:${activeContact.email}?subject=${encodeURIComponent(`Re: ${activeContact.subject}`)}`}
                          >
                            <i className="fas fa-reply" aria-hidden="true" />
                            Reply by email
                          </a>
                        </>
                      ) : (
                        <div className="admin-contact-empty">
                          <span className="admin-empty-icon">
                            <i className="fas fa-envelope-open" aria-hidden="true" />
                          </span>
                          <strong>Select an inquiry</strong>
                          <p>Choose a message from the list to read the full details.</p>
                        </div>
                      )}
                    </article>
                  </section>
                )}
            </div>
          </main>
          {passwordDialogOpen && (
            <div
              className="admin-modal-backdrop"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closePasswordDialog()
              }}
            >
              <section
                className="admin-password-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-password-title"
                aria-describedby="admin-password-description"
                onKeyDown={(event) => {
                  if (event.key !== 'Tab') return
                  const controls = event.currentTarget.querySelectorAll(
                    'button:not(:disabled), input:not(:disabled)',
                  )
                  const first = controls[0]
                  const last = controls[controls.length - 1]
                  if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault()
                    last?.focus()
                  } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault()
                    first?.focus()
                  }
                }}
              >
                <header className="admin-password-dialog-header">
                  <span className="admin-auth-icon">
                    <i className="fas fa-shield-alt" aria-hidden="true" />
                  </span>
                  <button
                    className="admin-dialog-close"
                    type="button"
                    onClick={closePasswordDialog}
                    aria-label="Close change password dialog"
                  >
                    <i className="fas fa-times" aria-hidden="true" />
                  </button>
                </header>
                <h2 id="admin-password-title">Change your password</h2>
                <p id="admin-password-description">
                  Choose a new password with at least 12 characters. Your current session will remain active.
                </p>
                <form className="admin-password-form" onSubmit={updatePassword}>
                  <label htmlFor="current-admin-password">Current password</label>
                  <input
                    ref={currentPasswordInputRef}
                    id="current-admin-password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                    disabled={passwordUpdateBusy || Boolean(passwordUpdateSuccess)}
                  />
                  <label htmlFor="new-admin-password">New password</label>
                  <input
                    id="new-admin-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={1024}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    disabled={passwordUpdateBusy || Boolean(passwordUpdateSuccess)}
                  />
                  <label htmlFor="confirm-admin-password">Confirm new password</label>
                  <input
                    id="confirm-admin-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={1024}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    disabled={passwordUpdateBusy || Boolean(passwordUpdateSuccess)}
                  />
                  {passwordUpdateError && (
                    <p className="admin-form-error" role="alert">{passwordUpdateError}</p>
                  )}
                  {passwordUpdateSuccess && (
                    <p className="admin-form-success" role="status">{passwordUpdateSuccess}</p>
                  )}
                  <div className="admin-password-dialog-actions">
                    <button
                      className="admin-dialog-cancel"
                      type="button"
                      onClick={closePasswordDialog}
                    >
                      {passwordUpdateSuccess ? 'Done' : 'Cancel'}
                    </button>
                    {!passwordUpdateSuccess && (
                      <button
                        className="admin-login-button"
                        type="submit"
                        disabled={
                          passwordUpdateBusy ||
                          !currentPassword ||
                          newPassword.length < 12 ||
                          !confirmPassword
                        }
                      >
                        {passwordUpdateBusy ? 'Updating…' : 'Update password'}
                      </button>
                    )}
                  </div>
                </form>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

