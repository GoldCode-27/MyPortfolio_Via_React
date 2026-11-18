import bcrypt from 'bcrypt'
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000
const COOKIE_NAME = 'portfolio_admin_session'
const CREDENTIAL_ID = 1
const PASSWORD_HASH_LENGTH = 64
const BCRYPT_COST = 12
const BCRYPT_MAX_BYTES = 72

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function readCookie(request, name) {
  const cookies = request.headers.cookie || ''
  for (const part of cookies.split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return value.join('=')
  }
  return null
}

function cookieOptions(secure, maxAge = SESSION_DURATION_MS / 1000) {
  return `Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
}

async function derivePasswordHash(password, salt) {
  return scryptAsync(password, salt, PASSWORD_HASH_LENGTH)
}

function passwordMatches(candidateHash, storedHash) {
  const expectedHash = Buffer.from(storedHash, 'hex')
  return (
    candidateHash.length === expectedHash.length &&
    timingSafeEqual(candidateHash, expectedHash)
  )
}

async function createPasswordHash(password) {
  if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_BYTES) {
    throw new Error('Administrator passwords must be 72 UTF-8 bytes or fewer.')
  }
  return bcrypt.hash(password, BCRYPT_COST)
}

export async function initializeAdminCredentials(pool, bootstrapPassword) {
  const [existing] = await pool.execute(
    'SELECT id FROM admin_credentials WHERE id = ?',
    [CREDENTIAL_ID],
  )
  if (existing.length > 0) return
  if (!bootstrapPassword) {
    throw new Error(
      'No administrator password exists in MySQL. Set a unique ADMIN_PASSWORD in backend/.env once to bootstrap the admin account, then remove it from the environment.',
    )
  }
  if (
    bootstrapPassword.length < 12 ||
    Buffer.byteLength(bootstrapPassword, 'utf8') > BCRYPT_MAX_BYTES ||
    /replace_with|change_me|your_password/i.test(bootstrapPassword)
  ) {
    throw new Error(
      'ADMIN_PASSWORD must be a unique value between 12 characters and 72 UTF-8 bytes to bootstrap the admin account.',
    )
  }

  const passwordHash = await createPasswordHash(bootstrapPassword)
  await pool.execute(
    `INSERT IGNORE INTO admin_credentials (id, password_hash, password_salt, updated_at)
     VALUES (?, ?, ?, ?)`,
    [CREDENTIAL_ID, passwordHash, '', Date.now()],
  )

  const [created] = await pool.execute(
    'SELECT id FROM admin_credentials WHERE id = ?',
    [CREDENTIAL_ID],
  )
  if (created.length === 0) {
    throw new Error('Could not initialize the administrator credential in MySQL.')
  }
}

export function createAdminAuth({ pool, secureCookie }) {
  async function verifyPassword(candidate, executor = pool) {
    const [rows] = await executor.execute(
      'SELECT password_hash, password_salt FROM admin_credentials WHERE id = ?',
      [CREDENTIAL_ID],
    )
    if (rows.length === 0) {
      throw new Error('The administrator credential has not been initialized in MySQL.')
    }

    const { password_hash: storedHash, password_salt: storedSalt } = rows[0]
    if (storedHash.startsWith('$2')) {
      if (Buffer.byteLength(candidate, 'utf8') > BCRYPT_MAX_BYTES) return false
      return bcrypt.compare(candidate, storedHash)
    }

    const salt = Buffer.from(storedSalt, 'hex')
    const candidateHash = await derivePasswordHash(candidate, salt)
    const matched = passwordMatches(candidateHash, storedHash)
    if (matched && Buffer.byteLength(candidate, 'utf8') <= BCRYPT_MAX_BYTES) {
      const bcryptHash = await createPasswordHash(candidate)
      await executor.execute(
        `UPDATE admin_credentials
         SET password_hash = ?, password_salt = '', updated_at = ?
         WHERE id = ?`,
        [bcryptHash, Date.now(), CREDENTIAL_ID],
      )
    }
    return matched
  }

  async function login(candidate) {
    if (!(await verifyPassword(candidate))) return null

    const token = randomBytes(32).toString('base64url')
    const tokenHash = hashToken(token)
    const now = Date.now()
    await pool.execute('DELETE FROM admin_sessions WHERE expires_at <= ?', [now])
    await pool.execute(
      'INSERT INTO admin_sessions (token_hash, expires_at, created_at) VALUES (?, ?, ?)',
      [tokenHash, now + SESSION_DURATION_MS, now],
    )
    return token
  }

  async function changePassword({ currentPassword, newPassword, currentTokenHash }) {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      if (!(await verifyPassword(currentPassword, connection))) {
        await connection.rollback()
        return false
      }

      const passwordHash = await createPasswordHash(newPassword)
      await connection.execute(
        `UPDATE admin_credentials
         SET password_hash = ?, password_salt = ?, updated_at = ?
         WHERE id = ?`,
        [passwordHash, '', Date.now(), CREDENTIAL_ID],
      )
      await connection.execute(
        'DELETE FROM admin_sessions WHERE token_hash <> ?',
        [currentTokenHash],
      )
      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async function requireAdmin(request, response, next) {
    const token = readCookie(request, COOKIE_NAME)
    if (!token) return response.status(401).json({ error: 'Administrator sign-in is required.' })

    try {
      const tokenHash = hashToken(token)
      const [rows] = await pool.execute(
        'SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND expires_at > ?',
        [tokenHash, Date.now()],
      )
      if (rows.length === 0) {
        response.setHeader('Set-Cookie', `${COOKIE_NAME}=; ${cookieOptions(secureCookie, 0)}`)
        return response.status(401).json({ error: 'Administrator session has expired.' })
      }

      request.adminTokenHash = tokenHash
      return next()
    } catch (error) {
      return next(error)
    }
  }

  function setSessionCookie(response, token) {
    response.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; ${cookieOptions(secureCookie)}`)
  }

  function clearSessionCookie(response) {
    response.setHeader(
      'Set-Cookie',
      `${COOKIE_NAME}=; ${cookieOptions(secureCookie, 0)}`,
    )
  }

  return { login, changePassword, requireAdmin, setSessionCookie, clearSessionCookie }
}
