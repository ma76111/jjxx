import { dbGet, dbAll, dbRun } from '../config/database.js';
import dotenv from 'dotenv';
dotenv.config();

const MAIN_ADMIN_ID = Number(process.env.MAIN_ADMIN_ID) || 0;

export async function getMe(req, res) {
  const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ success: false, error: 'not_found' });

  const adminRow = await dbGet(
    'SELECT id, role, permissions FROM admins WHERE telegram_id = ? AND is_active = 1',
    [user.telegram_id]
  );
  const isAdmin = user.telegram_id === MAIN_ADMIN_ID || !!adminRow;

  return res.json({
    ...user,
    is_admin: isAdmin,
    admin_role: adminRow?.role || (user.telegram_id === MAIN_ADMIN_ID ? 'primary' : null),
    admin_permissions: adminRow?.permissions || null,
  });
}

export async function getStats(req, res) {
  const userId = req.user.id;

  const [activeTasks, completedSubs, pendingSubs, deposits, withdrawals, ratingRow] = await Promise.all([
    dbGet("SELECT COUNT(*) as c FROM tasks WHERE owner_id = ? AND status = 'active'", [userId]),
    dbGet("SELECT COUNT(*) as c FROM task_submissions WHERE user_id = ? AND status = 'accept'", [userId]),
    dbGet("SELECT COUNT(*) as c FROM task_submissions WHERE user_id = ? AND status = 'pending'", [userId]),
    dbGet("SELECT COALESCE(SUM(amount),0) as total FROM deposits WHERE user_id = ? AND status = 'accept'", [userId]),
    dbGet("SELECT COALESCE(SUM(amount),0) as total FROM withdrawals WHERE user_id = ? AND status = 'completed'", [userId]),
    dbGet('SELECT AVG(rating) as avg FROM ratings WHERE rated_user_id = ?', [userId]),
  ]);

  const user = await dbGet('SELECT balance, exchange_points FROM users WHERE id = ?', [userId]);

  return res.json({
    balance: user.balance,
    exchange_points: user.exchange_points,
    active_tasks: activeTasks.c,
    completed_submissions: completedSubs.c,
    pending_submissions: pendingSubs.c,
    total_deposited: deposits.total,
    total_withdrawn: withdrawals.total,
    rating_avg: ratingRow.avg ? parseFloat(ratingRow.avg.toFixed(2)) : null,
  });
}

export async function getActivity(req, res) {
  const userId = req.user.id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    dbAll(
      'SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    ),
    dbGet('SELECT COUNT(*) as c FROM activity_log WHERE user_id = ?', [userId]),
  ]);

  return res.json({ rows, total: total.c, page, limit });
}

export async function getBalanceChart(req, res) {
  const userId = req.user.id;
  const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 30));

  const rows = await dbAll(
    `SELECT DATE(recorded_at) as date, balance
     FROM balance_history
     WHERE user_id = ? AND recorded_at >= datetime('now', ?)
     ORDER BY recorded_at ASC`,
    [userId, `-${days} days`]
  );

  return res.json({ days, data: rows });
}

export async function getWidgetsConfig(req, res) {
  const row = await dbGet('SELECT value FROM settings WHERE key = ?', [`widgets_config_${req.user.id}`]);
  const widgets = row ? JSON.parse(row.value) : ['balance_chart', 'recent_tasks', 'notifications'];
  return res.json({ widgets });
}

export async function setWidgetsConfig(req, res) {
  const { widgets } = req.body;
  if (!Array.isArray(widgets)) return res.status(400).json({ success: false, error: 'invalid_widgets' });

  await dbRun(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [`widgets_config_${req.user.id}`, JSON.stringify(widgets)]
  );

  return res.json({ success: true });
}
