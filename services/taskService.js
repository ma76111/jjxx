import { dbGet, dbAll, dbRun } from '../config/database.js';
import { getSetting } from './settingsService.js';
import { adjustBalance, adjustPoints, findUserById } from './userService.js';
import { logger } from '../utils/logger.js';

export async function createTask({ owner_id, bot_name, referral_link, required_count, task_type, reward_per_user, verification_instructions, proof_type, country_code }) {
  const owner = await findUserById(owner_id);
  if (!owner) throw new Error('Owner not found');

  // Check active task limit
  const maxTasks = parseInt(await getSetting('max_tasks_per_user', '2'));
  const activeCount = await dbGet(
    "SELECT COUNT(*) as c FROM tasks WHERE owner_id = ? AND status IN ('active','paused')",
    [owner_id]
  );
  if (activeCount.c >= maxTasks) {
    return { error: 'max_tasks_reached', max: maxTasks };
  }

  // Check required_count limit
  const maxCount = parseInt(await getSetting('max_required_count', '10'));
  if (required_count > maxCount) {
    return { error: 'max_required_count', max: maxCount };
  }

  // Check min reward
  const minReward = parseFloat(await getSetting('min_reward', '0.01'));
  if (task_type === 'paid' && reward_per_user < minReward) {
    return { error: 'below_min_reward', min: minReward };
  }

  const totalCost = task_type === 'paid'
    ? reward_per_user * required_count
    : parseInt(await getSetting('exchange_points_cost', '3')) * required_count;

  // Check & deduct balance
  if (task_type === 'paid') {
    if (owner.balance < totalCost) {
      return { error: 'insufficient_balance', required: totalCost, available: owner.balance };
    }
    await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [totalCost, owner_id]);
    await dbRun(
      'INSERT INTO balance_history (user_id, balance) SELECT ?, balance FROM users WHERE id = ?',
      [owner_id, owner_id]
    );
  } else {
    if (owner.exchange_points < totalCost) {
      return { error: 'insufficient_points', required: totalCost, available: owner.exchange_points };
    }
    await dbRun('UPDATE users SET exchange_points = exchange_points - ? WHERE id = ?', [totalCost, owner_id]);
  }

  const result = await dbRun(
    `INSERT INTO tasks (owner_id, bot_name, referral_link, required_count, task_type, reward_per_user, verification_instructions, proof_type, country_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [owner_id, bot_name || null, referral_link || null, required_count, task_type, reward_per_user, verification_instructions || null, proof_type, country_code || null]
  );

  return { task_id: result.lastID, charged: totalCost };
}

export async function getTaskById(id) {
  return dbGet('SELECT * FROM tasks WHERE id = ?', [id]);
}

export async function getAvailableTasks(userId, page = 1, countryCode = null) {
  const limit = 10;
  const offset = (page - 1) * limit;

  // Exclude own tasks, hidden tasks, already-submitted tasks, completed/expired tasks
  let sql = `
    SELECT t.*, u.username as owner_username
    FROM tasks t
    JOIN users u ON t.owner_id = u.id
    WHERE t.status = 'active'
      AND t.owner_id != ?
      AND t.id NOT IN (SELECT task_id FROM hidden_tasks WHERE user_id = ?)
      AND t.id NOT IN (SELECT task_id FROM task_submissions WHERE user_id = ?)
      AND t.completed_count < t.required_count
  `;
  const params = [userId, userId, userId];

  if (countryCode) {
    sql += ' AND (t.country_code IS NULL OR t.country_code = ?)';
    params.push(countryCode);
  }

  sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows, totalRow] = await Promise.all([
    dbAll(sql, params),
    dbGet(
      `SELECT COUNT(*) as c FROM tasks t
       WHERE t.status = 'active' AND t.owner_id != ?
         AND t.id NOT IN (SELECT task_id FROM hidden_tasks WHERE user_id = ?)
         AND t.id NOT IN (SELECT task_id FROM task_submissions WHERE user_id = ?)
         AND t.completed_count < t.required_count`,
      [userId, userId, userId]
    ),
  ]);

  return { tasks: rows, total: totalRow.c, page };
}

export async function getUserTasks(ownerId) {
  return dbAll(
    'SELECT * FROM tasks WHERE owner_id = ? ORDER BY created_at DESC',
    [ownerId]
  );
}

export async function pauseTask(taskId, ownerId) {
  const task = await getTaskById(taskId);
  if (!task) return { error: 'not_found' };
  if (task.owner_id !== ownerId) return { error: 'not_owner' };
  if (task.status !== 'active') return { error: 'not_active' };

  await dbRun(
    "UPDATE tasks SET status = 'paused', paused_at = datetime('now') WHERE id = ?",
    [taskId]
  );
  await logTaskAudit(taskId, ownerId, 'status', 'active', 'paused');
  return { success: true };
}

export async function resumeTask(taskId, ownerId) {
  const task = await getTaskById(taskId);
  if (!task) return { error: 'not_found' };
  if (task.owner_id !== ownerId) return { error: 'not_owner' };
  if (task.status !== 'paused') return { error: 'not_paused' };

  await dbRun(
    "UPDATE tasks SET status = 'active', paused_at = NULL WHERE id = ?",
    [taskId]
  );
  await logTaskAudit(taskId, ownerId, 'status', 'paused', 'active');
  return { success: true };
}

export async function updateTask(taskId, ownerId, fields) {
  const task = await getTaskById(taskId);
  if (!task) return { error: 'not_found' };
  if (task.owner_id !== ownerId) return { error: 'not_owner' };

  const allowed = ['bot_name', 'verification_instructions', 'proof_type'];
  const updates = [];
  const values = [];
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k)) {
      updates.push(`${k} = ?`);
      values.push(v);
      await logTaskAudit(taskId, ownerId, k, task[k], v);
    }
  }
  if (!updates.length) return { error: 'no_valid_fields' };
  values.push(taskId);
  await dbRun(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values);
  return { success: true, task: await getTaskById(taskId) };
}

export async function hideTask(taskId, userId) {
  try {
    await dbRun(
      'INSERT OR IGNORE INTO hidden_tasks (user_id, task_id) VALUES (?, ?)',
      [userId, taskId]
    );
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

export async function refundTask(taskId, adminId) {
  const task = await getTaskById(taskId);
  if (!task) return { error: 'not_found' };

  // Count pending submissions to exclude from refund calculation
  const pendingCount = await dbGet(
    "SELECT COUNT(*) as c FROM task_submissions WHERE task_id = ? AND status = 'pending'",
    [taskId]
  );

  const remaining = task.required_count - task.completed_count;
  if (remaining > 0) {
    if (task.task_type === 'paid') {
      const refundAmount = remaining * task.reward_per_user;
      await adjustBalance(task.owner_id, refundAmount);
    } else {
      const pointsCost = parseInt(await getSetting('exchange_points_cost', '3'));
      await adjustPoints(task.owner_id, remaining * pointsCost);
    }
  }

  await dbRun("UPDATE tasks SET status = 'cancelled' WHERE id = ?", [taskId]);
  if (adminId) await logTaskAudit(taskId, adminId, 'status', task.status, 'cancelled');
  return { success: true };
}

export async function expireOldTasks() {
  const expiryDays = parseInt(await getSetting('task_expiry_days', '7'));
  const expired = await dbAll(
    `SELECT id FROM tasks WHERE status IN ('active','paused')
     AND created_at <= datetime('now', ?)`,
    [`-${expiryDays} days`]
  );

  for (const task of expired) {
    await refundTask(task.id, null);
    await dbRun("UPDATE tasks SET status = 'expired' WHERE id = ?", [task.id]);
  }
  return expired.length;
}

export async function getTaskAudit(taskId) {
  return dbAll('SELECT * FROM task_audit WHERE task_id = ? ORDER BY created_at DESC', [taskId]);
}

async function logTaskAudit(taskId, changedBy, fieldName, oldValue, newValue) {
  await dbRun(
    'INSERT INTO task_audit (task_id, changed_by, field_name, old_value, new_value) VALUES (?, ?, ?, ?, ?)',
    [taskId, changedBy, fieldName, String(oldValue), String(newValue)]
  );
}

export async function getAdminPendingTasksCount() {
  const row = await dbGet(
    "SELECT COUNT(*) as c FROM task_submissions WHERE status = 'pending'",
    []
  );
  return row.c;
}
