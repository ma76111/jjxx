import { findUserByTelegramId } from '../services/userService.js';
import { createDeposit, createWithdrawal, getUserDeposits, getUserWithdrawals } from '../services/walletService.js';
import { setState, getState, clearState, updateStateData } from '../utils/state.js';
import { t } from '../utils/i18n.js';
import { networkKeyboard } from '../keyboards/taskKeyboards.js';
import { isPositiveNumber, isValidTxid } from '../utils/validators.js';
import { getSetting } from '../services/settingsService.js';

function extractContext(msgOrQuery) {
  const telegramId = msgOrQuery.from?.id ?? msgOrQuery.message?.from?.id;
  const chatId     = msgOrQuery.chat?.id ?? msgOrQuery.message?.chat?.id;
  return { telegramId, chatId };
}

// ── قائمة المحفظة ──
export async function handleWalletMenu(bot, msgOrQuery) {
  const { telegramId, chatId } = extractContext(msgOrQuery);
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  const text = [
    t(lang, 'wallet_title'),
    '',
    t(lang, 'balance', { amount: user.balance.toFixed(4) }),
    t(lang, 'exchange_points', { points: user.exchange_points }),
  ].join('\n');

  await bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: t(lang, 'wallet_deposit_btn'), callback_data: 'wallet:deposit_start' },
          { text: t(lang, 'wallet_withdraw_btn'), callback_data: 'wallet:withdraw_start' },
        ],
        [
          { text: t(lang, 'wallet_deposit_history_btn'), callback_data: 'wallet:deposit_history' },
          { text: t(lang, 'wallet_withdraw_history_btn'), callback_data: 'wallet:withdraw_history' },
        ],
      ],
    },
  });
}

// ── اختيار طريقة الإيداع ──
export async function handleDepositStart(bot, query) {
  const chatId = query.message.chat.id;
  const user = await findUserByTelegramId(query.from.id);
  const lang = user?.language || 'ar';
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(chatId, t(lang, 'deposit_methods'), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: t(lang, 'deposit_binance'), callback_data: 'wallet:deposit_method:binance_pay' },
          { text: t(lang, 'deposit_txid'), callback_data: 'wallet:deposit_method:txid' },
        ],
      ],
    },
  });
}

export async function handleDepositMethodSelect(bot, query, method) {
  const telegramId = query.from.id;
  const chatId = query.message.chat.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';
  setState(telegramId, 'deposit_amount', { method });
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(chatId, t(lang, 'deposit_amount'));
}

// ── بدء السحب ──
export async function handleWithdrawStart(bot, query) {
  const telegramId = query.from.id;
  const chatId = query.message.chat.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';
  const minWithdrawal = await getSetting('min_withdrawal', '0.1');
  setState(telegramId, 'withdraw_amount', {});
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(chatId, t(lang, 'withdraw_amount', { min: minWithdrawal }));
}

// ── معالجة رسائل المحفظة ──
export async function handleWalletMessage(bot, msg) {
  const telegramId = msg.from.id;
  const state = getState(telegramId);
  if (!state) return;

  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';
  const text = msg.text?.trim() || '';

  if (state.step === 'deposit_amount') {
    if (!isPositiveNumber(text)) { await bot.sendMessage(msg.chat.id, t(lang, 'invalid_amount')); return; }
    if (state.data.method === 'binance_pay') {
      setState(telegramId, 'deposit_binance_id', { ...state.data, amount: parseFloat(text) });
      await bot.sendMessage(msg.chat.id, t(lang, 'deposit_binance_id'));
    } else {
      setState(telegramId, 'deposit_txid', { ...state.data, amount: parseFloat(text) });
      await bot.sendMessage(msg.chat.id, t(lang, 'deposit_txid_input'));
    }
    return;
  }

  if (state.step === 'deposit_binance_id') {
    setState(telegramId, 'deposit_network', { ...state.data, binance_id: text });
    await bot.sendMessage(msg.chat.id, t(lang, 'deposit_network'), { reply_markup: networkKeyboard(lang) });
    return;
  }

  if (state.step === 'deposit_txid') {
    if (!isValidTxid(text)) { await bot.sendMessage(msg.chat.id, t(lang, 'invalid_txid')); return; }
    setState(telegramId, 'deposit_network_txid', { ...state.data, txid: text });
    await bot.sendMessage(msg.chat.id, t(lang, 'deposit_network'), { reply_markup: networkKeyboard(lang) });
    return;
  }

  if (state.step === 'withdraw_amount') {
    const minWithdrawal = parseFloat(await getSetting('min_withdrawal', '0.1'));
    if (!isPositiveNumber(text) || parseFloat(text) < minWithdrawal) {
      await bot.sendMessage(msg.chat.id, t(lang, 'withdraw_below_min', { min: minWithdrawal })); return;
    }
    setState(telegramId, 'withdraw_wallet', { ...state.data, amount: parseFloat(text) });
    await bot.sendMessage(msg.chat.id, t(lang, 'withdraw_wallet'));
    return;
  }

  if (state.step === 'withdraw_wallet') {
    setState(telegramId, 'withdraw_network', { ...state.data, wallet_address: text });
    await bot.sendMessage(msg.chat.id, t(lang, 'withdraw_network'), { reply_markup: networkKeyboard(lang) });
    return;
  }
}

// ── اختيار الشبكة ──
export async function handleNetworkSelect(bot, query, network) {
  const telegramId = query.from.id;
  const state = getState(telegramId);
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  if (!state) { await bot.answerCallbackQuery(query.id, { text: t(lang, 'session_expired') }); return; }
  await bot.answerCallbackQuery(query.id);

  if (state.step === 'deposit_network' || state.step === 'deposit_network_txid') {
    clearState(telegramId);
    const result = await createDeposit({
      userId: user.id, amount: state.data.amount, method: state.data.method,
      binanceId: state.data.binance_id || null, txid: state.data.txid || null, network,
    });
    if (result.error) {
      await bot.sendMessage(query.message.chat.id,
        result.error === 'duplicate_txid' ? t(lang, 'deposit_duplicate_txid') : t(lang, 'error_generic'));
      return;
    }
    const msg = result.status === 'accepted'
      ? t(lang, 'deposit_auto_accepted', { amount: state.data.amount })
      : t(lang, 'deposit_submitted', { id: result.deposit_id });
    await bot.sendMessage(query.message.chat.id, msg);
    return;
  }

  if (state.step === 'withdraw_network') {
    clearState(telegramId);
    const result = await createWithdrawal({
      userId: user.id, amount: state.data.amount,
      method: 'wallet_address', walletAddress: state.data.wallet_address, network,
    });
    if (result.error) {
      const errMap = {
        below_min_withdrawal: t(lang, 'withdraw_below_min', { min: result.min }),
        insufficient_balance: t(lang, 'withdraw_insufficient'),
        daily_limit_exceeded: t(lang, 'withdraw_daily_limit'),
        weekly_limit_exceeded: t(lang, 'withdraw_weekly_limit'),
      };
      await bot.sendMessage(query.message.chat.id, errMap[result.error] || t(lang, 'error_generic'));
      return;
    }
    await bot.sendMessage(query.message.chat.id, t(lang, 'withdraw_submitted', { id: result.withdrawal_id }));
    return;
  }
}

// ── سجل الإيداعات ──
export async function handleDepositHistory(bot, query) {
  const telegramId = query.from.id;
  const chatId = query.message.chat.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';
  const deposits = await getUserDeposits(user.id);
  if (!deposits.length) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'no_deposits') });
    return;
  }
  const lines = deposits.slice(0, 5).map(d => `#${d.id} — ${d.amount} USDT — ${d.status} — ${d.created_at.slice(0, 10)}`).join('\n');
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(chatId, `${t(lang, 'deposit_history_title')}\n${lines}`);
}

// ── سجل السحوبات ──
export async function handleWithdrawHistory(bot, query) {
  const telegramId = query.from.id;
  const chatId = query.message.chat.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';
  const withdrawals = await getUserWithdrawals(user.id);
  if (!withdrawals.length) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'no_withdrawals') });
    return;
  }
  const lines = withdrawals.slice(0, 5).map(w => `#${w.id} — ${w.amount} USDT — ${w.status} — ${w.created_at.slice(0, 10)}`).join('\n');
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(chatId, `${t(lang, 'withdraw_history_title')}\n${lines}`);
}
