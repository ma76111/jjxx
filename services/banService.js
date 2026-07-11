import { dbGet, dbAll, dbRun } from '../config/database.js';
import { findUserById, updateUser } from './userService.js';
import { createNotification } from './notificationService.js';

export async function banUser({ userId, type, durationDays, reason, bannedBy }) {
  const user = await findUserById(userId);
  if (!user) return { error: 'user_not_found' };

  const endDate = type === 'temporary' && durationDays
    ? new Date(Date.now() + durationDays * 86400 * 1000).toISOString()
    : null;

  const result = await dbRun(
    `INSERT INTO bans (user_id, type, duration, reason, banned_by, end_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, durationDays || null, reason, bannedBy, endDate]
  );

  await updateUser(userId, {
    is_banned: 1,
    ban_status: type,
    ban_expires_at: endDate,
  });

  await createNotification({
    userId,
    type: 'system_update',
    title: type === 'permanent' ? '🚫 حظر دائم' : `🚫 حظر مؤقت (${durationDays} أيام)`,
    body: `السبب: ${reason}`,
  });

  return { success: true, ban_id: result.lastID, ban_expires_at: endDate };
}

export async function unbanUser(userId, adminId) {
  const user = await findUserById(userId);
  if (!user) return { error: 'user_not_found' };
  if (!user.is_banned) return { error: 'not_banned' };

  // Close active bans
  await dbRun(
    "UPDATE bans SET status = 'lifted' WHERE user_id = ? AND status = 'active'",
    [userId]
  );

  await updateUser(userId, {
    is_banned: 0,
    ban_status: 'none',
    ban_expires_at: null,
  });

  await createNotification({
    userId,
    type: 'system_update',
    title: '✅ تم رفع الحظر',
    body: 'تم رفع الحظر عن حسابك.',
  });

  return { success: true };
}

export async function getBannedUsers(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll(
      `SELECT u.id, u.telegram_id, u.username, u.ban_status, u.ban_expires_at,
              b.reason, b.type, b.banned_by, b.start_date
       FROM users u
       JOIN bans b ON b.user_id = u.id AND b.status = 'active'
       WHERE u.is_banned = 1
       ORDER BY b.start_date DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    ),
    dbGet('SELECT COUNT(*) as c FROM users WHERE is_banned = 1'),
  ]);
  return { rows, total: total.c, page };
}

export async function liftExpiredBans() {
  const expired = await dbAll(
    `SELECT DISTINCT user_id FROM bans
     WHERE type = 'temporary' AND status = 'active' AND end_date <= datetime('now')`
  );

  for (const row of expired) {
    await dbRun(
      "UPDATE bans SET status = 'expired' WHERE user_id = ? AND type = 'temporary' AND status = 'active'",
      [row.user_id]
    );
    await updateUser(row.user_id, { is_banned: 0, ban_status: 'none', ban_expires_at: null });
  }
  return expired.length;
}

export async function createAppeal({ userId, banId, reason }) {
  const user = await findUserById(userId);
  if (!user) return { error: 'user_not_found' };
  if (!user.is_banned) return { error: 'not_banned' };

  const existing = await dbGet(
    "SELECT id FROM appeals WHERE user_id = ? AND ban_id = ? AND status = 'pending'",
    [userId, banId]
  );
  if (existing) return { error: 'appeal_pending' };

  const result = await dbRun(
    'INSERT INTO appeals (user_id, ban_id, reason) VALUES (?, ?, ?)',
    [userId, banId, reason]
  );
  return { success: true, appeal_id: result.lastID };
}

export async function getPendingAppeals(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll(
      `SELECT a.*, u.username, u.telegram_id, b.reason as ban_reason, b.type as ban_type
       FROM appeals a
       JOIN users u ON a.user_id = u.id
       JOIN bans b ON a.ban_id = b.id
       WHERE a.status = 'pending'
       ORDER BY a.created_at ASC LIMIT ? OFFSET ?`,
      [limit, offset]
    ),
    dbGet("SELECT COUNT(*) as c FROM appeals WHERE status = 'pending'"),
  ]);
  return { rows, total: total.c };
}

export async function approveAppeal(appealId, adminId, note) {
  const appeal = await dbGet('SELECT * FROM appeals WHERE id = ?', [appealId]);
  if (!appeal) return { error: 'not_found' };

  await dbRun(
    "UPDATE appeals SET status = 'approved', reviewed_by = ?, review_note = ?, reviewed_at = datetime('now') WHERE id = ?",
    [adminId, note || null, appealId]
  );

  // Lift the ban
  await unbanUser(appeal.user_id, adminId);
  return { success: true };
}

export async function rejectAppeal(appealId, adminId, note) {
  const appeal = await dbGet('SELECT * FROM appeals WHERE id = ?', [appealId]);
  if (!appeal) return { error: 'not_found' };

  await dbRun(
    "UPDATE appeals SET status = 'rejected', reviewed_by = ?, review_note = ?, reviewed_at = datetime('now') WHERE id = ?",
    [adminId, note || null, appealId]
  );
  return { success: true };
}
