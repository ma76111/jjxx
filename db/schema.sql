PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL UNIQUE,
  username TEXT,
  language TEXT NOT NULL DEFAULT 'ar',
  phone_number TEXT,
  phone_verified_at TEXT,
  balance REAL NOT NULL DEFAULT 0,
  exchange_points INTEGER NOT NULL DEFAULT 0,
  is_banned INTEGER NOT NULL DEFAULT 0,
  violation_points INTEGER NOT NULL DEFAULT 0,
  last_violation_date TEXT,
  ban_status TEXT NOT NULL DEFAULT 'none',
  ban_expires_at TEXT,
  restrictions TEXT,
  notification_channel TEXT NOT NULL DEFAULT 'both',
  last_known_ip TEXT,
  country_code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_ban_status ON users(ban_status);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

-- ============================================================
-- LOGIN SESSIONS (Bot-initiated web login)
-- ============================================================
CREATE TABLE IF NOT EXISTS login_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login_token TEXT NOT NULL UNIQUE,
  telegram_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  confirmed_at TEXT,
  consumed_at TEXT,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_login_sessions_token ON login_sessions(login_token);
CREATE INDEX IF NOT EXISTS idx_login_sessions_status ON login_sessions(status);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  bot_name TEXT,
  referral_link TEXT,
  required_count INTEGER NOT NULL DEFAULT 1,
  completed_count INTEGER NOT NULL DEFAULT 0,
  task_type TEXT NOT NULL CHECK(task_type IN ('paid','exchange')),
  reward_per_user REAL NOT NULL DEFAULT 0,
  verification_instructions TEXT,
  proof_type TEXT NOT NULL DEFAULT 'images' CHECK(proof_type IN ('text','images','both')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','completed','expired','cancelled')),
  paused_at TEXT,
  country_code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);

-- ============================================================
-- TASK SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS task_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  proof_text TEXT,
  proof_images TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accept','reject')),
  reviewed_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reject_type TEXT CHECK(reject_type IN ('retry','final')),
  reject_message TEXT,
  can_retry INTEGER NOT NULL DEFAULT 0,
  improvement_deadline TEXT,
  UNIQUE(task_id, user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_id ON task_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status ON task_submissions(status);

-- ============================================================
-- DEPOSITS
-- ============================================================
CREATE TABLE IF NOT EXISTS deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('binance_pay','txid')),
  binance_id TEXT,
  txid TEXT,
  screenshot_id TEXT,
  transfer_time TEXT,
  wallet_address TEXT,
  network TEXT CHECK(network IN ('BSC','TRC20','TON')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accept','reject','pending_verification')),
  reviewed_by INTEGER,
  reviewed_at TEXT,
  reject_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_txid ON deposits(txid);

-- ============================================================
-- WITHDRAWALS
-- ============================================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL,
  binance_id TEXT,
  wallet_address TEXT,
  network TEXT CHECK(network IN ('BSC','TRC20','TON')),
  ton_address TEXT,
  screenshot_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','rejected')),
  eligible_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_by INTEGER,
  reviewed_at TEXT,
  reject_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_eligible_at ON withdrawals(eligible_at);

-- ============================================================
-- ADMINS
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL UNIQUE,
  username TEXT,
  added_by INTEGER,
  role TEXT NOT NULL DEFAULT 'secondary' CHECK(role IN ('primary','secondary')),
  permissions TEXT NOT NULL DEFAULT '["all"]',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admins_telegram_id ON admins(telegram_id);

-- ============================================================
-- ADMIN ACTION PROPOSALS (Maker-Checker)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_action_proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposer_id INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER,
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK(status IN ('pending_approval','approved','rejected')),
  approved_by INTEGER,
  approval_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  FOREIGN KEY (proposer_id) REFERENCES admins(id)
);

CREATE INDEX IF NOT EXISTS idx_proposals_status ON admin_action_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_proposer ON admin_action_proposals(proposer_id);

-- ============================================================
-- IDEMPOTENCY KEYS
-- ============================================================
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  response_snapshot TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- VIOLATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  track TEXT NOT NULL CHECK(track IN ('trust','security')),
  reason TEXT,
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','expired','pending','dismissed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_violations_user_id ON violations(user_id);
CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
CREATE INDEX IF NOT EXISTS idx_violations_track ON violations(track);

-- ============================================================
-- VIOLATION SETTINGS (dynamic, admin-controlled)
-- ============================================================
CREATE TABLE IF NOT EXISTS violation_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track TEXT NOT NULL CHECK(track IN ('trust','security')),
  type_key TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  expiry_days INTEGER,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(track, type_key)
);

CREATE TABLE IF NOT EXISTS violation_thresholds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track TEXT NOT NULL CHECK(track IN ('trust','security')),
  min_points INTEGER NOT NULL,
  max_points INTEGER,
  action TEXT NOT NULL,
  UNIQUE(track, min_points)
);

CREATE TABLE IF NOT EXISTS violation_grace_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  min_account_age_days INTEGER NOT NULL DEFAULT 90,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- RESTRICTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS restrictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  duration INTEGER,
  start_date TEXT NOT NULL DEFAULT (datetime('now')),
  end_date TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','expired','lifted')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_restrictions_user_id ON restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_restrictions_status ON restrictions(status);

-- ============================================================
-- BANS
-- ============================================================
CREATE TABLE IF NOT EXISTS bans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('temporary','permanent')),
  duration INTEGER,
  reason TEXT NOT NULL,
  banned_by INTEGER NOT NULL,
  start_date TEXT NOT NULL DEFAULT (datetime('now')),
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','expired','lifted')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bans_user_id ON bans(user_id);
CREATE INDEX IF NOT EXISTS idx_bans_status ON bans(status);

-- ============================================================
-- APPEALS
-- ============================================================
CREATE TABLE IF NOT EXISTS appeals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  ban_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  reviewed_by INTEGER,
  review_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ban_id) REFERENCES bans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appeals_user_id ON appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);

-- ============================================================
-- RATINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  rater_user_id INTEGER NOT NULL,
  rated_user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(task_id, rater_user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (rater_user_id) REFERENCES users(id),
  FOREIGN KEY (rated_user_id) REFERENCES users(id)
);

-- ============================================================
-- BROADCASTS
-- ============================================================
CREATE TABLE IF NOT EXISTS broadcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('all','active','banned')),
  target_ids TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','completed','failed')),
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL,
  reported_user_id INTEGER NOT NULL,
  task_id INTEGER,
  submission_id INTEGER,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','dismissed')),
  reviewed_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(reporter_id, reported_user_id, submission_id),
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  FOREIGN KEY (reported_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ============================================================
-- HIDDEN TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS hidden_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  UNIQUE(user_id, task_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ============================================================
-- NOTIFICATION PREFS
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id INTEGER PRIMARY KEY,
  submission_accepted INTEGER NOT NULL DEFAULT 1,
  submission_rejected INTEGER NOT NULL DEFAULT 1,
  task_completed INTEGER NOT NULL DEFAULT 1,
  promotional INTEGER NOT NULL DEFAULT 1,
  system_update INTEGER NOT NULL DEFAULT 1,
  ticket_reply INTEGER NOT NULL DEFAULT 1,
  deposit_completed INTEGER NOT NULL DEFAULT 1,
  withdrawal_completed INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_no TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','closed')),
  assigned_to INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- ============================================================
-- TICKET MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);

-- ============================================================
-- DEVICE LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS device_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  fingerprint TEXT,
  country_code TEXT,
  session_type TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_device_logs_user_id ON device_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_device_logs_fingerprint ON device_logs(fingerprint);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);

-- ============================================================
-- TASK AUDIT
-- ============================================================
CREATE TABLE IF NOT EXISTS task_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  changed_by INTEGER NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================================
-- REFERRAL CREDITS
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_credits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  earned_credits INTEGER NOT NULL DEFAULT 0,
  used_credits INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- ============================================================
-- BALANCE HISTORY (for chart)
-- ============================================================
CREATE TABLE IF NOT EXISTS balance_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  balance REAL NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_balance_history_user_id ON balance_history(user_id);

-- ============================================================
-- ANTI-FRAUD: Terms acceptance tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS anti_fraud_accepted (
  user_id INTEGER PRIMARY KEY,
  accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- ANTI-FRAUD: Cross-account task execution log
-- Tracks which fingerprints have executed which tasks
-- to block duplicate execution from linked accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS fraud_task_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,
  ip_address TEXT,
  executed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(task_id, fingerprint),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fraud_task_log_fingerprint ON fraud_task_log(fingerprint);
CREATE INDEX IF NOT EXISTS idx_fraud_task_log_task_id ON fraud_task_log(task_id);

-- ============================================================
-- DUPLICATE PROOF REPORTS (Fraud Detection)
-- ============================================================
CREATE TABLE IF NOT EXISTS duplicate_proof_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  submission_a_id INTEGER NOT NULL,
  submission_b_id INTEGER NOT NULL,
  user_a_id INTEGER NOT NULL,
  user_b_id INTEGER NOT NULL,
  reported_by INTEGER NOT NULL,
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
  penalized_user_id INTEGER,
  admin_decision_note TEXT,
  reviewed_by INTEGER,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (submission_a_id) REFERENCES task_submissions(id),
  FOREIGN KEY (submission_b_id) REFERENCES task_submissions(id),
  FOREIGN KEY (user_a_id) REFERENCES users(id),
  FOREIGN KEY (user_b_id) REFERENCES users(id),
  FOREIGN KEY (reported_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_dpr_status ON duplicate_proof_reports(status);
CREATE INDEX IF NOT EXISTS idx_dpr_users ON duplicate_proof_reports(user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS idx_dpr_task ON duplicate_proof_reports(task_id);

-- ============================================================
-- FRAUD DETECTION SETTINGS (admin-editable, no code changes needed)
-- ============================================================
CREATE TABLE IF NOT EXISTS fraud_detection_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
