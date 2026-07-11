import { runDuplicateAccountDetection } from '../services/antiFraudService.js';
import logger from '../utils/logger.js';

/**
 * Every 30 minutes: scan fraud_task_log for cross-account task execution.
 * Adds MULTIPLE_ACCOUNTS violations automatically.
 */
export async function detectFraud() {
  try {
    const count = await runDuplicateAccountDetection();
    if (count > 0) logger.warn(`[Job] detectFraud: flagged ${count} users for multi-account fraud.`);
  } catch (err) {
    logger.error('[Job] detectFraud error:', { err: err.message });
  }
}
