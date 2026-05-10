-- schema.sql
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS proposal_votes;
DROP TABLE IF EXISTS event_proposals;
DROP TABLE IF EXISTS verifications;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS user_group_follows;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS magic_links;
DROP TABLE IF EXISTS sessions;
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  google_id TEXT UNIQUE, -- Googleアカウントの識別子
  role TEXT DEFAULT 'user',
  premium_status TEXT DEFAULT 'free',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  end_time TEXT,
  description TEXT,
  map_link TEXT,
  image_url TEXT,
  source_url TEXT,
  ticket_url TEXT,
  added_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (added_by) REFERENCES users(id)
);

CREATE TABLE verifications (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  verification_status TEXT NOT NULL, -- 'verified', 'disputed'
  source_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  stripe_customer_id TEXT,
  status TEXT NOT NULL,
  plan_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE user_group_follows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  custom_bg_image TEXT,
  custom_theme_color TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (group_id) REFERENCES groups(id),
  UNIQUE(user_id, group_id)
);

-- Magic Link 認証用テーブル
CREATE TABLE magic_links (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- セッション管理テーブル
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- イベント修正提案テーブル
CREATE TABLE event_proposals (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 提案への投票テーブル
CREATE TABLE proposal_votes (
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  proposal_id TEXT, -- NULL の場合は「現状維持」への投票とする
  voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

