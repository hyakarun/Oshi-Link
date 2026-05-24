-- Migration: add_avatar_url_to_users
ALTER TABLE users ADD COLUMN avatar_url TEXT;
