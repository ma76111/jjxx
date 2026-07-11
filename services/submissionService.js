import { dbGet, dbAll, dbRun } from '../config/database.js';
import { adjustBalance, adjustPoints, findUserById } from './userService.js';
import { getTaskById } from './taskService.js';
import { getSetting } from './settingsService.js';
import { addViolation } from './violationService.js';
import { createNotification } from './notificationService.js';
import { processingSubmissions } from '../utils/state.js';
import { checkCrossAccountTask, recordTaskExecution } from './antiFraudService.js';
import { logger } from '../utils/logger.js';

export async function getSubmissionById(id) {
  return dbGet('SELECT * FROM task_submissions WHERE id = ?', [id]);
}

export async function getUserSubmission(taskId, userId) {
  return dbGet('SELECT * FROM task_submissions WHERE task_id = ? AND user_id = ?', [taskId, userId]);
}

export async function getUserSubmissions(userId) {
  return dbAll(
    `SELECT ts.*, t.bot_name, t.task_type, t.reward_per_user
     FROM task_submissions ts
     JOIN tasks t ON ts.task_id = t.id
     WHERE ts.user_id = ? ORDER BY ts.created_at DESC`,
    [userId]
  );
}

export async function getPendingSubmissions(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll(
      `SELECT ts.*, u.username, u.telegram_id, t.bot_name, t.task_type, t.reward_per_user
       FROM task_submissions ts
       JOIN users u ON ts.user_id = u.id
       JOIN tasks t ON ts.task_id = t.id
       WHERE ts.status = 'pending'
       ORDER BY ts.created_at ASC LIMIT ? OFFSET ?`,
      [limit, offset]
    ),
    dbGet("SELECT COUNT(*) as c FROM task_submissions WHERE status = 'pending'"),
  ]);
  return { rows, total: total.c, page };
}

/**
 * Submit proof for a task.
 * IMPORTANT: completed_count increases here (on submit), not on accept.
 * Supports optional ip/userAgent for cross-account fraud detection.
 */
export async function submitProof({ taskId, userId, proofText, proofImages, ip = null, userAgent = null }) {
  // Race condition guard
  const lockKey = `${taskId}_${userId}`;
  if (processingSubmissions.has(lockKey)) {
    return { error: 'already_processing' };
  }
  processingSubmissions.add(lockKey);

  try {
    const task = await getTaskById(taskId);
    if (!task) return { error: 'task_not_found' };
    if (task.status !== 'active') return { error: 'task_not_active' };
    if (task.owner_id === userId) return { error: 'own_task' };
    if (task.completed_count >= task.required_count) return { error: 'task_full' };

    // ── Anti-fraud: cross-account check ──
    if (ip || userAgent) {
      const fraudCheck = await checkCrossAccountTask(taskId, userId, ip, userAgent);
      if (!fraudCheck.allowed) {
        return { error: 'duplicate_device_fraud' };
      }
    }

    const existing = await getUserSubmission(taskId, userId);
    if (existing) {
      // Allow resubmit if can_retry and deadline not passed
      if (existing.can_retry && existing.improvement_deadline) {
        if (new Date(existing.improvement_deadline) > new Date()) {
          await dbRun(
            `UPDATE task_submissions SET proof_text = ?, proof_images = ?, status = 'pending',
             can_retry = 0, improvement_deadline = NULL, reject_type = NULL, reject_message = NULL
             WHERE id = ?`,
            [proofText || null, proofImages ? JSON.stringify(proofImages) : null, existing.id]
          );
          return { submission_id: existing.id, status: 'pending' };
        }
      }
      return { error: 'already_submitted' };
    }

    // Increment completed_count on submit
    await dbRun('UPDATE tasks SET completed_count = completed_count + 1 WHERE id = ?', [taskId]);

    const result = await dbRun(
      `INSERT INTO task_submissions (task_id, user_id, proof_text, proof_images)
       VALUES (?, ?, ?, ?)`,
      [taskId, userId, proofText || null, proofImages ? JSON.stringify(proofImages) : null]
    );

    // Notify task owner
    const owner = await findUserById(task.owner_id);
    if (owner) {
      await createNotification({
        userId: owner.id,
        type: 'new_submission',
        title: 'إثبات جديد',
        body: `إثبات جديد للمهمة #${taskId}`,
        link: `/tasks/${taskId}/submissions`,
      });
    }

    // Record in fraud log for cross-account detection
    if (ip || userAgent) {
      const { generateFingerprint } = await import('./deviceFingerprintService.js');
      const fingerprint = generateFingerprint(ip, userAgent);
      if (fingerprint) await recordTaskExecution(taskId, userId, fingerprint, ip);
    }

    return { submission_id: result.lastID, status: 'pending' };
  } finally {
    processingSubmissions.delete(lockKey);
  }
}

/**
 * Accept a submission.
 * completed_count stays as-is (was incremented on submit).
 */
export async function acceptSubmission(submissionId, reviewerId) {
  const sub = await getSubmissionById(submissionId);
  if (!sub) return { error: 'not_found' };
  if (sub.status === 'accept') return { error: 'already_accepted' };

  const task = await getTaskById(sub.task_id);
  if (!task) return { error: 'task_not_found' };

  // Add reward to executor
  if (task.task_type === 'paid') {
    await adjustBalance(sub.user_id, task.reward_per_user);
    await createNotification({
      userId: sub.user_id,
      type: 'submission_accepted',
      title: 'تم قبول إثباتك',
      body: `تم قبول إثباتك للمهمة #${task.id} وإضافة ${task.reward_per_user} USDT لرصيدك.`,
    });
  } else {
    await adjustPoints(sub.user_id, 1);
    await createNotification({
      userId: sub.user_id,
      type: 'submission_accepted',
      title: 'تم قبول إثباتك',
      body: `تم قبول إثباتك للمهمة #${task.id} وإضافة نقطة تبادل.`,
    });
  }

  await dbRun(
    `UPDATE task_submissions
     SET status = 'accept', reviewed_by = ?, reviewed_at = datetime('now'), proof_images = NULL
     WHERE id = ?`,
    [reviewerId, submissionId]
  );

  // Check if task is now complete
  if (task.completed_count >= task.required_count) {
    await dbRun("UPDATE tasks SET status = 'completed' WHERE id = ?", [task.id]);
    await createNotification({
      userId: task.owner_id,
      type: 'task_completed',
      title: 'اكتملت مهمتك',
      body: `المهمة #${task.id} اكتملت بنجاح.`,
    });
  }

  return { success: true };
}

/**
 * Reject a submission.
 * - 'retry': set can_retry=1, improvement_deadline, decrement completed_count
 * - 'final': decrement completed_count, add violation
 */
export async function rejectSubmission(submissionId, reviewerId, rejectType, rejectMessage) {
  const sub = await getSubmissionById(submissionId);
  if (!sub) return { error: 'not_found' };
  if (sub.status !== 'pending') return { error: 'not_pending' };

  const task = await getTaskById(sub.task_id);

  if (rejectType === 'retry') {
    const improvementTimeout = parseInt(await getSetting('improvement_timeout', '900'));
    const deadline = new Date(Date.now() + improvementTimeout * 1000).toISOString();

    await dbRun(
      `UPDATE task_submissions
       SET status = 'reject', reject_type = 'retry', reject_message = ?, can_retry = 1,
           improvement_deadline = ?, reviewed_by = ?, reviewed_at = datetime('now')
       WHERE id = ?`,
      [rejectMessage || null, deadline, reviewerId, submissionId]
    );

    // Decrement completed_count on rejection
    await dbRun('UPDATE tasks SET completed_count = MAX(0, completed_count - 1) WHERE id = ?', [sub.task_id]);

    await createNotification({
      userId: sub.user_id,
      type: 'submission_rejected',
      title: 'تم رفض إثباتك مؤقتاً',
      body: `${rejectMessage || ''} — لديك وقت لإعادة الإرسال.`,
    });

    return { success: true, can_retry: true, improvement_deadline: deadline };
  } else {
    // Final rejection
    await dbRun(
      `UPDATE task_submissions
       SET status = 'reject', reject_type = 'final', reject_message = ?, can_retry = 0,
           reviewed_by = ?, reviewed_at = datetime('now')
       WHERE id = ?`,
      [rejectMessage || null, reviewerId, submissionId]
    );

    // Decrement completed_count on rejection
    await dbRun('UPDATE tasks SET completed_count = MAX(0, completed_count - 1) WHERE id = ?', [sub.task_id]);

    // Add SUBMISSION_REJECTED violation to user
    await addViolation(sub.user_id, 'SUBMISSION_REJECTED', 'trust', `Final rejection on task #${sub.task_id}`);

    await createNotification({
      userId: sub.user_id,
      type: 'submission_rejected',
      title: 'تم رفض إثباتك نهائياً',
      body: rejectMessage || '',
    });

    return { success: true, can_retry: false };
  }
}

export async function getTaskSubmissions(taskId, ownerId) {
  const task = await getTaskById(taskId);
  if (!task) return { error: 'not_found' };
  if (task.owner_id !== ownerId) return { error: 'not_owner' };

  return dbAll(
    `SELECT ts.*, u.username, u.telegram_id
     FROM task_submissions ts JOIN users u ON ts.user_id = u.id
     WHERE ts.task_id = ?
     ORDER BY ts.created_at DESC`,
    [taskId]
  );
}
