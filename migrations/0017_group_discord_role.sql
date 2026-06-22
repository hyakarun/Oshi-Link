-- カレンダー（groups）と Discord 通知ロール（フォローボタン）の紐付け
ALTER TABLE groups ADD COLUMN discord_role_id TEXT;
