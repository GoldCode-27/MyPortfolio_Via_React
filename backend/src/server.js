import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import {
  createAdminAuth,
  initializeAdminCredentials,
} from './services/adminAuthService.js'
import { createApp } from './app.js'
import { chatEvents } from './services/chatEvents.js'
import { createDatabase } from './config/database.js'
import { readConfig } from './config/env.js'
import { initializeDatabase } from './services/databaseService.js'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })

const config = readConfig()
const pool = createDatabase(config)
try {
  await initializeDatabase(pool)
  await initializeAdminCredentials(pool, config.bootstrapAdminPassword)
  await pool.query('SELECT 1')
} catch (error) {
  console.error(
    'Could not connect to MySQL or initialize the schema. Check backend/.env, confirm the database exists, and ensure the configured MySQL user has the required permissions.',
  )
  console.error(error.message)
  await pool.end()
  process.exit(1)
}

const auth = createAdminAuth({ pool, secureCookie: config.isProduction })
const app = createApp({ pool, events: chatEvents, auth, config })
const server = app.listen(config.port, () => {
  process.stdout.write(`Portfolio API listening on port ${config.port}\n`)
})

let shuttingDown = false
async function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
  setTimeout(() => server.closeAllConnections(), 5000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
