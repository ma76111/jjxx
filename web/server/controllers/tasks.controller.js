import { dbGet, dbAll, dbRun } from '../config/database.js';

export async function getAvailableTasks(req, res) {
  const userId = req.user.id;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const country = req.query.country || null;
  const limit = 10;
  const offset = (page - 1) * limit;

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

  if (country) {
    sql += ' AND (t.country_code IS NULL OR t.country_code = ?)';
    params.push(country);
  }

  sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [tasks, totalRow] = await Promise.all([
    dbAll(sql, params),
    dbGet(
      `SELECT COUNT(*) as c FROM tasks t WHERE t.status = 'active' AND t.owner_id != ?
         AND t.id NOT IN (SELECT task_id FROM hidden_tasks WHERE user_id = ?)
         AND t.id NOT IN (SELECT task_id FROM task_submissions WHERE user_id = ?)
         AND t.completed_count < t.required_count`,
      [userId, userId, userId]
    ),
  ]);

  return res.json({ page, total: totalRow.c, tasks });
}

export async function getMyTasks(req, res) {
  const tasks = await dbAll(
    'SELECT * FROM tasks WHERE owner_id = ? ORDER BY created_at DESC',
    [req.user.id]
  );
  return res.json({ tasks });
}

export async function getMySubmissions(req, res) {
  const rows = await dbAll(
    `SELECT ts.*, t.bot_name, t.task_type, t.reward_per_user
     FROM task_submissions ts
     JOIN tasks t ON ts.task_id = t.id
     WHERE ts.user_id = ? ORDER BY ts.created_at DESC`,
    [req.user.id]
  );
  return res.json({ submissions: rows });
}

export async function createTask(req, res) {
  const userId = req.user.id;
  const { task_type, bot_name, referral_link, required_count, reward_per_user, proof_type, verification_instructions } = req.body;

  // Validate required fields
  if (!task_type || !required_count) {
    return res.status(400).json({ success: false, error: 'missing_fields' });
  }

  const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);

  // Check active task limit
  const maxTasksSetting = await dbGet("SELECT value FROM settings WHERE key = 'max_tasks_per_user'");
  const maxTasks = parseInt(maxTasksSetting?.value || '2');
  const activeCount = await dbGet(
    "SELECT COUNT(*) as c FROM tasks WHERE owner_id = ? AND status IN ('active','paused')",
    [userId]
  );
  if (activeCount.c >= maxTasks) {
    return res.status(400).json({ success: false, error: 'max_tasks_reached', max: maxTasks });
  }

  const maxCountSetting = await dbGet("SELECT value FROM settings WHERE key = 'max_required_count'");
  const maxCount = parseInt(maxCountSetting?.value || '10');
  if (required_count > maxCount) {
    return res.status(400).json({ success: false, error: 'max_required_count_exceeded', max: maxCount });
  }

  const pointsCostSetting = await dbGet("SELECT value FROM settings WHERE key = 'exchange_points_cost'");
  const pointsCost = parseInt(pointsCostSetting?.value || '3');
  const totalCost = task_type === 'paid'
    ? (reward_per_user || 0) * required_count
    : pointsCost * required_count;

  if (task_type === 'paid') {
    if (user.balance < totalCost) {
      return res.status(402).json({ success: false, error: 'insufficient_balance', required: totalCost, available: user.balance });
    }
    await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [totalCost, userId]);
    await dbRun('INSERT INTO balance_history (user_id, balance) SELECT ?, balance FROM users WHERE id = ?', [userId, userId]);
  } else {
    if (user.exchange_points < totalCost) {
      return res.status(402).json({ success: false, error: 'insufficient_points', required: totalCost, available: user.exchange_points });
    }
    await dbRun('UPDATE users SET exchange_points = exchange_points - ? WHERE id = ?', [totalCost, userId]);
  }

  const result = await dbRun(
    `INSERT INTO tasks (owner_id, bot_name, referral_link, required_count, task_type, reward_per_user, verification_instructions, proof_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, bot_name || null, referral_link || null, required_count, task_type, reward_per_user || 0, verification_instructions || null, proof_type || 'images']
  );

  return res.status(201).json({ success: true, task_id: result.lastID, charged: totalCost });
}

export async function updateTask(req, res) {
  const userId = req.user.id;
  const taskId = parseInt(req.params.id);
  const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [taskId]);

  if (!task) return res.status(404).json({ success: false, error: 'not_found' });
  if (task.owner_id !== userId) return res.status(403).json({ success: false, error: 'forbidden_not_owner' });

  const allowed = ['bot_name', 'verification_instructions', 'proof_type'];
  const updates = [];
  const values = [];

  for (const [k, v] of Object.entries(req.body)) {
    if (allowed.includes(k)) { updates.push(`${k} = ?`); values.push(v); }
  }

  if (!updates.length) return res.status(400).json({ success: false, error: 'no_valid_fields' });

  values.push(taskId);
  await dbRun(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values);

  const updated = await dbGet('SELECT * FROM tasks WHERE id = ?', [taskId]);
  return res.json({ success: true, task: updated });
}

export async function pauseTask(req, res) {
  const userId = req.user.id;
  const taskId = parseInt(req.params.id);
  const task = await dbGet('SELECT * FROM tasks WHERE id = ? AND owner_id = ?', [taskId, userId]);
  if (!task) return res.status(404).json({ success: false, error: 'not_found' });
  if (task.status !== 'active') return res.status(400).json({ success: false, error: 'not_active' });

  await dbRun("UPDATE tasks SET status = 'paused', paused_at = datetime('now') WHERE id = ?", [taskId]);
  return res.json({ success: true });
}

export async function resumeTask(req, res) {
  const userId = req.user.id;
  const taskId = parseInt(req.params.id);
  const task = await dbGet('SELECT * FROM tasks WHERE id = ? AND owner_id = ?', [taskId, userId]);
  if (!task) return res.status(404).json({ success: false, error: 'not_found' });
  if (task.status !== 'paused') return res.status(400).json({ success: false, error: 'not_paused' });

  await dbRun("UPDATE tasks SET status = 'active', paused_at = NULL WHERE id = ?", [taskId]);
  return res.json({ success: true });
}

export async function hideTask(req, res) {
  const userId = req.user.id;
  const taskId = parseInt(req.params.id);
  await dbRun('INSERT OR IGNORE INTO hidden_tasks (user_id, task_id) VALUES (?, ?)', [userId, taskId]);
  return res.json({ success: true });
}

export async function submitProof(req, res) {
  const userId = req.user.id;
  const taskId = parseInt(req.params.id);
  const { proof_text, proof_images } = req.body;

  const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task || task.status !== 'active') return res.status(404).json({ success: false, error: 'task_not_found' });
  if (task.owner_id === userId) return res.status(400).json({ success: false, error: 'own_task' });
  if (task.completed_count >= task.required_count) return res.status(400).json({ success: false, error: 'task_full' });

  const existing = await dbGet('SELECT * FROM task_submissions WHERE task_id = ? AND user_id = ?', [taskId, userId]);
  if (existing) {
    if (existing.can_retry && existing.improvement_deadline && new Date(existing.improvement_deadline) > new Date()) {
      await dbRun(
        `UPDATE task_submissions SET proof_text = ?, proof_images = ?, status = 'pending',
         can_retry = 0, improvement_deadline = NULL WHERE id = ?`,
        [proof_text || null, proof_images ? JSON.stringify(proof_images) : null, existing.id]
      );
      return res.status(201).json({ success: true, submission_id: existing.id, status: 'pending' });
    }
    return res.status(409).json({ success: false, error: 'already_submitted' });
  }

  await dbRun('UPDATE tasks SET completed_count = completed_count + 1 WHERE id = ?', [taskId]);

  const result = await dbRun(
    'INSERT INTO task_submissions (task_id, user_id, proof_text, proof_images) VALUES (?, ?, ?, ?)',
    [taskId, userId, proof_text || null, proof_images ? JSON.stringify(proof_images) : null]
  );

  return res.status(201).json({ success: true, submission_id: result.lastID, status: 'pending' });
}

export async function getTaskAudit(req, res) {
  const userId = req.user.id;
  const taskId = parseInt(req.params.id);
  const task = await dbGet('SELECT * FROM tasks WHERE id = ? AND owner_id = ?', [taskId, userId]);
  if (!task) return res.status(404).json({ success: false, error: 'not_found' });

  const audit = await dbAll('SELECT * FROM task_audit WHERE task_id = ? ORDER BY created_at DESC', [taskId]);
  return res.json({ audit });
}

export async function getUserSettings(req, res) {
  const rows = await dbAll(
    `SELECT key, value FROM settings WHERE key IN (
      'max_required_count','max_tasks_per_user','task_timeout','improvement_timeout',
      'min_reward','min_external_reward','exchange_points_cost','min_withdrawal'
    )`
  );
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  return res.json(settings);
}
