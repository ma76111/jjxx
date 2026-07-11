import { dbGet, dbAll, dbRun } from '../config/database.js';
import { evaluateDuplicateProofReport, dismissReport, penalizeReport, getFraudDetectionSettings, updateFraudDetectionSettings } from '../../../services/fraudDetectionService.js';

// ─── User endpoint: report a duplicate submission ─────────────────────────────

export async function reportDuplicate(req, res) {
  const userId = req.user.id;
  const submissionAId = parseInt(req.params.submissionId);
  const { suspected_duplicate_submission_id, note } = req.body;

  if (!suspected_duplicate_submission_id) {
    return res.status(400).json({ success: false, error: 'missing_suspected_duplicate_submission_id' });
  }

  const submissionBId = parseInt(suspected_duplicate_submission_id);
  if (submissionAId === submissionBId) {
    return res.status(400).json({ success: false, error: 'same_submission' });
  }

  // Load both submissions
  const [subA, subB] = await Promise.all([
    dbGet('SELECT * FROM task_submissions WHERE id = ?', [submissionAId]),
    dbGet('SELECT * FROM task_submissions WHERE id = ?', [submissionBId]),
  ]);

  if (!subA || !subB) {
    return res.status(404).json({ success: false, error: 'submission_not_found' });
  }

  // Both must be for the same task
  if (subA.task_id !== subB.task_id) {
    return res.status(400).json({ success: false, error: 'submissions_different_tasks' });
  }

  // Users must be different
  if (subA.user_id === subB.user_id) {
    return res.status(400).json({ success: false, error: 'same_user' });
  }

  const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [subA.task_id]);
  if (!task) return res.status(404).json({ success: false, error: 'task_not_found' });

  // Only task owner or admin can report
  const isAdmin = req.isMainAdmin || !!req.adminRecord;
  if (task.owner_id !== userId && !isAdmin) {
    return res.status(403).json({ success: false, error: 'only_task_owner_or_admin' });
  }

  // Check for existing report between these two submissions
  const existing = await dbGet(
    `SELECT id FROM duplicate_proof_reports
     WHERE task_id = ?
       AND ((submission_a_id = ? AND submission_b_id = ?) OR (submission_a_id = ? AND submission_b_id = ?))`,
    [subA.task_id, submissionAId, submissionBId, submissionBId, submissionAId]
  );
  if (existing) {
    return res.status(409).json({ success: false, error: 'report_already_exists', report_id: existing.id });
  }

  const reporter = await dbGet('SELECT id FROM users WHERE id = ?', [userId]);

  const result = await dbRun(
    `INSERT INTO duplicate_proof_reports
       (task_id, submission_a_id, submission_b_id, user_a_id, user_b_id, reported_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [subA.task_id, submissionAId, submissionBId, subA.user_id, subB.user_id, reporter.id]
  );

  const reportId = result.lastID;

  // Fire evaluation async — don't block the response
  setImmediate(() => evaluateDuplicateProofReport(reportId).catch(err => {
    console.error('[reportDuplicate] Evaluation error:', err.message);
  }));

  return res.status(202).json({ success: true, report_id: reportId, status: 'under_evaluation' });
}

// ─── Admin endpoints ──────────────────────────────────────────────────────────

export async function getDuplicateProofReports(req, res) {
  const status = req.query.status || null;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT r.*,
      ua.telegram_id as user_a_telegram_id, ua.username as user_a_username,
      ub.telegram_id as user_b_telegram_id, ub.username as user_b_username,
      rep.telegram_id as reporter_telegram_id, rep.username as reporter_username
    FROM duplicate_proof_reports r
    LEFT JOIN users ua ON r.user_a_id = ua.id
    LEFT JOIN users ub ON r.user_b_id = ub.id
    LEFT JOIN users rep ON r.reported_by = rep.id
  `;
  const params = [];

  if (status) {
    sql += ' WHERE r.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows, totalRow] = await Promise.all([
    dbAll(sql, params),
    dbGet(`SELECT COUNT(*) as c FROM duplicate_proof_reports${status ? ' WHERE status = ?' : ''}`, status ? [status] : []),
  ]);

  return res.json({ reports: rows, total: totalRow.c, page, limit });
}

export async function getDuplicateProofReport(req, res) {
  const reportId = parseInt(req.params.id);

  const report = await dbGet(`
    SELECT r.*,
      ua.telegram_id as user_a_telegram_id, ua.username as user_a_username,
      ub.telegram_id as user_b_telegram_id, ub.username as user_b_username,
      sa.proof_text as sub_a_text, sa.proof_images as sub_a_images, sa.created_at as sub_a_created_at,
      sb.proof_text as sub_b_text, sb.proof_images as sub_b_images, sb.created_at as sub_b_created_at
    FROM duplicate_proof_reports r
    LEFT JOIN users ua ON r.user_a_id = ua.id
    LEFT JOIN users ub ON r.user_b_id = ub.id
    LEFT JOIN task_submissions sa ON r.submission_a_id = sa.id
    LEFT JOIN task_submissions sb ON r.submission_b_id = sb.id
    WHERE r.id = ?
  `, [reportId]);

  if (!report) return res.status(404).json({ success: false, error: 'not_found' });

  // Parse evidence_breakdown JSON
  let evidenceBreakdown = {};
  try {
    evidenceBreakdown = report.evidence_breakdown ? JSON.parse(report.evidence_breakdown) : {};
  } catch {}

  return res.json({
    ...report,
    evidence_breakdown: evidenceBreakdown,
    user_a: { id: report.user_a_id, telegram_id: report.user_a_telegram_id, username: report.user_a_username },
    user_b: { id: report.user_b_id, telegram_id: report.user_b_telegram_id, username: report.user_b_username },
    submission_a: { proof_text: report.sub_a_text, proof_images: report.sub_a_images, created_at: report.sub_a_created_at },
    submission_b: { proof_text: report.sub_b_text, proof_images: report.sub_b_images, created_at: report.sub_b_created_at },
  });
}

export async function dismissDuplicateProofReport(req, res) {
  const reportId = parseInt(req.params.id);
  const adminTelegramId = req.user.telegram_id;

  const result = await dismissReport(reportId, adminTelegramId);
  if (result.error) {
    return res.status(result.error === 'not_found' ? 404 : 400).json({ success: false, error: result.error });
  }

  return res.json({ success: true, report_id: reportId, status: 'dismissed', unfrozen: true });
}

export async function penalizeDuplicateProofReport(req, res) {
  const reportId = parseInt(req.params.id);
  const adminTelegramId = req.user.telegram_id;
  const { target, action, duration_days, note } = req.body;

  const validTargets = ['user_a', 'user_b', 'both'];
  const validActions = ['warning', 'temp_ban', 'permanent_ban', 'forfeit_reward'];

  if (!validTargets.includes(target)) {
    return res.status(400).json({ success: false, error: 'invalid_target' });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({ success: false, error: 'invalid_action' });
  }

  const result = await penalizeReport(reportId, adminTelegramId, target, action, duration_days, note);
  if (result.error) {
    return res.status(result.error === 'not_found' ? 404 : 400).json({ success: false, error: result.error });
  }

  const report = await dbGet('SELECT status FROM duplicate_proof_reports WHERE id = ?', [reportId]);
  return res.json({ success: true, report_id: reportId, status: report.status });
}

// ─── Fraud detection settings (admin) ────────────────────────────────────────

export async function getFraudSettings(req, res) {
  const settings = await getFraudDetectionSettings();
  return res.json({ settings });
}

export async function updateFraudSettings(req, res) {
  const { updates } = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ success: false, error: 'invalid_body' });
  }

  const allowedKeys = [
    'fraud_freeze_threshold',
    'fraud_time_window_minutes',
    'fraud_weight_ip_match',
    'fraud_weight_fingerprint_match',
    'fraud_weight_time_gap',
    'fraud_weight_proof_similarity',
    'fraud_weight_report_button',
  ];

  const filtered = {};
  for (const [k, v] of Object.entries(updates)) {
    if (allowedKeys.includes(k)) filtered[k] = v;
  }

  if (Object.keys(filtered).length === 0) {
    return res.status(400).json({ success: false, error: 'no_valid_keys' });
  }

  await updateFraudDetectionSettings(filtered);
  return res.json({ success: true });
}
