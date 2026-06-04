CREATE TABLE official_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  calendar_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_official_applications_status ON official_applications(status);
CREATE INDEX idx_official_applications_user_id ON official_applications(user_id);
