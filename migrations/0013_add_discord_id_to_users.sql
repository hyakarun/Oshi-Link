-- Discord を共通IDとして統合するためのカラム
ALTER TABLE users ADD COLUMN discord_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_discord_id
  ON users(discord_id) WHERE discord_id IS NOT NULL;
