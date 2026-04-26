-- patch_mvp.sql
-- 1. eventsテーブルに投票数と暫定フラグを追加
ALTER TABLE events ADD COLUMN is_tentative INTEGER DEFAULT 1;
ALTER TABLE events ADD COLUMN confirms_count INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN disputes_count INTEGER DEFAULT 0;

-- 2. verificationsテーブルに一意制約を追加（重複投票防止）
-- SQLiteでは直接制約を追加できない場合があるため、既存データを消してユニークインデックスを作成
DELETE FROM verifications;
CREATE UNIQUE INDEX IF NOT EXISTS idx_verifications_user_event ON verifications(user_id, event_id);

-- 3. 既存のeventsを暫定状態に
UPDATE events SET is_tentative = 1;
