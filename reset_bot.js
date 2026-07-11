/**
 * WARNING: This script completely wipes bot.db.
 * Only use in development/testing.
 */
import { unlinkSync, existsSync } from 'fs';
import { config } from './config/index.js';
import logger from './utils/logger.js';

const DB_PATH = config.DATABASE_PATH;

if (existsSync(DB_PATH)) {
  unlinkSync(DB_PATH);
  logger.info('[Reset] Database deleted:', DB_PATH);
} else {
  logger.info('[Reset] No database file found at:', DB_PATH);
}

logger.info('[Reset] Done. Run "node index.js" to reinitialize.');
