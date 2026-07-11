import { dbGet, dbAll, dbRun } from '../config/database.js';
import { addViolation } from './violationService.js';
import { logger } from '../utils/logger.js';

const REPORT_THRESHOLD = 5;
const SPAM_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const SPAM_THRESHOLD = 5;

export async function submitReport({ reporterId, reportedUserId, taskId, submissionId, reason }) {
  if (reporterId === reportedUserId) return { error: 'report_own' };

  // Check duplicate
  const existing = await dbGet(
    'SELECT id FROM reports WHERE reporter_id = ? AND reported_user_id = ? AND submission_id IS ?',
    [reporterId, reportedUserId, submissionId || null]
  );
  if (existing) return { error: 'duplicate_report' };

  // Check spam — reporter sending too many reports in 5 minutes
  const spamWindow = new Date(Date.now() - SPAM_WINDOW_MS).toISOString();
  const recentReports = await dbGet(
    "SELECT COUNT(*) as c FROM reports WHERE reporter_id = ? AND created_at >= ?",
    [reporterId, spamWindow]
  );
  if (recentReports.c >= SPAM_THRESHOLD) {
    await addViolation(reporterId, 'SPAM_REPORTS', 'trust', 'Sending spam reports');
    return { error: 'spam_reports' };
  }

  await dbRun(
    `INSERT INTO reports (reporter_id, reported_user_id, task_id, submission_id, reason)
     VALUES (?, ?, ?, ?, ?)`,
    [reporterId, reportedUserId, taskId || null, submissionId || null, reason]
  );

  // Check if reported user has reached the report threshold from different reporters
  const distinctReporters = await dbGet(
    `SELECT COUNT(DISTINCT reporter_id) as c FROM reports
     WHERE reported_user_id = ? AND status = 'pending'`,
    [reportedUserId]
  );

  if (distinctReporters.c >= REPORT_THRESHOLD) {
    // Add pending REPORT_RECEIVED violation (needs admin confirmation to activate)
    await addViolation(reportedUserId, 'REPORT_RECEIVED', 'trust', `${REPORT_THRESHOLD}+ reports from different users`);
    logger.info('[Report] Threshold reached, pending violation added:', { reportedUserId });
  }

  return { success: true };
}

export async function getPendingReports(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll(
      `SELECT r.*, u1.username as reporter_name, u2.username as reported_name
       FROM reports r
       JOIN users u1 ON r.reporter_id = u1.id
       JOIN users u2 ON r.reported_user_id = u2.id
       WHERE r.status = 'pending'
       ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    ),
    dbGet("SELECT COUNT(*) as c FROM reports WHERE status = 'pending'"),
  ]);
  return { rows, total: total.c };
}

export async function confirmReport(reportId, adminId) {
  const report = await dbGet('SELECT * FROM reports WHERE id = ?', [reportId]);
  if (!report) return { error: 'not_found' };

  await dbRun(
    "UPDATE reports SET status = 'confirmed', reviewed_by = ? WHERE id = ?",
    [adminId, reportId]
  );
  return { success: true };
}

export async function dismissReport(reportId, adminId) {
  await dbRun(
    "UPDATE reports SET status = 'dismissed', reviewed_by = ? WHERE id = ?",
    [adminId, reportId]
  );
  return { success: true };
}
