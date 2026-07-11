import { findUserByTelegramId } from '../services/userService.js';
import { getAdminStats } from '../services/adminService.js';
import { getPendingDeposits, getPendingWithdrawals, adminAcceptDeposit, adminRejectDeposit, adminCompleteWithdrawal, adminRejectWithdrawal } from '../services/walletService.js';
import { getPendingAppeals, approveAppeal, rejectAppeal } from '../services/banService.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import { setState, getState, clearState } from '../utils/state.js';
import { t } from '../utils/i18n.js';
import { adminMenuKeyboard, depositReviewKeyboard, withdrawalReviewKeyboard, appealReviewKeyboard } from '../keyboards/adminKeyboards.js';

function extractContext(msgOrQuery) {
  const telegramId = msgOrQuery.from?.id ?? msgOrQuery.message?.from?.id;
  const chatId     = msgOrQuery.chat?.id ?? msgOrQuery.message?.chat?.id;
  return { telegramId, chatId };
}

export async function handleAdminMenu(bot, msgOrQuery) {
  const { telegramId, chatId } = extractContext(msgOrQuery);
  if (!(await isAdmin(telegramId))) {
    const user = await findUserByTelegramId(telegramId);
    const lang = user?.language || 'ar';
    const isQuery = !!msgOrQuery.id;
    if (isQuery) await bot.answerCallbackQuery(msgOrQuery.id, { text: t(lang, 'admin_not_allowed') });
    return;
  }

  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';
  const stats = await getAdminStats();

  const text = [
    t(lang, 'admin_panel'),
    ``,
    t(lang, 'admin_pending_deposits',    { count: stats.pending_deposits }),
    t(lang, 'admin_pending_withdrawals', { count: stats.pending_withdrawals }),
    t(lang, 'admin_pending_submissions', { count: stats.pending_submissions }),
    t(lang, 'admin_pending_appeals',     { count: stats.pending_appeals }),
    ``,
    `${t(lang, 'admin_total_users')} ${stats.total_users}`,
    `${t(lang, 'admin_active_tasks')} ${stats.active_tasks}`,
    `${t(lang, 'admin_total_balance')} ${(stats.total_balance_held || 0).toFixed(2)} USDT`,
  ].join('\n');

  await bot.sendMessage(chatId, text, {
    reply_markup: adminMenuKeyboard(lang),
  });
}

export async function handleAdminDeposits(bot, query) {
  if (!(await isAdmin(query.from.id))) return;
  const user = await findUserByTelegramId(query.from.id);
  const lang = user?.language || 'ar';
  const chatId = query.message.chat.id;
  const { rows } = await getPendingDeposits();

  if (!rows.length) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'admin_no_pending_deposits') });
    return;
  }
  await bot.answerCallbackQuery(query.id);

  for (const dep of rows.slice(0, 3)) {
    const text = [
      `${t(lang, 'admin_deposit_label')} #${dep.id}`,
      `👤 @${dep.username || dep.telegram_id} | 💰 ${dep.amount} USDT`,
      `📡 ${dep.method}${dep.network ? ' | 🌐 ' + dep.network : ''}`,
      dep.txid ? `🔑 ${dep.txid}` : dep.binance_id ? `🔸 ${dep.binance_id}` : '',
      `📅 ${dep.created_at.slice(0, 16)}`,
    ].filter(Boolean).join('\n');
    await bot.sendMessage(chatId, text, { reply_markup: depositReviewKeyboard(dep.id) });
  }
}

export async function handleAdminWithdrawals(bot, query) {
  if (!(await isAdmin(query.from.id))) return;
  const user = await findUserByTelegramId(query.from.id);
  const lang = user?.language || 'ar';
  const chatId = query.message.chat.id;
  const { rows } = await getPendingWithdrawals();

  if (!rows.length) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'admin_no_pending_withdrawals') });
    return;
  }
  await bot.answerCallbackQuery(query.id);

  for (const w of rows.slice(0, 3)) {
    const text = [
      `${t(lang, 'admin_withdrawal_label')} #${w.id}`,
      `👤 @${w.username || w.telegram_id} | 💰 ${w.amount} USDT`,
      w.wallet_address ? `📋 ${w.wallet_address}` : '',
      `🌐 ${w.network || ''} | 📅 ${w.created_at.slice(0, 16)}`,
    ].filter(Boolean).join('\n');
    await bot.sendMessage(chatId, text, { reply_markup: withdrawalReviewKeyboard(w.id) });
  }
}

export async function handleAdminAppeals(bot, query) {
  if (!(await isAdmin(query.from.id))) return;
  const user = await findUserByTelegramId(query.from.id);
  const lang = user?.language || 'ar';
  const chatId = query.message.chat.id;
  const { rows } = await getPendingAppeals();

  if (!rows.length) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'admin_no_appeals') });
    return;
  }
  await bot.answerCallbackQuery(query.id);

  for (const appeal of rows.slice(0, 3)) {
    const text = [
      `${t(lang, 'admin_appeal_label')} #${appeal.id}`,
      `👤 @${appeal.username}`,
      `${t(lang, 'admin_appeal_reason')} ${appeal.reason}`,
      `${t(lang, 'admin_appeal_ban_type')} ${appeal.ban_type}`,
    ].join('\n');
    await bot.sendMessage(chatId, text, { reply_markup: appealReviewKeyboard(appeal.id) });
  }
}

export async function handleDepositAccept(bot, query, depositId) {
  if (!(await isAdmin(query.from.id))) return;
  const user = await findUserByTelegramId(query.from.id);
  const lang = user?.language || 'ar';
  const result = await adminAcceptDeposit(parseInt(depositId), user.id);
  await bot.answerCallbackQuery(query.id, {
    text: result.success ? t(lang, 'admin_accepted') : (result.error || t(lang, 'error_generic')),
  });
}

export async function handleDepositReject(bot, query, depositId) {
  if (!(await isAdmin(query.from.id))) return;
  const user = await findUserByTelegramId(query.from.id);
  const lang = user?.language || 'ar';
  setState(query.from.id, 'admin_deposit_reject', { deposit_id: parseInt(depositId) });
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(query.message.chat.id, t(lang, 'admin_reject_reason_prompt'));
}

export async function handleWithdrawalComplete(bot, query, withdrawalId) {
  if (!(await isAdmin(query.from.id))) return;
  const user = await findUserByTelegramId(query.from.id);
  const lang = user?.language || 'ar';
  const result = await adminCompleteWithdrawal(parseInt(withdrawalId), user.id);
  await bot.answerCallbackQuery(query.id, {
    text: result.success ? t(lang, 'admin_completed') : (result.error || t(lang, 'error_generic')),
  });
}

export async function handleWithdrawalReject(bot, query, withdrawalId) {
  if (!(await isAdmin(query.from.id))) return;
  const user = await findUserByTelegramId(query.from.id);
  const lang = user?.language || 'ar';
  setState(query.from.id, 'admin_withdrawal_reject', { withdrawal_id: parseInt(withdrawalId) });
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(query.message.chat.id, t(lang, 'admin_reject_reason_prompt'));
}

export async function handleAppealApprove(bot, query, appealId) {
  if (!(await isAdmin(query.from.id))) return;
  const user = await findUserByTelegramId(query.from.id);
  const lang = user?.language || 'ar';
  const result = await approveAppeal(parseInt(appealId), user.id);
  await bot.answerCallbackQuery(query.id, {
    text: result.success ? t(lang, 'admin_appeal_approved') : (result.error || t(lang, 'error_generic')),
  });
}

export async function handleAppealReject(bot, query, appealId) {
  if (!(await isAdmin(query.from.id))) return;
  const user = await findUserByTelegramId(query.from.id);
  const lang = user?.language || 'ar';
  setState(query.from.id, 'admin_appeal_reject', { appeal_id: parseInt(appealId) });
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(query.message.chat.id, t(lang, 'admin_appeal_reject_prompt'));
}

export async function handleAdminTextMessages(bot, msg) {
  const telegramId = msg.from.id;
  if (!(await isAdmin(telegramId))) return;

  const state = getState(telegramId);
  if (!state) return;

  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';
  const text = msg.text?.trim() || '';

  if (state.step === 'admin_deposit_reject') {
    clearState(telegramId);
    const r = await adminRejectDeposit(state.data.deposit_id, user.id, text);
    await bot.sendMessage(msg.chat.id, r.success ? t(lang, 'admin_rejected') : t(lang, 'error_generic'));
    return;
  }
  if (state.step === 'admin_withdrawal_reject') {
    clearState(telegramId);
    const r = await adminRejectWithdrawal(state.data.withdrawal_id, user.id, text);
    await bot.sendMessage(msg.chat.id, r.success ? t(lang, 'admin_rejected_refunded') : t(lang, 'error_generic'));
    return;
  }
  if (state.step === 'admin_appeal_reject') {
    clearState(telegramId);
    const r = await rejectAppeal(state.data.appeal_id, user.id, text);
    await bot.sendMessage(msg.chat.id, r.success ? t(lang, 'admin_appeal_rejected') : t(lang, 'error_generic'));
    return;
  }
}

export async function handleAdminStats(bot, query) {
  if (!(await isAdmin(query.from.id))) return;
  const stats = await getAdminStats();
  const user = await findUserByTelegramId(query.from.id);
  const lang = user?.language || 'ar';

  const text = [
    t(lang, 'admin_stats_title'),
    `${t(lang, 'admin_total_users')} ${stats.total_users}`,
    `${t(lang, 'admin_active_tasks')} ${stats.active_tasks}`,
    `${t(lang, 'admin_pending_deps')} ${stats.pending_deposits}`,
    `${t(lang, 'admin_pending_wdws')} ${stats.pending_withdrawals}`,
    `${t(lang, 'admin_pending_subs')} ${stats.pending_submissions}`,
    `${t(lang, 'admin_open_tickets')} ${stats.open_tickets}`,
    `${t(lang, 'admin_pending_apps')} ${stats.pending_appeals}`,
    `${t(lang, 'admin_total_balance')} ${(stats.total_balance_held || 0).toFixed(4)} USDT`,
    `${t(lang, 'admin_total_deposited')} ${(stats.total_deposited || 0).toFixed(4)} USDT`,
    `${t(lang, 'admin_total_withdrawn')} ${(stats.total_withdrawn || 0).toFixed(4)} USDT`,
  ].join('\n');

  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(query.message.chat.id, text, {
    reply_markup: { inline_keyboard: [[{ text: t(lang, 'btn_back'), callback_data: 'menu:admin' }]] },
  });
}
