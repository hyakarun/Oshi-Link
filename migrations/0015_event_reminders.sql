-- Discord通知の重複送信防止（ユーザー×イベントで1回）
CREATE TABLE IF NOT EXISTS event_reminders (
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, event_id)
);
