-- マイグレーション: eventsテーブルに緯度・経度・住所カラムを追加
ALTER TABLE events ADD COLUMN latitude REAL;
ALTER TABLE events ADD COLUMN longitude REAL;
ALTER TABLE events ADD COLUMN address TEXT;
