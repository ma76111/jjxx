import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';

import { config } from './config/index.js';
import { initDb } from './config/database.js';
import { seedDatabase } from './db/seed.js';
import logger from './utils/logger.js';

import { handleStart } from './handlers/startHandler.js';
import { handleContact } from './handlers/contactHandler.js';
import { handleCallbackQuery } from './handlers/callbackRouter.js';
import { handleMenuButton, handleProfile, sendMainMenu } from './handlers/menuHandler.js';
import { handleTaskCreateMessage, handleTasksMenu, handleMyTasks } from './handlers/taskHandler.js';
import { handleSubmissionMessage } from './handlers/submissionHandler.js';
import { handleWalletMessage, handleWalletMenu } from './handlers/walletHandler.js';
import { handleRejectionReason, handleReportDuplicateMessage } from './handlers/submissionHandler.js';
import { handleAdminTextMessages, handleAdminMenu } from './handlers/adminHandler.js';
import { handleTicketMessage, handleTicketsMenu } from './handlers/ticketHandler.js';
import { handleAppealMessage } from './handlers/appealHandler.js';
import { handleReportMessage } from './handlers/reportHandler.js';
import { checkBanStatus } from './middlewares/checkBanStatus.js';

// Jobs
import { expireImprovements } from './jobs/expireImprovements.js';
import { liftExpiredBansAndRestrictions } from './jobs/liftExpiredBansAndRestrictions.js';
import { rehabilitateUsers } from './jobs/rehabilitateUsers.js';
import { runCleanupStaleStates, runHourlyCleanup, markExpiredLoginSessions } from './jobs/cleanupStaleStates.js';
import { runExpireOldTasks } from './jobs/expireOldTasks.js';
import { createLocalBackup, backupToGithub } from './services/backupService.js';
import { getState } from './utils/state.js';
import { detectFraud } from './jobs/detectFraud.js';

if (!config.BOT_TOKEN) {
  logger.error('BOT_TOKEN is not set in .env');
  process.exit(1);
}

initDb();
await seedDatabase();

logger.info('[Bot] Starting Telegram bot...');

const bot = new TelegramBot(config.BOT_TOKEN, { 
  polling: {
    interval: 2000,
    autoStart: true,
    params: {
      timeout: 10
    }
  },
  request: {
    agentClass: undefined,
    agentOptions: {},
    timeout: 30000
  }
});

bot.on('polling_error', (err) => {
  logger.error('[Bot] Polling error:', err.message);
  // Auto-restart polling after error
  if (err.code === 'EFATAL' || err.code === 'ETIMEDOUT') {
    logger.info('[Bot] Attempting to restart polling...');
    setTimeout(() => {
      try {
        bot.stopPolling().then(() => {
          bot.startPolling();
          logger.info('[Bot] Polling restarted successfully');
        }).catch(e => logger.error('[Bot] Failed to restart polling:', e.message));
      } catch (restartErr) {
        logger.error('[Bot] Restart error:', restartErr.message);
      }
    }, 5000);
  }
});

// ============================================================
// /start
// ============================================================
bot.onText(/\/start/, async (msg) => {
  const allowed = await checkBanStatus(bot, msg);
  if (!allowed) return;
  await handleStart(bot, msg);
});

bot.onText(/\/language/, async (msg) => {
  const { languageKeyboard } = await import('./keyboards/mainMenu.js');
  const { t } = await import('./utils/i18n.js');
  const { findUserByTelegramId } = await import('./services/userService.js');
  const user = await findUserByTelegramId(msg.from.id);
  const lang = user?.language || 'ar';
  await bot.sendMessage(msg.chat.id, t(lang, 'choose_language'), {
    reply_markup: languageKeyboard(),
  });
});

// ============================================================
// Share Contact
// ============================================================
bot.on('contact', async (msg) => {
  await handleContact(bot, msg);
});

// ============================================================
// Callback queries (inline keyboards)
// ============================================================
bot.on('callback_query', async (query) => {
  await handleCallbackQuery(bot, query);
});

// ============================================================
// Generic message handler
// ============================================================
bot.on('message', async (msg) => {
  if (!msg.text && !msg.photo) return;
  if (msg.text?.startsWith('/')) return;

  const allowed = await checkBanStatus(bot, msg);
  if (!allowed) return;

  const telegramId = msg.from?.id;
  if (!telegramId) return;

  const state = getState(telegramId);

  // ── 1. إذا المستخدم في حالة إدخال — الأولوية للحالة ──
  if (state) {
    const step = state.step;

    if (step?.startsWith('task_create')) { await handleTaskCreateMessage(bot, msg); return; }
    if (step === 'submitting_proof') { await handleSubmissionMessage(bot, msg); return; }
    if (step === 'rejecting_submission') { await handleRejectionReason(bot, msg); return; }
    if (step?.startsWith('deposit_') || step?.startsWith('withdraw_')) { await handleWalletMessage(bot, msg); return; }
    if (step?.startsWith('ticket_')) { await handleTicketMessage(bot, msg); return; }
    if (step === 'writing_appeal') { await handleAppealMessage(bot, msg); return; }
    if (step === 'reporting_user') { await handleReportMessage(bot, msg); return; }
    if (step === 'reporting_duplicate_submission') { await handleReportDuplicateMessage(bot, msg); return; }
    if (step?.startsWith('admin_')) { await handleAdminTextMessages(bot, msg); return; }
  }

  // ── 2. أزرار القائمة الرئيسية (ReplyKeyboard) ──
  const menuResult = await handleMenuButton(bot, msg);
  if (!menuResult) return;

  switch (menuResult.action) {
    case 'menu:tasks':
      await handleTasksMenu(bot, msg);
      break;
    case 'menu:my_tasks':
      await handleMyTasks(bot, msg);
      break;
    case 'menu:wallet':
      await handleWalletMenu(bot, msg);
      break;
    case 'menu:profile':
      await handleProfile(bot, msg);
      break;
    case 'menu:tickets':
      await handleTicketsMenu(bot, msg);
      break;
    case 'menu:notifications': {
      const { findUserByTelegramId } = await import('./services/userService.js');
      const { t } = await import('./utils/i18n.js');
      const user = await findUserByTelegramId(telegramId);
      const lang = user?.language || 'ar';
      await bot.sendMessage(msg.chat.id, t(lang, 'notifications_web_only'));
      break;
    }
    case 'menu:admin':
      await handleAdminMenu(bot, { message: { chat: msg.chat, message_id: null }, from: msg.from });
      break;
    case 'menu:language': {
      const { findUserByTelegramId } = await import('./services/userService.js');
      const { t } = await import('./utils/i18n.js');
      const { languageKeyboard } = await import('./keyboards/mainMenu.js');
      const u = await findUserByTelegramId(telegramId);
      await bot.sendMessage(msg.chat.id, t(u?.language || 'ar', 'choose_language'), {
        reply_markup: languageKeyboard(),
      });
      break;
    }
  }
});

// ============================================================
// Cron Jobs
// ============================================================
cron.schedule('*/5 * * * *', expireImprovements);
cron.schedule('*/10 * * * *', liftExpiredBansAndRestrictions);
cron.schedule('0 3 * * *', rehabilitateUsers);
cron.schedule('*/5 * * * *', runCleanupStaleStates);
cron.schedule('*/2 * * * *', markExpiredLoginSessions);
cron.schedule('0 * * * *', runHourlyCleanup);
cron.schedule('0 */6 * * *', runExpireOldTasks);
cron.schedule('*/30 * * * *', createLocalBackup);
cron.schedule('0 2 * * *', backupToGithub);
// Every 30 minutes: fraud detection scan
cron.schedule('*/30 * * * *', detectFraud);

createLocalBackup();
logger.info('[Bot] Bot is running. All cron jobs scheduled.');
