import { liftExpiredBans } from '../services/banService.js';
import { dbRun } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Every 10 minutes: lift expired temporary bans + restrictions.
 */
export async function liftExpiredBansAndRestrictions() {
  try {
    const liftedBans = await liftExpiredBans();
    if (liftedBans > 0) logger.info(`[Job] Lifted ${liftedBans} expired bans.`);

    // Lift expired restrictions
    const result = await dbRun(
      `UPDATE restrictions SET status = 'expired'
       WHERE status = 'active' AND end_date IS NOT NULL AND end_date <= datetime('now')`
    );
    if (result.changes > 0) logger.info(`[Job] Expired ${result.changes} restrictions.`);
  } catch (err) {
    logger.error('[Job] liftExpiredBansAndRestrictions error:', { err: err.message });
  }
}
