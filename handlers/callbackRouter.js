import { handleProfile, sendMainMenu } from './menuHandler.js';
import { handleTasksMenu, handleMyTasks, handleStartCreateTask, handleTaskTypeSelect, handleProofTypeSelect, handleSkipInstructions, handleManageTask, handlePauseTask, handleResumeTask } from './taskHandler.js';
import { handleExecuteTask, handleConfirmSendImages, handleAcceptSubmission, handleRejectSubmission, handleViewTaskSubmissions, handleReportDuplicateStart } from './submissionHandler.js';
import { handleWalletMenu, handleDepositStart, handleDepositMethodSelect, handleWithdrawStart, handleNetworkSelect, handleDepositHistory, handleWithdrawHistory } from './walletHandler.js';
import { handleAdminMenu, handleAdminDeposits, handleAdminWithdrawals, handleAdminAppeals, handleDepositAccept, handleDepositReject, handleWithdrawalComplete, handleWithdrawalReject, handleAppealApprove, handleAppealReject, handleAdminStats } from './adminHandler.js';
import { handleAppealStart } from './appealHandler.js';
import { handleTicketsMenu, handleCreateTicketStart, handleViewTicket, handleReplyTicket } from './ticketHandler.js';
import { handleRatingStart, handleRatingSelect } from './ratingHandler.js';
import { startReport } from './reportHandler.js';
import { findUserByTelegramId, updateUserByTelegramId } from '../services/userService.js';
import { t } from '../utils/i18n.js';
import { mainMenuKeyboard, languageKeyboard } from '../keyboards/mainMenu.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import logger from '../utils/logger.js';

export async function handleCallbackQuery(bot, query) {
  const data = query.data || '';
  const telegramId = query.from.id;

  try {
    // Language selection
    if (data.startsWith('lang:')) {
      const lang = data.split(':')[1];
      await updateUserByTelegramId(telegramId, { language: lang });
      const adminUser = await isAdmin(telegramId);
      await bot.answerCallbackQuery(query.id, { text: '✅' });
      // Send new message with reply keyboard (cannot edit to reply keyboard)
      await bot.sendMessage(query.message.chat.id, t(lang, 'language_set'), {
        reply_markup: mainMenuKeyboard(lang, adminUser),
      });
      return;
    }

    // Main menu navigation
    if (data === 'menu:main') {
      await sendMainMenu(bot, query.message.chat.id, query.from.id);
      await bot.answerCallbackQuery(query.id);
      return;
    }
    if (data === 'menu:tasks') { await handleTasksMenu(bot, query); return; }
    if (data === 'menu:my_tasks') { await handleMyTasks(bot, query); return; }
    if (data === 'menu:wallet') { await handleWalletMenu(bot, query); return; }
    if (data === 'menu:profile') {
      await handleProfile(bot, { from: query.from, chat: query.message.chat });
      await bot.answerCallbackQuery(query.id);
      return;
    }
    if (data === 'menu:tickets') { await handleTicketsMenu(bot, query); return; }
    if (data === 'menu:admin') { await handleAdminMenu(bot, query); return; }
    if (data === 'menu:notifications') {
      const user = await findUserByTelegramId(query.from.id);
      const lang = user?.language || 'ar';
      await bot.answerCallbackQuery(query.id, { text: t(lang, 'notifications_web_only') });
      return;
    }

    // Task creation
    if (data === 'task_create:start') { await handleStartCreateTask(bot, query); return; }
    if (data.startsWith('task_create:type:')) { await handleTaskTypeSelect(bot, query, data.split(':')[2]); return; }
    if (data.startsWith('task_create:proof:')) { await handleProofTypeSelect(bot, query, data.split(':')[2]); return; }
    if (data === 'task_create:skip_instructions') { await handleSkipInstructions(bot, query); return; }

    // Task management
    if (data.startsWith('task:manage:')) { await handleManageTask(bot, query, data.split(':')[2]); return; }
    if (data.startsWith('task:pause:')) { await handlePauseTask(bot, query, data.split(':')[2]); return; }
    if (data.startsWith('task:resume:')) { await handleResumeTask(bot, query, data.split(':')[2]); return; }
    if (data.startsWith('task:execute:')) { await handleExecuteTask(bot, query, data.split(':')[2]); return; }
    if (data.startsWith('task:subs:')) { await handleViewTaskSubmissions(bot, query, data.split(':')[2]); return; }

    // Submissions
    if (data.startsWith('sub:send_images:')) { await handleConfirmSendImages(bot, query, data.split(':')[2]); return; }
    if (data.startsWith('sub:accept:')) { await handleAcceptSubmission(bot, query, data.split(':')[2]); return; }
    if (data.startsWith('sub:reject_retry:')) { await handleRejectSubmission(bot, query, data.split(':')[2], 'retry'); return; }
    if (data.startsWith('sub:reject_final:')) { await handleRejectSubmission(bot, query, data.split(':')[2], 'final'); return; }
    if (data.startsWith('sub:report_dup:')) { await handleReportDuplicateStart(bot, query, data.split(':')[2]); return; }

    // Wallet
    if (data === 'wallet:deposit_start') { await handleDepositStart(bot, query); return; }
    if (data === 'wallet:withdraw_start') { await handleWithdrawStart(bot, query); return; }
    if (data === 'wallet:deposit_history') { await handleDepositHistory(bot, query); return; }
    if (data === 'wallet:withdraw_history') { await handleWithdrawHistory(bot, query); return; }
    if (data.startsWith('wallet:deposit_method:')) { await handleDepositMethodSelect(bot, query, data.split(':')[2]); return; }
    if (data.startsWith('network:')) { await handleNetworkSelect(bot, query, data.split(':')[1]); return; }

    // Admin
    if (data === 'admin:deposits') { await handleAdminDeposits(bot, query); return; }
    if (data === 'admin:withdrawals') { await handleAdminWithdrawals(bot, query); return; }
    if (data === 'admin:appeals') { await handleAdminAppeals(bot, query); return; }
    if (data === 'admin:stats') { await handleAdminStats(bot, query); return; }
    if (data.startsWith('admin_dep:accept:')) { await handleDepositAccept(bot, query, data.split(':')[2]); return; }
    if (data.startsWith('admin_dep:reject:')) { await handleDepositReject(bot, query, data.split(':')[2]); return; }
    if (data.startsWith('admin_wdw:complete:')) { await handleWithdrawalComplete(bot, query, data.split(':')[2]); return; }
    if (data.startsWith('admin_wdw:reject:')) { await handleWithdrawalReject(bot, query, data.split(':')[2]); return; }
    if (data.startsWith('admin_appeal:approve:')) { await handleAppealApprove(bot, query, data.split(':')[2]); return; }
    if (data.startsWith('admin_appeal:reject:')) { await handleAppealReject(bot, query, data.split(':')[2]); return; }

    // Appeals
    if (data === 'appeal:start') { await handleAppealStart(bot, query); return; }

    // Tickets
    if (data === 'ticket:create') { await handleCreateTicketStart(bot, query); return; }
    if (data.startsWith('ticket:view:')) { await handleViewTicket(bot, query, data.split(':')[2]); return; }
    if (data.startsWith('ticket:reply:')) { await handleReplyTicket(bot, query, data.split(':')[2]); return; }

    // Ratings
    if (data.startsWith('rate:')) {
      const parts = data.split(':');
      await handleRatingStart(bot, query, parts[1], parts[2]);
      return;
    }
    if (data.startsWith('rating:')) { await handleRatingSelect(bot, query, data.split(':')[1]); return; }

    // Reports
    if (data.startsWith('report:')) {
      const parts = data.split(':');
      await startReport(bot, query, parts[1], parts[2] || null, parts[3] || null);
      return;
    }

    // Unknown
    {
      const user = await findUserByTelegramId(query.from.id);
      const lang = user?.language || 'ar';
      await bot.answerCallbackQuery(query.id, { text: t(lang, 'unknown_action') });
    }

  } catch (err) {
    logger.error('[Callback] Error handling callback:', { data, err: err.message });
    try {
      const user = await findUserByTelegramId(query.from.id).catch(() => null);
      const lang = user?.language || 'ar';
      await bot.answerCallbackQuery(query.id, { text: t(lang, 'error_occurred') });
    } catch {}
  }
}
