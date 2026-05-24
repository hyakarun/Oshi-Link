-- Migration: add_notification_settings_to_users
ALTER TABLE users ADD COLUMN notifications_enabled INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN email_enabled INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN push_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN notification_timing INTEGER DEFAULT 30;
