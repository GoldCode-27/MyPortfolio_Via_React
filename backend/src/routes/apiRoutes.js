import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/

function validateSessionId(request, response, next) {
  if (!SESSION_ID_PATTERN.test(request.params.sessionId || '')) {
    return response.status(400).json({ error: 'Invalid chat session ID.' })
  }
  return next()
}

function normalizeName(value) {
  if (value == null) return null
  if (typeof value !== 'string' || value.length > 100) return undefined
  return value.trim() || null
}

function normalizeMessage(value) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text && text.length <= 5000 ? text : null
}

function startEventStream(response) {
  response.status(200)
  response.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  response.flushHeaders()
  response.write('event: ready\ndata: {}\n\n')
}

function streamEvents(request, response, events, eventName, predicate, format) {
  startEventStream(response)
  const listener = (update, sourceEventName) => {
    if (predicate(update)) {
      const emittedEventName =
        sourceEventName === 'contact-update' ? 'contact-update' : eventName
      response.write(
        `event: ${emittedEventName}\ndata: ${JSON.stringify(format(update))}\n\n`,
      )
    }
  }
  const chatListener = (update) => listener(update, 'chat-update')
  const contactListener = (update) => listener(update, 'contact-update')
  const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 25000)
  heartbeat.unref()
  events.on('chat-update', chatListener)
  events.on('contact-update', contactListener)
  request.on('close', () => {
    clearInterval(heartbeat)
    events.off('chat-update', chatListener)
    events.off('contact-update', contactListener)
  })
}

export function createApiRouter({ pool, events, auth, config, chatService, emailService }) {
  const router = Router()
  const originGuard = (request, response, next) => {
    const origin = request.get('origin')
    if (origin && origin !== config.appOrigin) {
      return response.status(403).json({ error: 'Request origin is not allowed.' })
    }
    return next()
  }
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Please try again later.' },
  })
  const passwordUpdateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 6,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many password update attempts. Please try again later.' },
  })
  const visitorMessageLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'You are sending messages too quickly. Please wait a moment.' },
  })
  const contactSubmissionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many contact requests. Please try again later.' },
  })

  router.get('/health', async (_request, response) => {
    await pool.query('SELECT 1')
    response.json({ status: 'ok' })
  })

  router.post('/admin/login', loginLimiter, originGuard, async (request, response) => {
    const password = request.body?.password
    if (typeof password !== 'string' || password.length === 0 || password.length > 1024) {
      return response.status(400).json({ error: 'Enter a valid administrator password.' })
    }
    const token = await auth.login(password)
    if (!token) return response.status(401).json({ error: 'Incorrect administrator password.' })
    auth.setSessionCookie(response, token)
    return response.json({ authenticated: true })
  })

  router.get('/admin/session', auth.requireAdmin, (_request, response) => {
    response.json({ authenticated: true })
  })

  router.put(
    '/admin/password',
    passwordUpdateLimiter,
    originGuard,
    auth.requireAdmin,
    async (request, response) => {
      const { currentPassword, newPassword } = request.body || {}
      if (
        typeof currentPassword !== 'string' ||
        currentPassword.length === 0 ||
        currentPassword.length > 1024
      ) {
        return response.status(400).json({ error: 'Enter your current password.' })
      }
      if (
        typeof newPassword !== 'string' ||
        newPassword.length < 12 ||
        Buffer.byteLength(newPassword, 'utf8') > 72
      ) {
        return response.status(400).json({
          error: 'Your new password must be at least 12 characters and no more than 72 UTF-8 bytes.',
        })
      }
      if (currentPassword === newPassword) {
        return response.status(400).json({
          error: 'Your new password must be different from your current password.',
        })
      }

      const updated = await auth.changePassword({
        currentPassword,
        newPassword,
        currentTokenHash: request.adminTokenHash,
      })
      if (!updated) {
        return response.status(400).json({ error: 'Your current password is incorrect.' })
      }
      return response.json({ passwordUpdated: true })
    },
  )

  router.post('/admin/logout', originGuard, auth.requireAdmin, async (request, response) => {
    await pool.execute('DELETE FROM admin_sessions WHERE token_hash = ?', [
      request.adminTokenHash,
    ])
    auth.clearSessionCookie(response)
    response.status(204).end()
  })

  router.get('/admin/events', auth.requireAdmin, (request, response) => {
    streamEvents(
      request,
      response,
      events,
      'chat-update',
      () => true,
      (update) => update,
    )
  })

  router.get('/admin/conversations', auth.requireAdmin, async (_request, response) => {
    response.json({ conversations: await chatService.listConversations() })
  })

  router.get(
    '/admin/conversations/:sessionId/messages',
    auth.requireAdmin,
    validateSessionId,
    async (request, response) => {
      response.json({ messages: await chatService.loadMessages(request.params.sessionId) })
    },
  )

  router.post(
    '/admin/conversations/:sessionId/messages',
    originGuard,
    auth.requireAdmin,
    validateSessionId,
    async (request, response) => {
      const text = normalizeMessage(request.body?.text)
      if (!text) {
        return response.status(400).json({ error: 'Message must contain 1 to 5000 characters.' })
      }

      const { sessionId } = request.params
      const message = await chatService.saveMessage({
        sessionId,
        sender: 'admin',
        name: null,
        text,
        timestamp: Date.now(),
      })
      if (!message) {
        return response.status(404).json({ error: 'Chat conversation was not found.' })
      }
      events.emit('chat-update', { sessionId, message })
      return response.status(201).json({ message })
    },
  )

  router.get('/admin/contact-submissions', auth.requireAdmin, async (_request, response) => {
    response.json({ submissions: await chatService.listContactSubmissions() })
  })

  router.get('/chat/:sessionId/messages', validateSessionId, async (request, response) => {
    response.json({
      messages: await chatService.loadMessages(request.params.sessionId, 50),
    })
  })

  router.get('/chat/:sessionId/events', validateSessionId, (request, response) => {
    const { sessionId } = request.params
    streamEvents(
      request,
      response,
      events,
      'chat-message',
      (update) => update.sessionId === sessionId && Boolean(update.message),
      (update) => update.message,
    )
  })

  router.put(
    '/chat/:sessionId/profile',
    originGuard,
    validateSessionId,
    async (request, response) => {
      const name = normalizeName(request.body?.name)
      if (name === undefined) {
        return response.status(400).json({ error: 'Name must be 100 characters or fewer.' })
      }
      const { sessionId } = request.params
      await chatService.saveProfile(sessionId, name, Date.now())
      events.emit('chat-update', { sessionId, profileUpdated: true })
      return response.json({ sessionId, name })
    },
  )

  router.post(
    '/chat/:sessionId/messages',
    visitorMessageLimiter,
    originGuard,
    validateSessionId,
    async (request, response) => {
      const text = normalizeMessage(request.body?.text)
      if (!text) {
        return response.status(400).json({ error: 'Message must contain 1 to 5000 characters.' })
      }
      const name = normalizeName(request.body?.name)
      if (name === undefined) {
        return response.status(400).json({ error: 'Name must be 100 characters or fewer.' })
      }

      const { sessionId } = request.params
      const message = await chatService.saveMessage({
        sessionId,
        sender: 'visitor',
        name,
        text,
        timestamp: Date.now(),
      })
      events.emit('chat-update', { sessionId, message })
      return response.status(201).json({ message })
    },
  )

  router.post(
    '/contact',
    contactSubmissionLimiter,
    originGuard,
    async (request, response) => {
      if (typeof request.body?.website === 'string' && request.body.website.trim()) {
        return response.status(202).json({ submitted: true })
      }

      const { name, email, subject, message } = request.body || {}
      const normalizedName = typeof name === 'string' ? name.trim() : ''
      const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
      const normalizedSubject = typeof subject === 'string' ? subject.trim() : ''
      const normalizedMessage = typeof message === 'string' ? message.trim() : ''

      if (!normalizedName || normalizedName.length > 100) {
        return response.status(400).json({ error: 'Name must be between 1 and 100 characters.' })
      }
      if (
        normalizedEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      ) {
        return response.status(400).json({ error: 'Enter a valid email address.' })
      }
      if (!normalizedSubject || normalizedSubject.length > 200) {
        return response.status(400).json({
          error: 'Subject must be between 1 and 200 characters.',
        })
      }
      if (/[\r\n]/.test(normalizedSubject)) {
        return response.status(400).json({ error: 'Subject must be a single line.' })
      }
      if (!normalizedMessage || normalizedMessage.length > 5000) {
        return response.status(400).json({
          error: 'Message must be between 1 and 5000 characters.',
        })
      }

      const submission = await chatService.createContactSubmission({
        name: normalizedName,
        email: normalizedEmail,
        subject: normalizedSubject,
        message: normalizedMessage,
        emailStatus: config.smtpConfigured ? 'pending' : 'not_configured',
        timestamp: Date.now(),
      })
      const delivery = await emailService.sendContactNotification(submission)
      if (delivery.status !== submission.emailStatus) {
        await chatService.updateContactEmailStatus(
          submission.id,
          delivery.status,
          delivery.error,
        )
        submission.emailStatus = delivery.status
        submission.emailError = delivery.error
      }

      events.emit('contact-update', { submission })
      return response.status(201).json({
        submitted: true,
        emailStatus: submission.emailStatus,
      })
    },
  )

  return router
}
