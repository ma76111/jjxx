import { copyFileSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { readFileSync } from 'fs';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUPS_DIR = join(__dirname, '..', 'backups');
const DB_PATH = config.DATABASE_PATH;
const MAX_LOCAL_BACKUPS = 48;

try { mkdirSync(BACKUPS_DIR, { recursive: true }); } catch {}

export function createLocalBackup() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = join(BACKUPS_DIR, `bot_${ts}.db`);
  try {
    copyFileSync(DB_PATH, dest);
    logger.info('[Backup] Local backup created:', dest);
    pruneLocalBackups();
  } catch (err) {
    logger.error('[Backup] Local backup failed:', { err: err.message });
  }
}

function pruneLocalBackups() {
  try {
    const files = readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.db'))
      .map(f => ({ name: f, time: statSync(join(BACKUPS_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    const toDelete = files.slice(MAX_LOCAL_BACKUPS);
    for (const f of toDelete) {
      unlinkSync(join(BACKUPS_DIR, f.name));
      logger.info('[Backup] Pruned old backup:', f.name);
    }
  } catch (err) {
    logger.error('[Backup] Prune error:', { err: err.message });
  }
}

export async function backupToGithub() {
  if (!config.GITHUB_BACKUP_TOKEN || !config.GITHUB_BACKUP_REPO) {
    logger.info('[Backup] GitHub backup skipped — no credentials configured.');
    return;
  }

  try {
    const [owner, repo] = config.GITHUB_BACKUP_REPO.split('/');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = `backups/bot_${ts}.db`;
    const content = readFileSync(DB_PATH);
    const base64 = content.toString('base64');

    await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        message: `Backup ${ts}`,
        content: base64,
      },
      {
        headers: {
          Authorization: `token ${config.GITHUB_BACKUP_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
        timeout: 30000,
      }
    );

    logger.info('[Backup] GitHub backup uploaded:', filePath);
  } catch (err) {
    logger.error('[Backup] GitHub backup failed:', { err: err.message });
  }
}
