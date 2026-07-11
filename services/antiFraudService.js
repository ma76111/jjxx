import { dbGet, dbAll, dbRun } from '../config/database.js';
import { generateFingerprint } from './deviceFingerprintService.js';
import { addViolation } from './violationService.js';
import { banUser } from './banService.js';
import { createNotification } from './notificationService.js';
import logger from '../utils/logger.js';

// ────────────────────────────────────────────────────────────
// 1. Terms acceptance
// ────────────────────────────────────────────────────────────

export async function hasAcceptedTerms(userId) {
  const row = await dbGet('SELECT user_id FROM anti_fraud_accepted WHERE user_id = ?', [userId]);
  return !!row;
}

export async function acceptTerms(userId, ip = null) {
  await dbRun(
    `INSERT OR IGNORE INTO anti_fraud_accepted (user_id, ip_address) VALUES (?, ?)`,
    [userId, ip]
  );
}

// ────────────────────────────────────────────────────────────
// 2. Cross-account task execution guard
//    Blocks a user from executing a task if another account
//    on the same device (fingerprint) already executed it.
// ────────────────────────────────────────────────────────────

export async function checkCrossAccountTask(taskId, userId, ip, userAgent) {
  const fingerprint = generateFingerprint(ip, userAgent);
  if (!fingerprint) return { allowed: true };

  // Has this fingerprint already executed this task (from any account)?
  const existingExecution = await dbGet(
    `SELECT ftl.user_id FROM fraud_task_log ftl
     WHERE ftl.task_id = ? AND ftl.fingerprint = ? AND ftl.user_id != ?`,
    [taskId, fingerprint, userId]
  );

  if (existingExecution) {
    logger.warn('[AntiFraud] Cross-account task execution blocked:', {
      taskId, userId, existingUserId: existingExecution.user_id, fingerprint: fingerprint.slice(0, 8)
    });

    // Add fraud violation to the blocking account
    await addViolation(userId, 'FRAUD_ATTEMPT', 'security',
      `Cross-account task execution: task #${taskId}, linked to user #${existingExecution.user_id}`);

    return { allowed: false, reason: 'duplicate_device' };
  }

  return { allowed: true, fingerprint };
}

export async function recordTaskExecution(taskId, userId, fingerprint, ip) {
  try {
    await dbRun(
      `INSERT OR IGNORE INTO fraud_task_log (task_id, user_id, fingerprint, ip_address)
       VALUES (?, ?, ?, ?)`,
      [taskId, userId, fingerprint, ip]
    );
  } catch (err) {
    logger.error('[AntiFraud] Failed to record task execution:', err.message);
  }
}

// ────────────────────────────────────────────────────────────
// 3. Shared-IP detection (same network suspicion)
//    Returns all users who share the same public IP right now
// ────────────────────────────────────────────────────────────

export async function getUsersOnSameIp(ip, excludeUserId) {
  if (!ip) return [];
  const rows = await dbAll(
    `SELECT DISTINCT user_id FROM device_logs
     WHERE ip_address = ? AND user_id != ?
       AND created_at >= datetime('now', '-24 hours')`,
    [ip, excludeUserId]
  );
  return rows.map(r => r.user_id);
}

// ────────────────────────────────────────────────────────────
// 4. Duplicate-account auto-ban algorithm
//    Runs periodically: if two accounts share same fingerprint
//    AND both executed the same task → ban both for fraud.
// ────────────────────────────────────────────────────────────

export async function runDuplicateAccountDetection() {
  // Find fingerprints with multiple distinct users who executed the SAME task
  const suspicious = await dbAll(`
    SELECT ftl.fingerprint, ftl.task_id, COUNT(DISTINCT ftl.user_id) as user_count,
           GROUP_CONCAT(DISTINCT ftl.user_id) as user_ids
    FROM fraud_task_log ftl
    GROUP BY ftl.fingerprint, ftl.task_id
    HAVING user_count > 1
  `);

  let actioned = 0;

  for (const row of suspicious) {
    const userIds = row.user_ids.split(',').map(Number);

    for (const uid of userIds) {
      const user = await dbGet('SELECT id, is_banned, ban_status FROM users WHERE id = ?', [uid]);
      if (!user || user.is_banned) continue;

      // Add MULTIPLE_ACCOUNTS violation
      await addViolation(uid, 'MULTIPLE_ACCOUNTS', 'security',
        `Shared fingerprint executed task #${row.task_id} from ${row.user_count} accounts`);

      await createNotification({
        userId: uid,
        type: 'system_update',
        title: '⚠️ تحذير أمني',
        body: 'تم رصد سلوك محتيال مرتبط بحسابك. راجع قواعد الاستخدام.',
      });

      actioned++;
      logger.warn('[AntiFraud] Duplicate account detected:', {
        userId: uid, taskId: row.task_id, fingerprint: row.fingerprint.slice(0, 8)
      });
    }
  }

  return actioned;
}

// ────────────────────────────────────────────────────────────
// 5. Check if new account shares device fingerprint
//    with an existing account — log for admin review
// ────────────────────────────────────────────────────────────

export async function checkNewUserDuplicateDevice(userId, ip, userAgent) {
  const fingerprint = generateFingerprint(ip, userAgent);
  if (!fingerprint) return;

  const existing = await dbGet(
    `SELECT DISTINCT user_id FROM device_logs
     WHERE fingerprint = ? AND user_id != ?
     LIMIT 1`,
    [fingerprint, userId]
  );

  if (existing) {
    logger.info('[AntiFraud] New user shares device fingerprint:', {
      newUser: userId, existingUser: existing.user_id
    });
    // Add a pending MULTIPLE_ACCOUNTS violation for review
    await addViolation(userId, 'MULTIPLE_ACCOUNTS', 'security',
      `New account shares device fingerprint with user #${existing.user_id}`);
  }
}
