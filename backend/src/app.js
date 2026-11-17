import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import helmet from 'helmet'
import { errorHandler } from './middleware/errorHandler.js'
import { apiNotFoundHandler } from './middleware/notFound.js'
import { createApiRouter } from './routes/apiRoutes.js'
import { createChatService } from './services/chatService.js'
import { createEmailService } from './services/emailService.js'

const FRONTEND_DIST = fileURLToPath(new URL('../../frontend/dist/', import.meta.url))

export function createApp({ pool, events, auth, config, serveFrontend = true }) {
  const app = express()
  app.disable('x-powered-by')
  if (config.isProduction) app.set('trust proxy', 1)

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
          fontSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
        },
      },
    }),
  )
  app.use(express.json({ limit: '16kb' }))

  app.use(
    '/api',
    createApiRouter({
      pool,
      events,
      auth,
      config,
      chatService: createChatService(pool),
      emailService: createEmailService(config),
    }),
  )
  app.use('/api', apiNotFoundHandler)

  if (serveFrontend && existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST))
    app.use((request, response, next) => {
      if (request.method !== 'GET' || request.path.startsWith('/api/')) return next()
      return response.sendFile(path.join(FRONTEND_DIST, 'index.html'))
    })
  }

  app.use(errorHandler)
  return app
}
