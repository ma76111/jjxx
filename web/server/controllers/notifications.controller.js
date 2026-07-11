import { dbGet, dbAll, dbRun } from '../config/database.js';

export async function getNotifications(req, res) {
  const userId = req.user.id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    dbAll(
      `SELECT * FROM notifications WHERE user_id = ?
       AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    ),
    dbGet('SELECT COUNT(*) as c FROM notifications WHERE user_id = ?', [userId]),
  ]);

  return res.json({ notifications: rows, total: total.c, page });
}

export async function getUnreadCount(req, res) {
  const row = await dbGet(
    'SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0',
    [req.user.id]
  );
  return res.json({ unread_count: row.c });
}

export async function markAllRead(req, res) {
  await dbRun('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  return res.json({ success: true });
}

export async function markOneRead(req, res) {
  const notifId = parseInt(req.params.id);
  await dbRun(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notifId, req.user.id]
  );
  return res.json({ success: true });
}

export async function getPrefs(req, res) {
  let prefs = await dbGet('SELECT * FROM notification_prefs WHERE user_id = ?', [req.user.id]);
  if (!prefs) {
    await dbRun('INSERT OR IGNORE INTO notification_prefs (user_id) VALUES (?)', [req.user.id]);
    prefs = await dbGet('SELECT * FROM notification_prefs WHERE user_id = ?', [req.user.id]);
  }
  return res.json(prefs);
}

export async function updatePrefs(req, res) {
  const allowed = ['submission_accepted', 'submission_rejected', 'task_completed', 'promotional',
    'system_update', 'ticket_reply', 'deposit_completed', 'withdrawal_completed'];
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(req.body)) {
    if (allowed.includes(k)) { sets.push(`${k} = ?`); vals.push(v ? 1 : 0); }
  }
  if (!sets.length) return res.status(400).json({ success: false, error: 'no_valid_fields' });
  vals.push(req.user.id);
  await dbRun(`UPDATE notification_prefs SET ${sets.join(', ')} WHERE user_id = ?`, vals);
  return res.json({ success: true });
}
