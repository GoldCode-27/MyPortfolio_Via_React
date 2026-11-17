import { readFile } from 'node:fs/promises'

export async function initializeDatabase(pool) {
  const schema = await readFile(new URL('../../schema.sql', import.meta.url), 'utf8')
  const statements = schema.split(';').map((statement) => statement.trim()).filter(Boolean)

  for (const statement of statements) {
    await pool.query(statement)
  }
}
