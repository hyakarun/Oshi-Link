-- Admin moderation & sessions
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE groups ADD COLUMN status TEXT DEFAULT 'active';

CREATE TABLE admin_sessions (
  token TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
