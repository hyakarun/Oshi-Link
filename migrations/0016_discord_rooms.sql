-- カレンダー（groups）と Discord 部屋（channel）の 1:1 紐付け
ALTER TABLE groups ADD COLUMN discord_channel_id TEXT;

-- 新規イベントを Discord 部屋へ投稿済みか
ALTER TABLE events ADD COLUMN discord_posted INTEGER DEFAULT 0;

-- 既存イベントは投稿対象外にする（過去分の一斉投稿を防ぐ）
UPDATE events SET discord_posted = 1;
