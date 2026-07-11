-- Migration 002: Duplicate Proof Reports + Fraud Detection Settings

CREATE TABLE IF NOT EXISTS duplicate_proof_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  submission_a_id INTEGER NOT NULL REFERENCES task_submissions(id),
  submission_b_id INTEGER NOT NULL REFERENCES task_submissions(id),
  user_a_id INTEGER NOT NULL REFERENCES users(id),
  user_b_id INTEGER NOT NULL REFERENCES users(id),
  reported_by INTEGER NOT NULL REFERENCES users(id),
  ip_a TEXT,
  ip_b TEXT,
  ip_source_a TEXT CHECK(ip_source_a IN ('live_web_request','last_known_web_session','unavailable')),
  ip_source_b TEXT CHECK(ip_source_b IN ('live_web_request','last_known_web_session','unavailable')),
  fingerprint_a TEXT,
  fingerprint_b TEXT,
  time_gap_seconds INTEGER,
  proof_similarity_score REAL,
  evidence_breakdown TEXT,
  confidence_score INTEGER NOT NULL DEFAULT 0,
  auto_frozen INTEGER DEFAULT 0,
  status TEXT DEFAULT 'under_evaluation'
    CHECK(status IN ('under_evaluation','pending_admin_decision','dismissed','confirmed_fraud_both','confirmed_fraud_single')),
  penalized_user_id INTEGER REFERENCES users(id),
  admin_decision_note TEXT,
  reviewed_by INTEGER REFERENCES admins(id),
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dpr_status ON duplicate_proof_reports(status);
CREATE INDEX IF NOT EXISTS idx_dpr_users ON duplicate_proof_reports(user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS idx_dpr_task ON duplicate_proof_reports(task_id);

-- Fraud detection settings table (separate from general settings for clean architecture)
CREATE TABLE IF NOT EXISTS fraud_detection_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
