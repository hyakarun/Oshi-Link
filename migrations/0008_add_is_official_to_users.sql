-- Migration: add_is_official_to_users
ALTER TABLE users ADD COLUMN is_official INTEGER DEFAULT 0;
