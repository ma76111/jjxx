import dotenv from 'dotenv';
dotenv.config();

export const config = {
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  BOT_NAME: process.env.BOT_NAME || 'your_bot',
  ADMIN_IDS: (process.env.ADMIN_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number),
  MAIN_ADMIN_ID: Number(process.env.MAIN_ADMIN_ID) || 0,
  DATABASE_PATH: process.env.DATABASE_PATH || './bot.db',
  BINANCE_API_KEY: process.env.BINANCE_API_KEY || '',
  BINANCE_API_SECRET: process.env.BINANCE_API_SECRET || '',
  GITHUB_BACKUP_TOKEN: process.env.GITHUB_BACKUP_TOKEN || '',
  GITHUB_BACKUP_REPO: process.env.GITHUB_BACKUP_REPO || '',
};

export function isMainAdmin(telegramId) {
  return Number(telegramId) === config.MAIN_ADMIN_ID;
}

export function isAdminId(telegramId) {
  return (
    Number(telegramId) === config.MAIN_ADMIN_ID ||
    config.ADMIN_IDS.includes(Number(telegramId))
  );
}
