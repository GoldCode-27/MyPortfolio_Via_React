import assert from 'node:assert/strict'
import { scryptSync } from 'node:crypto'
import { test } from 'node:test'
import bcrypt from 'bcrypt'
import {
  createAdminAuth,
  initializeAdminCredentials,
} from '../src/services/adminAuthService.js'

function createPool(initialCredential = null) {
  let credential = initialCredential
  const statements = []
  return {
    statements,
    async execute(statement, parameters = []) {
      statements.push(statement)
      if (statement.startsWith('SELECT id FROM admin_credentials')) {
        return [credential ? [{ id: 1 }] : []]
      }
      if (statement.startsWith('SELECT password_hash, password_salt')) {
        return [credential ? [credential] : []]
      }
      if (statement.startsWith('INSERT IGNORE INTO admin_credentials')) {
        if (!credential) {
          credential = {
            password_hash: parameters[1],
            password_salt: parameters[2],
          }
        }
        return [{ affectedRows: 1 }]
      }
      if (statement.startsWith('UPDATE admin_credentials')) {
        credential = {
          password_hash: parameters[0],
          password_salt: '',
        }
        return [{ affectedRows: 1 }]
      }
      if (statement.startsWith('INSERT INTO admin_sessions')) {
        return [{ affectedRows: 1 }]
      }
      return [{ affectedRows: 1 }]
    },
    get credential() {
      return credential
    },
  }
}

test('bootstraps the MySQL credential using bcrypt without storing plaintext', async () => {
  const pool = createPool()
  const password = 'a-unique-admin-password'
  await initializeAdminCredentials(pool, password)

  assert.notEqual(pool.credential.password_hash, password)
  assert.match(pool.credential.password_hash, /^\$2[aby]\$/)
  assert.equal(await bcrypt.compare(password, pool.credential.password_hash), true)
  assert.equal(pool.credential.password_salt, '')

  const auth = createAdminAuth({ pool, secureCookie: false })
  assert.ok(await auth.login(password))
  assert.equal(await auth.login('not-the-admin-password'), null)
})

test('upgrades a valid legacy scrypt hash to bcrypt at successful login', async () => {
  const password = 'legacy-admin-password'
  const salt = Buffer.from('00112233445566778899aabbccddeeff', 'hex')
  const initialCredential = {
    password_hash: scryptSync(password, salt, 64).toString('hex'),
    password_salt: salt.toString('hex'),
  }
  const pool = createPool(initialCredential)
  const auth = createAdminAuth({ pool, secureCookie: false })

  assert.ok(await auth.login(password))
  assert.match(pool.credential.password_hash, /^\$2[aby]\$/)
  assert.equal(pool.credential.password_salt, '')
  assert.equal(await bcrypt.compare(password, pool.credential.password_hash), true)
})

test('rejects bootstrap passwords that exceed bcrypt byte limits', async () => {
  const pool = createPool()
  await assert.rejects(
    initializeAdminCredentials(pool, `${'a'.repeat(71)}é`),
    /72 UTF-8 bytes/,
  )
})
