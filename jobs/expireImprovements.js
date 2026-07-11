import { dbAll, dbRun } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Every 5 minutes: expire improvement windows that have passed their deadline.
 * Converts can_retry submissions with expired deadlines to final rejections.
 */
export async function expireImprovements() {
  try {
    const expired = await dbAll(
      `SELECT id, task_id FROM task_submissions
       WHERE can_retry = 1 AND improvement_deadline IS NOT NULL
         AND improvement_deadline <= datetime('now')`,
      []
    );

    for (const sub of expired) {
      await dbRun(
        `UPDATE task_submissions SET can_retry = 0, improvement_deadline = NULL WHERE id = ?`,
        [sub.id]
      );
      // No further decrement — completed_count was decremented when retry rejection happened
      logger.info('[Job] Expired improvement window:', { submissionId: sub.id });
    }

    if (expired.length > 0) {
      logger.info(`[Job] expireImprovements: processed ${expired.length} expired windows.`);
    }
  } catch (err) {
    logger.error('[Job] expireImprovements error:', { err: err.message });
  }
}
