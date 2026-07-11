import { expireOldTasks } from '../services/taskService.js';
import logger from '../utils/logger.js';

/**
 * Every 6 hours: expire tasks older than task_expiry_days and refund owners.
 */
export async function runExpireOldTasks() {
  try {
    const count = await expireOldTasks();
    if (count > 0) logger.info(`[Job] Expired and refunded ${count} old tasks.`);
  } catch (err) {
    logger.error('[Job] expireOldTasks error:', { err: err.message });
  }
}
