import { backupToGithub } from './services/backupService.js';
import { initDb } from './config/database.js';
import logger from './utils/logger.js';

initDb();
logger.info('[Backup] Running manual GitHub backup...');
await backupToGithub();
logger.info('[Backup] Done.');
