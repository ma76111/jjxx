import { expireOldViolations } from '../services/violationService.js';
import logger from '../utils/logger.js';

/**
 * Every 24 hours: expire violations that have passed their expires_at date.
 * Rehabilitation is based on individual violation expiry (not a flat daily deduction).
 */
export async function rehabilitateUsers() {
  try {
    const count = await expireOldViolations();
    if (count > 0) logger.info(`[Job] rehabilitateUsers: expired ${count} violations.`);
  } catch (err) {
    logger.error('[Job] rehabilitateUsers error:', { err: err.message });
  }
}
