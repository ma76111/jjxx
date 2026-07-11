import { dbGet, dbAll, dbRun } from '../config/database.js';
import dotenv from 'dotenv';
dotenv.config();

const MAIN_ADMIN_ID = Number(process.env.MAIN_ADMIN_ID) || 0;

// ---- Stats ----
export async function getStats(req, res) {
  const [users, activeTasks, pendingDeps, pendingWdw, pendingSubs, openTickets, pendingAppeals,
    totalBalance, totalDeposited, totalWithdrawn] = await Promise.all([
    dbGet('SELECT COUNT(*) as c FROM users'),
    dbGet("SELECT COUNT(*) as c FROM tasks WHERE status = 'active'"),
    dbGet("SELECT COUNT(*) as c FROM deposits WHERE status IN ('pending','pending_verification')"),
    dbGet("SELECT COUNT(*) as c FROM withdrawals WHERE status = 'pending' AND eligible_at <= datetime('now')"),
    dbGet("SELECT COUNT(*) as c FROM task_submissions WHERE status = 'pending'"),
    dbGet("SELECT COUNT(*) as c FROM tickets WHERE status != 'closed'"),
    dbGet("SELECT COUNT(*) as c FROM appeals WHERE status = 'pending'"),
    dbGet('SELECT COALESCE(SUM(balance),0) as t FROM users'),
    dbGet("SELECT COALESCE(SUM(amount),0) as t FROM deposits WHERE status = 'accept'"),
    dbGet("SELECT COALESCE(SUM(amount),0) as t FROM withdrawals WHERE status = 'completed'"),
  ]);
  return res.json({
    total_users: users.c, active_tasks: activeTasks.c,
    pending_deposits: pendingDeps.c, pending_withdrawals: pendingWdw.c,
    pending_submissions: pendingSubs.c, open_tickets: openTickets.c,
    pending_appeals: pendingAppeals.c,
    total_balance_held: totalBalance.t, total_deposited: totalDeposited.t, total_withdrawn: totalWithdrawn.t,
  });
}

// ---- Users ----
export async function searchUsers(req, res) {
  const q = req.query.q || '';
  const byId = await dbGet('SELECT * FROM users WHERE id = ?', [parseInt(q) || 0]);
  if (byId) return res.json({ users: [byId] });
  const rows = await dbAll("SELECT * FROM users WHERE username LIKE ? LIMIT 20", [`%${q}%`]);
  return res.json({ users: rows });
}

export async function getUserViolations(req, res) {
  const userId = parseInt(req.params.id);
  const rows = await dbAll('SELECT * FROM violations WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return res.json({ violations: rows });
}

export async function adjustBalance(req, res) {
  const userId = parseInt(req.params.id);
  const { amount, direction, reason } = req.body;
  if (!amount || !direction) return res.status(400).json({ success: false, error: 'missing_fields' });

  const threshold = await dbGet("SELECT value FROM settings WHERE key = 'dual_approval_balance_threshold'");
  const dualThreshold = parseFloat(threshold?.value || '20');

  if (amount > dualThreshold) {
    // Must go through Maker-Checker
    const adminRow = await dbGet('SELECT id FROM admins WHERE telegram_id = ?', [req.user.telegram_id]);
    const adminId = adminRow?.id || 0;
    const result = await dbRun(
      `INSERT INTO admin_action_proposals (proposer_id, action_type, target_type, target_id, payload)
       VALUES (?, 'adjust_balance', 'user', ?, ?)`,
      [adminId, userId, JSON.stringify({ amount, direction, reason })]
    );
    return res.status(202).json({ success: true, requires_approval: true, proposal_id: result.lastID });
  }

  const delta = direction === 'add' ? amount : -amount;
  await dbRun('UPDATE users SET balance = MAX(0, balance + ?) WHERE id = ?', [delta, userId]);
  await dbRun('INSERT INTO balance_history (user_id, balance) SELECT ?, balance FROM users WHERE id = ?', [userId, userId]);
  const user = await dbGet('SELECT balance FROM users WHERE id = ?', [userId]);
  return res.json({ success: true, new_balance: user.balance });
}

export async function adjustPoints(req, res) {
  const userId = parseInt(req.params.id);
  const { amount, direction } = req.body;
  if (!amount || !direction) return res.status(400).json({ success: false, error: 'missing_fields' });
  const delta = direction === 'add' ? amount : -amount;
  await dbRun('UPDATE users SET exchange_points = MAX(0, exchange_points + ?) WHERE id = ?', [delta, userId]);
  const user = await dbGet('SELECT exchange_points FROM users WHERE id = ?', [userId]);
  return res.json({ success: true, new_points: user.exchange_points });
}

export async function banUser(req, res) {
  const userId = parseInt(req.params.id);
  const { type, duration_days, reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, error: 'reason_required' });

  const endDate = type === 'temporary' && duration_days
    ? new Date(Date.now() + duration_days * 86400000).toISOString() : null;

  const result = await dbRun(
    'INSERT INTO bans (user_id, type, duration, reason, banned_by, end_date) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, type || 'temporary', duration_days || null, reason, req.user.id, endDate]
  );
  await dbRun(
    'UPDATE users SET is_banned = 1, ban_status = ?, ban_expires_at = ? WHERE id = ?',
    [type || 'temporary', endDate, userId]
  );
  return res.json({ success: true, ban_id: result.lastID, user: await dbGet('SELECT id, ban_status, ban_expires_at FROM users WHERE id = ?', [userId]) });
}

export async function unbanUser(req, res) {
  const userId = parseInt(req.params.id);
  await dbRun("UPDATE bans SET status = 'lifted' WHERE user_id = ? AND status = 'active'", [userId]);
  await dbRun('UPDATE users SET is_banned = 0, ban_status = ?, ban_expires_at = NULL WHERE id = ?', ['none', userId]);
  return res.json({ success: true });
}

// ---- Deposits ----
export async function getPendingDeposits(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20, offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll(`SELECT d.*, u.username, u.telegram_id FROM deposits d JOIN users u ON d.user_id = u.id
           WHERE d.status IN ('pending','pending_verification') ORDER BY d.created_at ASC LIMIT ? OFFSET ?`, [limit, offset]),
    dbGet("SELECT COUNT(*) as c FROM deposits WHERE status IN ('pending','pending_verification')"),
  ]);
  return res.json({ deposits: rows, total: total.c, page });
}

export async function acceptDeposit(req, res) {
  const id = parseInt(req.params.id);
  const dep = await dbGet('SELECT * FROM deposits WHERE id = ?', [id]);
  if (!dep) return res.status(404).json({ success: false, error: 'not_found' });
  if (!['pending','pending_verification'].includes(dep.status))
    return res.status(400).json({ success: false, error: 'not_pending' });
  await dbRun("UPDATE deposits SET status='accept', reviewed_by=?, reviewed_at=datetime('now') WHERE id=?", [req.user.id, id]);
  await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [dep.amount, dep.user_id]);
  await dbRun('INSERT INTO balance_history (user_id, balance) SELECT ?, balance FROM users WHERE id = ?', [dep.user_id, dep.user_id]);
  await dbRun("INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'deposit_completed', 'تم قبول إيداعك', ?)",
    [dep.user_id, `تم إضافة ${dep.amount} USDT.`]);
  return res.json({ success: true });
}

export async function rejectDeposit(req, res) {
  const id = parseInt(req.params.id);
  const { reason } = req.body;
  await dbRun("UPDATE deposits SET status='reject', reviewed_by=?, reviewed_at=datetime('now'), reject_reason=? WHERE id=?",
    [req.user.id, reason || null, id]);
  return res.json({ success: true });
}

// ---- Withdrawals ----
export async function getPendingWithdrawals(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20, offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll(`SELECT w.*, u.username, u.telegram_id FROM withdrawals w JOIN users u ON w.user_id = u.id
           WHERE w.status='pending' AND w.eligible_at <= datetime('now') ORDER BY w.created_at ASC LIMIT ? OFFSET ?`, [limit, offset]),
    dbGet("SELECT COUNT(*) as c FROM withdrawals WHERE status='pending' AND eligible_at <= datetime('now')"),
  ]);
  return res.json({ withdrawals: rows, total: total.c, page });
}

export async function completeWithdrawal(req, res) {
  const id = parseInt(req.params.id);
  const w = await dbGet('SELECT * FROM withdrawals WHERE id = ?', [id]);
  if (!w) return res.status(404).json({ success: false, error: 'not_found' });
  if (w.status !== 'pending') return res.status(400).json({ success: false, error: 'not_pending' });
  if (new Date(w.eligible_at) > new Date())
    return res.status(400).json({ success: false, error: 'not_eligible_yet', eligible_at: w.eligible_at });
  await dbRun("UPDATE withdrawals SET status='completed', reviewed_by=?, reviewed_at=datetime('now') WHERE id=?", [req.user.id, id]);
  await dbRun("INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'withdrawal_completed', 'تم تنفيذ سحبك', ?)",
    [w.user_id, `تم تحويل ${w.amount} USDT.`]);
  return res.json({ success: true });
}

export async function rejectWithdrawal(req, res) {
  const id = parseInt(req.params.id);
  const { reason } = req.body;
  const w = await dbGet('SELECT * FROM withdrawals WHERE id = ?', [id]);
  if (!w) return res.status(404).json({ success: false, error: 'not_found' });
  if (w.status !== 'pending') return res.status(400).json({ success: false, error: 'not_pending' });
  // Refund
  await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [w.amount, w.user_id]);
  await dbRun("UPDATE withdrawals SET status='rejected', reviewed_by=?, reviewed_at=datetime('now'), reject_reason=? WHERE id=?",
    [req.user.id, reason || null, id]);
  await dbRun("INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'withdrawal_completed', 'تم رفض السحب', ?)",
    [w.user_id, `تم رفض سحب ${w.amount} USDT. السبب: ${reason || 'غير محدد'}. تم إرجاع الرصيد.`]);
  return res.json({ success: true });
}

// ---- Submissions ----
export async function getPendingSubmissions(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20, offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll(`SELECT ts.*, u.username, u.telegram_id, t.bot_name, t.task_type, t.reward_per_user
           FROM task_submissions ts JOIN users u ON ts.user_id=u.id JOIN tasks t ON ts.task_id=t.id
           WHERE ts.status='pending' ORDER BY ts.created_at ASC LIMIT ? OFFSET ?`, [limit, offset]),
    dbGet("SELECT COUNT(*) as c FROM task_submissions WHERE status='pending'"),
  ]);
  return res.json({ submissions: rows, total: total.c, page });
}

export async function acceptSubmission(req, res) {
  const id = parseInt(req.params.id);
  const sub = await dbGet('SELECT * FROM task_submissions WHERE id = ?', [id]);
  if (!sub) return res.status(404).json({ success: false, error: 'not_found' });
  if (sub.status !== 'pending') return res.status(400).json({ success: false, error: 'not_pending' });
  const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [sub.task_id]);
  if (task.task_type === 'paid') {
    await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [task.reward_per_user, sub.user_id]);
    await dbRun('INSERT INTO balance_history (user_id, balance) SELECT ?, balance FROM users WHERE id = ?', [sub.user_id, sub.user_id]);
  } else {
    await dbRun('UPDATE users SET exchange_points = exchange_points + 1 WHERE id = ?', [sub.user_id]);
  }
  await dbRun("UPDATE task_submissions SET status='accept', reviewed_by=?, reviewed_at=datetime('now'), proof_images=NULL WHERE id=?",
    [req.user.id, id]);
  if (task.completed_count >= task.required_count)
    await dbRun("UPDATE tasks SET status='completed' WHERE id=?", [task.id]);
  return res.json({ success: true });
}

export async function rejectSubmission(req, res) {
  const id = parseInt(req.params.id);
  const { reject_type, reject_message } = req.body;
  const sub = await dbGet('SELECT * FROM task_submissions WHERE id = ?', [id]);
  if (!sub) return res.status(404).json({ success: false, error: 'not_found' });
  if (sub.status !== 'pending') return res.status(400).json({ success: false, error: 'not_pending' });

  // Decrement completed_count on rejection
  await dbRun('UPDATE tasks SET completed_count = MAX(0, completed_count - 1) WHERE id = ?', [sub.task_id]);

  if (reject_type === 'retry') {
    const timeoutRow = await dbGet("SELECT value FROM settings WHERE key='improvement_timeout'");
    const timeout = parseInt(timeoutRow?.value || '900');
    const deadline = new Date(Date.now() + timeout * 1000).toISOString();
    await dbRun(`UPDATE task_submissions SET status='reject', reject_type='retry', reject_message=?,
      can_retry=1, improvement_deadline=?, reviewed_by=?, reviewed_at=datetime('now') WHERE id=?`,
      [reject_message || null, deadline, req.user.id, id]);
    return res.json({ success: true, submission: { id, status: 'reject', can_retry: true, improvement_deadline: deadline } });
  }

  await dbRun(`UPDATE task_submissions SET status='reject', reject_type='final', reject_message=?,
    can_retry=0, reviewed_by=?, reviewed_at=datetime('now') WHERE id=?`,
    [reject_message || null, req.user.id, id]);
  // Add violation
  const vs = await dbGet("SELECT * FROM violation_settings WHERE track='trust' AND type_key='SUBMISSION_REJECTED' AND is_active=1");
  if (vs) {
    const exp = vs.expiry_days ? new Date(Date.now() + vs.expiry_days * 86400000).toISOString() : null;
    await dbRun("INSERT INTO violations (user_id, type, points, track, reason, expires_at, status) VALUES (?, 'SUBMISSION_REJECTED', ?, 'trust', ?, ?, 'active')",
      [sub.user_id, vs.points, `Final rejection sub #${id}`, exp]);
  }
  return res.json({ success: true, submission: { id, status: 'reject', can_retry: false } });
}

// ---- Appeals ----
export async function getPendingAppeals(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20, offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll(`SELECT a.*, u.username, u.telegram_id, b.reason as ban_reason, b.type as ban_type
           FROM appeals a JOIN users u ON a.user_id=u.id JOIN bans b ON a.ban_id=b.id
           WHERE a.status='pending' ORDER BY a.created_at ASC LIMIT ? OFFSET ?`, [limit, offset]),
    dbGet("SELECT COUNT(*) as c FROM appeals WHERE status='pending'"),
  ]);
  return res.json({ appeals: rows, total: total.c, page });
}

export async function approveAppeal(req, res) {
  const id = parseInt(req.params.id);
  const { note } = req.body;
  const appeal = await dbGet('SELECT * FROM appeals WHERE id=?', [id]);
  if (!appeal) return res.status(404).json({ success: false, error: 'not_found' });
  await dbRun("UPDATE appeals SET status='approved', reviewed_by=?, review_note=?, reviewed_at=datetime('now') WHERE id=?",
    [req.user.id, note || null, id]);
  await dbRun("UPDATE bans SET status='lifted' WHERE user_id=? AND status='active'", [appeal.user_id]);
  await dbRun("UPDATE users SET is_banned=0, ban_status='none', ban_expires_at=NULL WHERE id=?", [appeal.user_id]);
  await dbRun("INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'system_update', '✅ تم رفع الحظر', 'تم قبول استئنافك.')",
    [appeal.user_id]);
  return res.json({ success: true });
}

export async function rejectAppeal(req, res) {
  const id = parseInt(req.params.id);
  const { note } = req.body;
  if (!note) return res.status(400).json({ success: false, error: 'note_required' });
  await dbRun("UPDATE appeals SET status='rejected', reviewed_by=?, review_note=?, reviewed_at=datetime('now') WHERE id=?",
    [req.user.id, note, id]);
  return res.json({ success: true });
}

// ---- Bans ----
export async function getBans(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20, offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll(`SELECT u.id, u.telegram_id, u.username, u.ban_status, u.ban_expires_at,
           b.reason, b.type, b.start_date FROM users u
           JOIN bans b ON b.user_id=u.id AND b.status='active'
           WHERE u.is_banned=1 ORDER BY b.start_date DESC LIMIT ? OFFSET ?`, [limit, offset]),
    dbGet('SELECT COUNT(*) as c FROM users WHERE is_banned=1'),
  ]);
  return res.json({ bans: rows, total: total.c, page });
}

// ---- Settings ----
export async function getSettings(req, res) {
  const rows = await dbAll('SELECT key, value, updated_at FROM settings ORDER BY key');
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  return res.json(settings);
}

export async function updateSettings(req, res) {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') return res.status(400).json({ success: false, error: 'invalid_body' });
  for (const [key, value] of Object.entries(updates)) {
    await dbRun(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`, [key, String(value)]);
  }
  return res.json({ success: true });
}

// ---- Device logs & duplicates ----
export async function getDeviceLogs(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 50, offset = (page - 1) * limit;
  const rows = await dbAll(
    `SELECT dl.*, u.username FROM device_logs dl JOIN users u ON dl.user_id=u.id
     ORDER BY dl.created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
  return res.json({ logs: rows });
}

export async function getDuplicateAccounts(req, res) {
  const rows = await dbAll(`
    SELECT dl.fingerprint, dl.ip_address as shared_ip, COUNT(DISTINCT dl.user_id) as user_count, COUNT(*) as occurrences,
           GROUP_CONCAT(DISTINCT dl.user_id) as user_ids
    FROM device_logs dl GROUP BY dl.fingerprint HAVING user_count > 1 ORDER BY occurrences DESC LIMIT 50`);
  const groups = [];
  for (const row of rows) {
    const ids = row.user_ids.split(',').map(Number);
    const users = await dbAll(`SELECT id, telegram_id, username FROM users WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    groups.push({ fingerprint: row.fingerprint, shared_ip: row.shared_ip, occurrences: row.occurrences, users });
  }
  return res.json({ groups });
}

// ---- Reports ----
export async function getReports(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20, offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll(`SELECT r.*, u1.username as reporter_name, u2.username as reported_name
           FROM reports r JOIN users u1 ON r.reporter_id=u1.id JOIN users u2 ON r.reported_user_id=u2.id
           WHERE r.status='pending' ORDER BY r.created_at DESC LIMIT ? OFFSET ?`, [limit, offset]),
    dbGet("SELECT COUNT(*) as c FROM reports WHERE status='pending'"),
  ]);
  return res.json({ reports: rows, total: total.c, page });
}

// ---- Violation Settings ----
export async function getViolationSettings(req, res) {
  const [types, thresholds, grace] = await Promise.all([
    dbAll('SELECT * FROM violation_settings ORDER BY track, type_key'),
    dbAll('SELECT * FROM violation_thresholds ORDER BY track, min_points'),
    dbGet('SELECT * FROM violation_grace_settings WHERE id=1'),
  ]);
  return res.json({ types, thresholds, grace });
}

export async function updateViolationTrack(req, res) {
  const { track } = req.params;
  if (!['trust','security'].includes(track)) return res.status(400).json({ success: false, error: 'invalid_track' });
  // Update thresholds if provided
  if (req.body.thresholds) {
    await dbRun('DELETE FROM violation_thresholds WHERE track=?', [track]);
    for (const t of req.body.thresholds) {
      await dbRun('INSERT INTO violation_thresholds (track, min_points, max_points, action) VALUES (?, ?, ?, ?)',
        [track, t.min_points, t.max_points ?? null, t.action]);
    }
  }
  return res.json({ success: true, track });
}

export async function updateViolationType(req, res) {
  const { track, type } = req.params;
  const allowed = ['points','expiry_days','description','is_active'];
  const sets = [], vals = [];
  for (const [k, v] of Object.entries(req.body)) {
    if (allowed.includes(k)) { sets.push(`${k}=?`); vals.push(v); }
  }
  if (!sets.length) return res.status(400).json({ success: false, error: 'no_valid_fields' });
  vals.push(track, type);
  await dbRun(`UPDATE violation_settings SET ${sets.join(',')} WHERE track=? AND type_key=?`, vals);
  return res.json({ success: true });
}

export async function addViolationType(req, res) {
  const { track } = req.params;
  const { type_key, points, expiry_days, description } = req.body;
  if (!type_key || !points) return res.status(400).json({ success: false, error: 'missing_fields' });
  try {
    await dbRun('INSERT INTO violation_settings (track, type_key, points, expiry_days, description) VALUES (?, ?, ?, ?, ?)',
      [track, type_key, points, expiry_days || null, description || null]);
    return res.status(201).json({ success: true });
  } catch (e) {
    return res.status(409).json({ success: false, error: 'already_exists' });
  }
}

export async function deleteViolationType(req, res) {
  const { track, type } = req.params;
  await dbRun('UPDATE violation_settings SET is_active=0 WHERE track=? AND type_key=?', [track, type]);
  return res.json({ success: true });
}

export async function updateThresholds(req, res) {
  const { track } = req.params;
  const { thresholds } = req.body;
  if (!Array.isArray(thresholds)) return res.status(400).json({ success: false, error: 'invalid_thresholds' });
  await dbRun('DELETE FROM violation_thresholds WHERE track=?', [track]);
  for (const t of thresholds) {
    await dbRun('INSERT INTO violation_thresholds (track, min_points, max_points, action) VALUES (?, ?, ?, ?)',
      [track, t.min_points, t.max_points ?? null, t.action]);
  }
  return res.json({ success: true, track, updated: true });
}

export async function updateGraceSettings(req, res) {
  const { is_enabled, min_account_age_days } = req.body;
  await dbRun("UPDATE violation_grace_settings SET is_enabled=?, min_account_age_days=?, updated_at=datetime('now') WHERE id=1",
    [is_enabled ? 1 : 0, min_account_age_days ?? 90]);
  return res.json({ success: true });
}

// ---- Security Queue ----
export async function getSecurityReviewQueue(req, res) {
  const [pendingReports, frozenAccounts] = await Promise.all([
    dbAll(`SELECT v.id, v.user_id, v.reason, v.created_at,
           (SELECT COUNT(*) FROM reports WHERE reported_user_id=v.user_id AND status='pending') as reports_count
           FROM violations v WHERE v.type='REPORT_RECEIVED' AND v.status='pending' ORDER BY v.created_at ASC`),
    dbAll(`SELECT u.id as user_id, u.username, u.telegram_id, u.ban_status,
           COALESCE((SELECT SUM(points) FROM violations WHERE user_id=u.id AND track='security' AND status='active'),0) as security_points
           FROM users u WHERE u.ban_status='frozen_pending_review'`),
  ]);
  return res.json({ pending_reports: pendingReports, frozen_accounts: frozenAccounts });
}

export async function confirmReport(req, res) {
  const { id } = req.params;
  const v = await dbGet('SELECT * FROM violations WHERE id=?', [id]);
  if (!v || v.status !== 'pending') return res.status(404).json({ success: false, error: 'not_found' });
  await dbRun("UPDATE violations SET status='active' WHERE id=?", [id]);
  await dbRun("UPDATE reports SET status='confirmed', reviewed_by=? WHERE reported_user_id=? AND status='pending'", [req.user.id, v.user_id]);
  return res.json({ success: true });
}

export async function dismissReport(req, res) {
  const { id } = req.params;
  await dbRun("UPDATE violations SET status='dismissed' WHERE id=?", [id]);
  await dbRun("UPDATE reports SET status='dismissed', reviewed_by=? WHERE id=?", [req.user.id, id]);
  return res.json({ success: true });
}

export async function confirmPermanentBan(req, res) {
  const userId = parseInt(req.params.id);
  const { note } = req.body;
  if (!note) return res.status(400).json({ success: false, error: 'note_required' });
  await dbRun("INSERT INTO bans (user_id, type, reason, banned_by) VALUES (?, 'permanent', ?, ?)",
    [userId, note, req.user.id]);
  await dbRun("UPDATE users SET is_banned=1, ban_status='permanent', ban_expires_at=NULL WHERE id=?", [userId]);
  await dbRun("INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'system_update', '🚫 حظر دائم', 'تم حظر حسابك بشكل دائم.')", [userId]);
  return res.json({ success: true, user_id: userId, ban_status: 'permanent', confirmed_by: req.user.id });
}

export async function releaseFrozenAccount(req, res) {
  const userId = parseInt(req.params.id);
  await dbRun("UPDATE users SET ban_status='none' WHERE id=?", [userId]);
  return res.json({ success: true });
}

export async function expireViolationNow(req, res) {
  const userId = parseInt(req.params.id);
  const violationId = parseInt(req.params.violationId);
  const v = await dbGet('SELECT * FROM violations WHERE id=? AND user_id=?', [violationId, userId]);
  if (!v) return res.status(404).json({ success: false, error: 'not_found' });
  await dbRun("UPDATE violations SET status='expired', expires_at=datetime('now') WHERE id=?", [violationId]);
  return res.json({ success: true });
}

export async function restoreViolation(req, res) {
  const userId = parseInt(req.params.id);
  const violationId = parseInt(req.params.violationId);
  const v = await dbGet('SELECT * FROM violations WHERE id=? AND user_id=?', [violationId, userId]);
  if (!v) return res.status(404).json({ success: false, error: 'not_found' });
  await dbRun("UPDATE violations SET status='active' WHERE id=?", [violationId]);
  return res.json({ success: true });
}

// ---- Maker-Checker Proposals ----
export async function createProposal(req, res) {
  const { action_type, target_type, target_id, payload } = req.body;
  if (!action_type) return res.status(400).json({ success: false, error: 'missing_fields' });
  const adminRow = await dbGet('SELECT id FROM admins WHERE telegram_id=?', [req.user.telegram_id]);
  const proposerId = adminRow?.id || 0;
  const result = await dbRun(
    'INSERT INTO admin_action_proposals (proposer_id, action_type, target_type, target_id, payload) VALUES (?, ?, ?, ?, ?)',
    [proposerId, action_type, target_type || 'user', target_id || null, JSON.stringify(payload || {})]);
  return res.status(201).json({ success: true, proposal_id: result.lastID, status: 'pending_approval' });
}

export async function getProposals(req, res) {
  const status = req.query.status || 'pending_approval';
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20, offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll(`SELECT p.*, a.username as proposer_username FROM admin_action_proposals p
           LEFT JOIN admins a ON p.proposer_id=a.id WHERE p.status=? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [status, limit, offset]),
    dbGet('SELECT COUNT(*) as c FROM admin_action_proposals WHERE status=?', [status]),
  ]);
  return res.json({ proposals: rows, total: total.c, page });
}

export async function approveProposal(req, res) {
  const id = parseInt(req.params.id);
  const proposal = await dbGet('SELECT * FROM admin_action_proposals WHERE id=?', [id]);
  if (!proposal) return res.status(404).json({ success: false, error: 'not_found' });
  if (proposal.status !== 'pending_approval') return res.status(400).json({ success: false, error: 'not_pending' });
  const adminRow = await dbGet('SELECT id FROM admins WHERE telegram_id=?', [req.user.telegram_id]);
  const approverId = adminRow?.id || 0;
  if (proposal.proposer_id === approverId && !req.isMainAdmin)
    return res.status(403).json({ success: false, error: 'self_approval_forbidden' });

  const payload = JSON.parse(proposal.payload);
  let extra = {};
  if (proposal.action_type === 'adjust_balance') {
    const delta = payload.direction === 'add' ? payload.amount : -payload.amount;
    await dbRun('UPDATE users SET balance = MAX(0, balance + ?) WHERE id=?', [delta, proposal.target_id]);
    await dbRun('INSERT INTO balance_history (user_id, balance) SELECT ?, balance FROM users WHERE id=?', [proposal.target_id, proposal.target_id]);
    const u = await dbGet('SELECT balance FROM users WHERE id=?', [proposal.target_id]);
    extra = { new_balance: u.balance };
  } else if (proposal.action_type === 'confirm_permanent_ban') {
    await dbRun("INSERT INTO bans (user_id, type, reason, banned_by) VALUES (?, 'permanent', ?, ?)",
      [proposal.target_id, payload.note || 'Approved via proposal', req.user.id]);
    await dbRun("UPDATE users SET is_banned=1, ban_status='permanent', ban_expires_at=NULL WHERE id=?", [proposal.target_id]);
  } else if (proposal.action_type === 'update_financial_setting') {
    await dbRun(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`, [payload.key, String(payload.value)]);
  }
  await dbRun("UPDATE admin_action_proposals SET status='approved', approved_by=?, resolved_at=datetime('now') WHERE id=?",
    [approverId, id]);
  return res.json({ success: true, proposal_id: id, status: 'approved', executed: true, ...extra });
}

export async function rejectProposal(req, res) {
  const id = parseInt(req.params.id);
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, error: 'reason_required' });
  const proposal = await dbGet('SELECT * FROM admin_action_proposals WHERE id=?', [id]);
  if (!proposal || proposal.status !== 'pending_approval')
    return res.status(404).json({ success: false, error: 'not_found_or_not_pending' });
  const adminRow = await dbGet('SELECT id FROM admins WHERE telegram_id=?', [req.user.telegram_id]);
  await dbRun("UPDATE admin_action_proposals SET status='rejected', approved_by=?, approval_note=?, resolved_at=datetime('now') WHERE id=?",
    [adminRow?.id || 0, reason, id]);
  return res.json({ success: true, proposal_id: id, status: 'rejected' });
}
