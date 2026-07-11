import { dbGet, dbAll, dbRun } from '../config/database.js';
import { logger } from '../utils/logger.js';

export async function findUserByTelegramId(telegramId) {
  return dbGet('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
}

export async function findUserById(id) {
  return dbGet('SELECT * FROM users WHERE id = ?', [id]);
}

export async function createUser({ telegram_id, username, language = 'ar', phone_number = null, phone_verified_at = null, last_known_ip = null, country_code = null }) {
  const result = await dbRun(
    `INSERT INTO users (telegram_id, username, language, phone_number, phone_verified_at, last_known_ip, country_code)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [telegram_id, username || null, language, phone_number, phone_verified_at, last_known_ip, country_code]
  );

  // Create default notification prefs
  await dbRun(
    'INSERT OR IGNORE INTO notification_prefs (user_id) VALUES (?)',
    [result.lastID]
  );

  return findUserById(result.lastID);
}

export async function updateUser(id, fields) {
  const allowed = ['username', 'language', 'phone_number', 'phone_verified_at', 'balance', 'exchange_points',
    'is_banned', 'violation_points', 'last_violation_date', 'ban_status', 'ban_expires_at',
    'restrictions', 'notification_channel', 'last_known_ip', 'country_code'];

  const updates = [];
  const values = [];
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k)) {
      updates.push(`${k} = ?`);
      values.push(v);
    }
  }
  if (!updates.length) return;
  values.push(id);
  await dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
}

export async function updateUserByTelegramId(telegramId, fields) {
  const user = await findUserByTelegramId(telegramId);
  if (!user) return null;
  await updateUser(user.id, fields);
  return findUserById(user.id);
}

export async function adjustBalance(userId, delta) {
  const user = await findUserById(userId);
  if (!user) throw new Error('User not found');
  const newBalance = Math.max(0, user.balance + delta);
  await dbRun('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId]);

  // Record balance history
  await dbRun(
    'INSERT INTO balance_history (user_id, balance) VALUES (?, ?)',
    [userId, newBalance]
  );

  return newBalance;
}

export async function adjustPoints(userId, delta) {
  const user = await findUserById(userId);
  if (!user) throw new Error('User not found');
  const newPoints = Math.max(0, user.exchange_points + delta);
  await dbRun('UPDATE users SET exchange_points = ? WHERE id = ?', [newPoints, userId]);
  return newPoints;
}

export async function getUserStats(userId) {
  const user = await findUserById(userId);
  if (!user) return null;

  const [activeTasks, completedSubs, pendingSubs, deposits, withdrawals, ratingRow] = await Promise.all([
    dbGet('SELECT COUNT(*) as c FROM tasks WHERE owner_id = ? AND status = ?', [userId, 'active']),
    dbGet("SELECT COUNT(*) as c FROM task_submissions WHERE user_id = ? AND status = 'accept'", [userId]),
    dbGet("SELECT COUNT(*) as c FROM task_submissions WHERE user_id = ? AND status = 'pending'", [userId]),
    dbGet('SELECT COALESCE(SUM(amount),0) as total FROM deposits WHERE user_id = ? AND status = ?', [userId, 'accept']),
    dbGet("SELECT COALESCE(SUM(amount),0) as total FROM withdrawals WHERE user_id = ? AND status = 'completed'", [userId]),
    dbGet('SELECT AVG(rating) as avg FROM ratings WHERE rated_user_id = ?', [userId]),
  ]);

  return {
    balance: user.balance,
    exchange_points: user.exchange_points,
    active_tasks: activeTasks.c,
    completed_submissions: completedSubs.c,
    pending_submissions: pendingSubs.c,
    total_deposited: deposits.total,
    total_withdrawn: withdrawals.total,
    rating_avg: ratingRow.avg ? parseFloat(ratingRow.avg.toFixed(2)) : null,
  };
}

export async function getBalanceChart(userId, days = 30) {
  const rows = await dbAll(
    `SELECT DATE(recorded_at) as date, balance
     FROM balance_history
     WHERE user_id = ? AND recorded_at >= datetime('now', ?)
     ORDER BY recorded_at ASC`,
    [userId, `-${days} days`]
  );
  return rows;
}

export async function getUserActivity(userId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll(
      'SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    ),
    dbGet('SELECT COUNT(*) as c FROM activity_log WHERE user_id = ?', [userId]),
  ]);
  return { rows, total: total.c, page, limit };
}

export async function logActivity(userId, eventType, metadata = {}) {
  await dbRun(
    'INSERT INTO activity_log (user_id, event_type, metadata) VALUES (?, ?, ?)',
    [userId, eventType, JSON.stringify(metadata)]
  );
}

export async function searchUsers(query) {
  const byId = await dbGet('SELECT * FROM users WHERE id = ?', [parseInt(query) || 0]);
  if (byId) return [byId];
  return dbAll(
    "SELECT * FROM users WHERE username LIKE ? LIMIT 20",
    [`%${query}%`]
  );
}

export async function getAllUsers(page = 1, limit = 50) {
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]),
    dbGet('SELECT COUNT(*) as c FROM users'),
  ]);
  return { rows, total: total.c };
}

export async function getWidgetsConfig(userId) {
  const row = await dbGet(
    "SELECT value FROM settings WHERE key = ?",
    [`widgets_config_${userId}`]
  );
  return row ? JSON.parse(row.value) : ['balance_chart', 'recent_tasks', 'notifications'];
}

export async function setWidgetsConfig(userId, widgets) {
  await dbRun(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [`widgets_config_${userId}`, JSON.stringify(widgets)]
  );
}

export async function isPhoneNumberTaken(phone, excludeTelegramId) {
  const row = await dbGet(
    'SELECT id, telegram_id FROM users WHERE phone_number = ? AND phone_verified_at IS NOT NULL',
    [phone]
  );
  if (!row) return false;
  if (row.telegram_id === excludeTelegramId) return false;
  return row;
}
