-- フォーラム移行: 既存のテキストチャンネル紐付けをリセットし、
-- カレンダー用フォーラム内のスレッドとして作り直す対象にする。
-- discord_role_id は @メンション通知に再利用するため保持する。
-- ※実行後、次回 cron で各カレンダーのスレッドが順次作成される。
--   古いテキストチャンネルは自動削除されないため、必要なら手動で削除する。
UPDATE groups SET discord_channel_id = NULL WHERE discord_channel_id IS NOT NULL;
