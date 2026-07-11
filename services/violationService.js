import { dbGet, dbAll, dbRun } from '../config/database.js';
import { findUserById, updateUser } from './userService.js';
import { createNotification } from './notificationService.js';
import { logger } from '../utils/logger.js';

/**
 * Fetch violation type settings from DB (admin-controlled).
 */
export async function getViolationTypeSetting(track, typeKey) {
  return dbGet(
    'SELECT * FROM violation_settings WHERE track = ? AND type_key = ? AND is_active = 1',
    [track, typeKey]
  );
}

/**
 * Get all thresholds for a track, ordered by min_points.
 */
export async function getThresholds(track) {
  return dbAll(
    'SELECT * FROM violation_thresholds WHERE track = ? ORDER BY min_points ASC',
    [track]
  );
}

/**
 * Calculate active violation points for a user on a specific track.
 * Only counts violations where expires_at IS NULL (permanent) or expires_at > now,
 * AND status = 'active'.
 */
export async function getActivePoints(userId, track) {
  const row = await dbGet(
    `SELECT COALESCE(SUM(points), 0) as total
     FROM violations
     WHERE user_id = ? AND track = ? AND status = 'active'
       AND (expires_at IS NULL OR expires_at > datetime('now'))`,
    [userId, track]
  );
  return row.total;
}

/**
 * Add a violation to a user.
 * Checks grace settings for first offense.
 */
export async function addViolation(userId, typeKey, track, reason = null) {
  const user = await findUserById(userId);
  if (!user) return;

  const typeSetting = await getViolationTypeSetting(track, typeKey);
  if (!typeSetting) {
    logger.warn('[Violation] Unknown violation type:', { typeKey, track });
    return;
  }

  // First offense grace check (trust track only)
  if (track === 'trust') {
    const graceRow = await dbGet('SELECT * FROM violation_grace_settings WHERE id = 1');
    if (graceRow && graceRow.is_enabled) {
      const accountAgeDays = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 86400);
      const existingViolations = await dbGet(
        "SELECT COUNT(*) as c FROM violations WHERE user_id = ? AND status != 'dismissed'",
        [userId]
      );
      if (existingViolations.c === 0 && accountAgeDays >= graceRow.min_account_age_days) {
        // Grace: warn only, no actual points
        await createNotification({
          userId,
          type: 'system_update',
          title: '⚠️ تحذير',
          body: 'تم تسجيل تحذير أول على حسابك (لن تُخصم نقاط هذه المرة).',
        });
        logger.info('[Violation] First offense grace applied:', { userId, typeKey });
        return;
      }
    }
  }

  const points = typeSetting.points;
  const expiresAt = typeSetting.expiry_days
    ? new Date(Date.now() + typeSetting.expiry_days * 86400 * 1000).toISOString()
    : null;

  const status = typeKey === 'REPORT_RECEIVED' ? 'pending' : 'active';

  await dbRun(
    `INSERT INTO violations (user_id, type, points, track, reason, expires_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, typeKey, points, track, reason, expiresAt, status]
  );

  if (status === 'active') {
    await applyViolationConsequences(userId, track);
  }
}

/**
 * Confirm a pending REPORT_RECEIVED violation → activate it and apply consequences.
 */
export async function confirmReport(violationId, adminId) {
  const v = await dbGet('SELECT * FROM violations WHERE id = ?', [violationId]);
  if (!v || v.status !== 'pending') return { error: 'not_found_or_not_pending' };

  await dbRun(
    "UPDATE violations SET status = 'active' WHERE id = ?",
    [violationId]
  );
  await applyViolationConsequences(v.user_id, v.track);
  return { success: true };
}

export async function dismissReport(violationId, adminId) {
  const v = await dbGet('SELECT * FROM violations WHERE id = ?', [violationId]);
  if (!v) return { error: 'not_found' };
  await dbRun("UPDATE violations SET status = 'dismissed' WHERE id = ?", [violationId]);
  return { success: true };
}

/**
 * Apply consequences based on active points vs thresholds.
 */
export async function applyViolationConsequences(userId, track) {
  const user = await findUserById(userId);
  if (!user) return;

  const activePoints = await getActivePoints(userId, track);
  const thresholds = await getThresholds(track);

  // Find highest matching threshold
  let matchedAction = null;
  for (const threshold of thresholds) {
    if (activePoints >= threshold.min_points) {
      if (threshold.max_points === null || activePoints <= threshold.max_points) {
        matchedAction = threshold.action;
      } else {
        matchedAction = threshold.action; // continue to higher ones
      }
    }
  }

  if (!matchedAction) return;

  logger.info('[Violation] Applying consequence:', { userId, track, activePoints, action: matchedAction });

  switch (matchedAction) {
    case 'warning':
      await createNotification({
        userId,
        type: 'system_update',
        title: '⚠️ تحذير مخالفة',
        body: `لديك ${activePoints} نقطة مخالفة. راجع سلوكك.`,
      });
      break;

    case 'forced_manual_review':
      await updateUser(userId, { restrictions: JSON.stringify(['forced_manual_review']) });
      break;

    case 'daily_withdrawal_cap':
      await updateUser(userId, { restrictions: JSON.stringify(['daily_withdrawal_cap', 'forced_manual_review']) });
      break;

    case 'task_creation_block_7d': {
      const end = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
      await dbRun(
        `INSERT INTO restrictions (user_id, type, duration, end_date, reason)
         VALUES (?, 'task_creation_block', 7, ?, 'Violation threshold reached')`,
        [userId, end]
      );
      break;
    }

    case 'escalate_to_admin_review':
      await updateUser(userId, { ban_status: 'under_review' });
      await createNotification({
        userId,
        type: 'system_update',
        title: 'حسابك قيد المراجعة',
        body: 'تم تصعيد حسابك لمراجعة الأدمن بسبب تراكم المخالفات.',
      });
      break;

    case 'temporary_ban_3d':
      await applyTemporaryBan(userId, 3, track);
      break;

    case 'temporary_ban_7d':
      await applyTemporaryBan(userId, 7, track);
      break;

    case 'freeze_pending_review':
      await updateUser(userId, { ban_status: 'frozen_pending_review' });
      await createNotification({
        userId,
        type: 'system_update',
        title: '🔒 تم تجميد حسابك',
        body: 'تم تجميد حسابك بسبب مخالفات أمنية. يرجى انتظار مراجعة الأدمن.',
      });
      break;
  }

  // Update user violation_points (total across all tracks for display)
  const totalPoints = await getActivePoints(userId, 'trust') + await getActivePoints(userId, 'security');
  await updateUser(userId, {
    violation_points: totalPoints,
    last_violation_date: new Date().toISOString(),
  });
}

async function applyTemporaryBan(userId, days, reason) {
  const user = await findUserById(userId);
  const endDate = new Date(Date.now() + days * 86400 * 1000).toISOString();

  await dbRun(
    `INSERT INTO bans (user_id, type, duration, reason, banned_by, end_date)
     VALUES (?, 'temporary', ?, ?, 0, ?)`,
    [userId, days, `Security violation threshold reached`, endDate]
  );
  await updateUser(userId, {
    is_banned: 1,
    ban_status: 'temporary',
    ban_expires_at: endDate,
  });
  await createNotification({
    userId,
    type: 'system_update',
    title: '🚫 تم حظرك مؤقتاً',
    body: `تم حظر حسابك لمدة ${days} أيام.`,
  });
}

/**
 * Expire a violation manually (admin action).
 */
export async function expireViolationNow(userId, violationId) {
  const v = await dbGet('SELECT * FROM violations WHERE id = ? AND user_id = ?', [violationId, userId]);
  if (!v) return { error: 'not_found' };
  await dbRun(
    "UPDATE violations SET status = 'expired', expires_at = datetime('now') WHERE id = ?",
    [violationId]
  );
  // Re-evaluate consequences
  await applyViolationConsequences(userId, v.track);
  return { success: true };
}

/**
 * Restore a dismissed/expired violation.
 */
export async function restoreViolation(userId, violationId) {
  const v = await dbGet('SELECT * FROM violations WHERE id = ? AND user_id = ?', [violationId, userId]);
  if (!v) return { error: 'not_found' };
  await dbRun(
    "UPDATE violations SET status = 'active' WHERE id = ?",
    [violationId]
  );
  await applyViolationConsequences(userId, v.track);
  return { success: true };
}

export async function getUserViolations(userId) {
  return dbAll(
    `SELECT * FROM violations WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
}

/**
 * Expire old violations past their expires_at date.
 */
export async function expireOldViolations() {
  const result = await dbRun(
    `UPDATE violations SET status = 'expired'
     WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= datetime('now')`
  );
  return result.changes;
}

/**
 * Get violation settings for admin panel.
 */
export async function getViolationSettings() {
  const [types, thresholds, grace] = await Promise.all([
    dbAll('SELECT * FROM violation_settings ORDER BY track, type_key'),
    dbAll('SELECT * FROM violation_thresholds ORDER BY track, min_points'),
    dbGet('SELECT * FROM violation_grace_settings WHERE id = 1'),
  ]);
  return { types, thresholds, grace };
}

export async function updateViolationType(track, typeKey, updates) {
  const allowed = ['points', 'expiry_days', 'description', 'is_active'];
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(updates)) {
    if (allowed.includes(k)) { sets.push(`${k} = ?`); vals.push(v); }
  }
  if (!sets.length) return { error: 'no_valid_fields' };
  vals.push(track, typeKey);
  await dbRun(`UPDATE violation_settings SET ${sets.join(', ')} WHERE track = ? AND type_key = ?`, vals);
  return { success: true };
}

export async function addViolationType(track, typeKey, points, expiryDays, description) {
  try {
    await dbRun(
      'INSERT INTO violation_settings (track, type_key, points, expiry_days, description) VALUES (?, ?, ?, ?, ?)',
      [track, typeKey, points, expiryDays || null, description || null]
    );
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

export async function deleteViolationType(track, typeKey) {
  await dbRun(
    'UPDATE violation_settings SET is_active = 0 WHERE track = ? AND type_key = ?',
    [track, typeKey]
  );
  return { success: true };
}

export async function updateThresholds(track, thresholds) {
  // Replace all thresholds for this track
  await dbRun('DELETE FROM violation_thresholds WHERE track = ?', [track]);
  for (const t of thresholds) {
    await dbRun(
      'INSERT INTO violation_thresholds (track, min_points, max_points, action) VALUES (?, ?, ?, ?)',
      [track, t.min_points, t.max_points ?? null, t.action]
    );
  }
  return { success: true };
}

export async function updateGraceSettings(isEnabled, minAccountAgeDays) {
  await dbRun(
    `UPDATE violation_grace_settings SET is_enabled = ?, min_account_age_days = ?, updated_at = datetime('now') WHERE id = 1`,
    [isEnabled ? 1 : 0, minAccountAgeDays]
  );
  return { success: true };
}

export async function getSecurityReviewQueue() {
  const [pendingReports, frozenAccounts] = await Promise.all([
    dbAll(
      `SELECT v.id, v.user_id, v.reason, v.created_at,
              (SELECT COUNT(*) FROM reports WHERE reported_user_id = v.user_id AND status = 'pending') as reports_count
       FROM violations v
       WHERE v.type = 'REPORT_RECEIVED' AND v.status = 'pending'
       ORDER BY v.created_at ASC`
    ),
    dbAll(
      `SELECT u.id as user_id, u.username, u.telegram_id, u.ban_status,
              (SELECT COALESCE(SUM(points),0) FROM violations WHERE user_id = u.id AND track = 'security' AND status = 'active') as security_points
       FROM users u WHERE u.ban_status = 'frozen_pending_review'`
    ),
  ]);
  return { pending_reports: pendingReports, frozen_accounts: frozenAccounts };
}

export async function confirmPermanentBan(userId, adminId, note) {
  const user = await findUserById(userId);
  if (!user) return { error: 'not_found' };

  const endDate = null; // permanent
  await dbRun(
    `INSERT INTO bans (user_id, type, reason, banned_by)
     VALUES (?, 'permanent', ?, ?)`,
    [userId, note || 'Security violations confirmed', adminId]
  );
  await updateUser(userId, {
    is_banned: 1,
    ban_status: 'permanent',
    ban_expires_at: null,
  });
  await createNotification({
    userId,
    type: 'system_update',
    title: '🚫 حظر دائم',
    body: 'تم حظر حسابك بشكل دائم.',
  });
  return { success: true };
}

export async function releaseFrozenAccount(userId, adminId) {
  await updateUser(userId, { ban_status: 'none' });
  return { success: true };
}
