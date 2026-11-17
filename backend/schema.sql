CREATE TABLE IF NOT EXISTS chat_sessions (
  session_id VARCHAR(80) NOT NULL PRIMARY KEY,
  visitor_name VARCHAR(100) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  last_message_id BIGINT UNSIGNED NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(80) NOT NULL,
  sender ENUM('visitor', 'admin') NOT NULL,
  name VARCHAR(100) NULL,
  text VARCHAR(5000) NOT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  INDEX idx_chat_messages_session_id_id (session_id, id),
  CONSTRAINT fk_chat_messages_session
    FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  expires_at BIGINT UNSIGNED NOT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  INDEX idx_admin_sessions_expires_at (expires_at)
);

CREATE TABLE IF NOT EXISTS admin_credentials (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  password_hash CHAR(128) NOT NULL,
  password_salt CHAR(32) NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  email_status ENUM('not_configured', 'pending', 'sent', 'failed') NOT NULL,
  email_error VARCHAR(500) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  INDEX idx_contact_submissions_created_at (created_at)
);
