function toMessage(row) {
  return {
    key: String(row.id),
    sender: row.sender,
    name: row.name || null,
    text: row.text,
    timestamp: Number(row.created_at),
  }
}

export function createChatService(pool) {
  async function loadMessages(sessionId, limit = 100) {
    const [rows] = await pool.execute(
      `SELECT id, sender, name, text, created_at
       FROM chat_messages
       WHERE session_id = ?
       ORDER BY id DESC
       LIMIT ?`,
      [sessionId, limit],
    )
    return rows.reverse().map(toMessage)
  }

  async function saveMessage({ sessionId, sender, name, text, timestamp }) {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      if (sender === 'admin') {
        const [sessions] = await connection.execute(
          'SELECT session_id FROM chat_sessions WHERE session_id = ? FOR UPDATE',
          [sessionId],
        )
        if (sessions.length === 0) {
          await connection.rollback()
          return null
        }
      } else {
        await connection.execute(
          `INSERT INTO chat_sessions (session_id, visitor_name, created_at, updated_at)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             visitor_name = COALESCE(VALUES(visitor_name), visitor_name),
             updated_at = VALUES(updated_at)`,
          [sessionId, name, timestamp, timestamp],
        )
      }

      const [result] = await connection.execute(
        'INSERT INTO chat_messages (session_id, sender, name, text, created_at) VALUES (?, ?, ?, ?, ?)',
        [sessionId, sender, name, text, timestamp],
      )
      await connection.execute(
        'UPDATE chat_sessions SET last_message_id = ?, updated_at = ? WHERE session_id = ?',
        [result.insertId, timestamp, sessionId],
      )
      await connection.commit()

      return { key: String(result.insertId), sender, name, text, timestamp }
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async function listConversations() {
    const [rows] = await pool.query(
      `SELECT s.session_id AS sessionId,
              COALESCE(s.visitor_name, 'Guest Visitor') AS name,
              COALESCE(m.text, '') AS lastMessage,
              COALESCE(m.created_at, 0) AS lastTimestamp
       FROM chat_sessions s
       LEFT JOIN chat_messages m ON m.id = s.last_message_id
       ORDER BY s.updated_at DESC`,
    )
    return rows.map((row) => ({ ...row, lastTimestamp: Number(row.lastTimestamp) }))
  }

  async function saveProfile(sessionId, name, timestamp) {
    await pool.execute(
      `INSERT INTO chat_sessions (session_id, visitor_name, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE visitor_name = VALUES(visitor_name), updated_at = VALUES(updated_at)`,
      [sessionId, name, timestamp, timestamp],
    )
  }

  async function createContactSubmission({
    name,
    email,
    subject,
    message,
    emailStatus,
    timestamp,
  }) {
    const [result] = await pool.execute(
      `INSERT INTO contact_submissions
        (name, email, subject, message, email_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, subject, message, emailStatus, timestamp],
    )
    return {
      id: String(result.insertId),
      name,
      email,
      subject,
      message,
      emailStatus,
      createdAt: timestamp,
    }
  }

  async function updateContactEmailStatus(id, emailStatus, emailError) {
    await pool.execute(
      `UPDATE contact_submissions
       SET email_status = ?, email_error = ?
       WHERE id = ?`,
      [emailStatus, emailError, id],
    )
  }

  async function listContactSubmissions() {
    const [rows] = await pool.query(
      `SELECT id, name, email, subject, message,
              email_status AS emailStatus, email_error AS emailError, created_at AS createdAt
       FROM contact_submissions
       ORDER BY created_at DESC
       LIMIT 500`,
    )
    return rows.map((row) => ({
      ...row,
      id: String(row.id),
      createdAt: Number(row.createdAt),
    }))
  }

  return {
    loadMessages,
    saveMessage,
    listConversations,
    saveProfile,
    createContactSubmission,
    updateContactEmailStatus,
    listContactSubmissions,
  }
}
