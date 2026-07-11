import { cleanupStaleStates } from '../utils/state.js';
import { cleanupIdempotencyKeys } from '../services/adminService.js';
import { cleanupExpiredNotifications } from '../services/notificationService.js';
import { dbRun } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Every 5 minutes: clean up stale in-memory user states (> 30 min old).
 * Every hour: clean up expired idempotency keys and notifications.
 */
export async function runCleanupStaleStates() {
  try {
    const removed = cleanupStaleStates(30 * 60 * 1000);
    if (removed > 0) logger.info(`[Job] Cleaned ${removed} stale user states.`);
  } catch (err) {
    logger.error('[Job] cleanupStaleStates error:', { err: err.message });
  }
}

export async function runHourlyCleanup() {
  try {
    const keysCleaned = await cleanupIdempotencyKeys();
    if (keysCleaned > 0) logger.info(`[Job] Cleaned ${keysCleaned} idempotency keys.`);

    const notifsCleaned = await cleanupExpiredNotifications();
    if (notifsCleaned > 0) logger.info(`[Job] Cleaned ${notifsCleaned} expired notifications.`);

    // Cleanup old login_sessions (older than 1 hour regardless of status)
    const sessions = await dbRun(
      "DELETE FROM login_sessions WHERE created_at < datetime('now', '-1 hour')"
    );
    if (sessions.changes > 0) logger.info(`[Job] Cleaned ${sessions.changes} old login sessions.`);
  } catch (err) {
    logger.error('[Job] hourlyCleanup error:', { err: err.message });
  }
}

export async function markExpiredLoginSessions() {
  try {
    const result = await dbRun(
      `UPDATE login_sessions SET status = 'expired'
       WHERE status = 'pending' AND expires_at <= datetime('now')`
    );
    if (result.changes > 0) logger.info(`[Job] Marked ${result.changes} login sessions as expired.`);
  } catch (err) {
    logger.error('[Job] markExpiredLoginSessions error:', { err: err.message });
  }
}
