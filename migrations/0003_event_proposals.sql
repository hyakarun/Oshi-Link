-- 予定の修正提案テーブル
CREATE TABLE IF NOT EXISTS event_proposals (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  address TEXT,
  latitude REAL,
  longitude REAL,
  source_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 提案への投票テーブル
CREATE TABLE IF NOT EXISTS proposal_votes (
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  proposal_id TEXT, -- NULL の場合は「現状維持」への投票とする
  voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_proposals_event ON event_proposals(event_id);
