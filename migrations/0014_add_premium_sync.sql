-- Whop→Discordロール連動で会員状態を同期した時刻（スロットリング用）
ALTER TABLE users ADD COLUMN premium_synced_at TEXT;
