import { getDb } from '../config/database.js';

export async function seedDatabase() {
  const db = getDb();

  const defaultSettings = [
    ['max_required_count', '10'],
    ['max_tasks_per_user', '2'],
    ['task_timeout', '300'],
    ['improvement_timeout', '900'],
    ['min_reward', '0.01'],
    ['min_external_reward', '0.05'],
    ['exchange_points_cost', '3'],
    ['min_withdrawal', '0.1'],
    ['first_withdrawal_delay_hours', '24'],
    ['max_withdrawal_per_day', '1000'],
    ['max_withdrawal_per_week', '5000'],
    ['withdrawal_alert_threshold', '100'],
    ['dual_approval_balance_threshold', '20'],
    ['support_text_ar', 'للدعم تواصل مع @support'],
    ['support_text_en', 'For support contact @support'],
    ['support_text_ru', 'Для поддержки обратитесь к @support'],
    ['task_expiry_days', '7'],
    ['first_offense_grace_enabled', '1'],
    ['first_offense_grace_min_days', '90'],
  ];

  const insertSetting = db.prepare(
    `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`
  );
  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }

  // Default violation settings — Trust track
  const trustTypes = [
    ['trust', 'REPORT_RECEIVED',    1,  30, 'Received a confirmed report'],
    ['trust', 'SUBMISSION_REJECTED', 2, 60, 'Submission was finally rejected'],
    ['trust', 'SPAM_REPORTS',        3, 60, 'Sending spam reports'],
    ['trust', 'FAKE_TASK',           4, 90, 'Creating a fake task'],
  ];

  const securityTypes = [
    ['security', 'FRAUD_ATTEMPT',     5,  180, 'Confirmed fraud attempt'],
    ['security', 'MULTIPLE_ACCOUNTS', 10, null, 'Multiple accounts detected'],
  ];

  const insertViolationType = db.prepare(
    `INSERT OR IGNORE INTO violation_settings
       (track, type_key, points, expiry_days, description)
     VALUES (?, ?, ?, ?, ?)`
  );

  for (const row of [...trustTypes, ...securityTypes]) {
    insertViolationType.run(...row);
  }

  // Default thresholds — Trust track
  const trustThresholds = [
    ['trust', 3,  4,  'warning'],
    ['trust', 5,  7,  'forced_manual_review'],
    ['trust', 8,  10, 'daily_withdrawal_cap'],
    ['trust', 11, 14, 'task_creation_block_7d'],
    ['trust', 15, null, 'escalate_to_admin_review'],
  ];

  const securityThresholds = [
    ['security', 5,  9,  'temporary_ban_3d'],
    ['security', 10, 14, 'temporary_ban_7d'],
    ['security', 15, null, 'freeze_pending_review'],
  ];

  const insertThreshold = db.prepare(
    `INSERT OR IGNORE INTO violation_thresholds
       (track, min_points, max_points, action)
     VALUES (?, ?, ?, ?)`
  );

  for (const row of [...trustThresholds, ...securityThresholds]) {
    insertThreshold.run(...row);
  }

  // Default grace settings
  db.prepare(
    `INSERT OR IGNORE INTO violation_grace_settings
       (id, is_enabled, min_account_age_days)
     VALUES (1, 1, 90)`
  ).run();

  // Fraud detection settings (all weights/thresholds editable from admin panel)
  const fraudSettings = [
    ['fraud_freeze_threshold',      '60',  'Minimum confidence score to trigger automatic financial freeze'],
    ['fraud_time_window_minutes',   '10',  'Max minutes between two submissions to count as suspicious time gap'],
    ['fraud_weight_ip_match',       '25',  'Score weight: same external IP address'],
    ['fraud_weight_fingerprint_match', '25', 'Score weight: same device fingerprint'],
    ['fraud_weight_time_gap',       '20',  'Score weight: submissions within time window'],
    ['fraud_weight_proof_similarity','25',  'Score weight: similar/identical proof content'],
    ['fraud_weight_report_button',  '15',  'Score weight: report button was pressed by task owner/admin'],
  ];

  const insertFraud = db.prepare(
    `INSERT OR IGNORE INTO fraud_detection_settings (key, value, description) VALUES (?, ?, ?)`
  );
  for (const [key, value, description] of fraudSettings) {
    insertFraud.run(key, value, description);
  }

  console.log('[Seed] Default settings and violation config inserted.');
}
