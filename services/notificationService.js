import { dbGet, dbAll, dbRun } from '../config/database.js';

export async function createNotification({ userId, type, title, body, link = null }) {
  // Check user's notification preferences
  const prefs = await dbGet('SELECT * FROM notification_prefs WHERE user_id = ?', [userId]);
  if (prefs) {
    const prefMap = {
      submission_accepted: prefs.submission_accepted,
      submission_rejected: prefs.submission_rejected,
      task_completed: prefs.task_completed,
      promotional: prefs.promotional,
      system_update: prefs.system_update,
      ticket_reply: prefs.ticket_reply,
      deposit_completed: prefs.deposit_completed,
      withdrawal_completed: prefs.withdrawal_completed,
    };
    if (prefMap[type] === 0) return; // User disabled this type
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

  await dbRun(
    `INSERT INTO notifications (user_id, type, title, body, link, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, title, body, link, expiresAt]
  );
}

export async function getUserNotifications(userId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const [rows, unread, total] = await Promise.all([
    dbAll(
      `SELECT * FROM notifications WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    ),
    dbGet('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0', [userId]),
    dbGet('SELECT COUNT(*) as c FROM notifications WHERE user_id = ?', [userId]),
  ]);
  return { rows, unread_count: unread.c, total: total.c, page };
}

export async function getUnreadCount(userId) {
  const row = await dbGet(
    'SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return row.c;
}

export async function markRead(notificationId, userId) {
  await dbRun(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
}

export async function markAllRead(userId) {
  await dbRun('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
}

export async function getNotificationPrefs(userId) {
  let prefs = await dbGet('SELECT * FROM notification_prefs WHERE user_id = ?', [userId]);
  if (!prefs) {
    await dbRun('INSERT OR IGNORE INTO notification_prefs (user_id) VALUES (?)', [userId]);
    prefs = await dbGet('SELECT * FROM notification_prefs WHERE user_id = ?', [userId]);
  }
  return prefs;
}

export async function updateNotificationPrefs(userId, prefsObj) {
  const allowed = ['submission_accepted', 'submission_rejected', 'task_completed', 'promotional', 'system_update', 'ticket_reply', 'deposit_completed', 'withdrawal_completed'];
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(prefsObj)) {
    if (allowed.includes(k)) { sets.push(`${k} = ?`); vals.push(v ? 1 : 0); }
  }
  if (!sets.length) return;
  vals.push(userId);
  await dbRun(`UPDATE notification_prefs SET ${sets.join(', ')} WHERE user_id = ?`, vals);
}

/**
 * Clean up expired notifications
 */
export async function cleanupExpiredNotifications() {
  const result = await dbRun(
    "DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')"
  );
  return result.changes;
}
