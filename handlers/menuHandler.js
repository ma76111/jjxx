import { findUserByTelegramId } from '../services/userService.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import { getUserStats } from '../services/userService.js';
import { t } from '../utils/i18n.js';
import { mainMenuKeyboard } from '../keyboards/mainMenu.js';

export async function sendMainMenu(bot, chatId, telegramId) {
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';
  const adminUser = await isAdmin(telegramId);

  await bot.sendMessage(chatId, t(lang, 'main_menu'), {
    reply_markup: mainMenuKeyboard(lang, adminUser),
  });
}

export async function handleMenuButton(bot, msg) {
  const telegramId = msg.from.id;
  const text = msg.text?.trim() || '';

  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  // Check each possible button text against all languages
  const allLangs = ['ar', 'en', 'ru', 'fa', 'tr'];

  const matches = (key) => allLangs.some(l => text === t(l, key));

  if (matches('btn_tasks'))         return { action: 'menu:tasks' };
  if (matches('btn_my_tasks'))      return { action: 'menu:my_tasks' };
  if (matches('btn_wallet'))        return { action: 'menu:wallet' };
  if (matches('btn_profile'))       return { action: 'menu:profile' };
  if (matches('btn_tickets'))       return { action: 'menu:tickets' };
  if (matches('btn_notifications')) return { action: 'menu:notifications' };
  if (matches('btn_admin'))         return { action: 'menu:admin' };
  if (matches('btn_language'))      return { action: 'menu:language' };

  return null;
}

export async function handleProfile(bot, msg) {
  const telegramId = msg.from.id;
  const chatId = msg.chat.id;

  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';
  const stats = await getUserStats(user.id);

  const lines = [
    `*${t(lang, 'profile_title')}*`,
    `🆔 ID: ${user.telegram_id}`,
    `📛 ${user.username ? '@' + user.username : t(lang, 'profile_no_username')}`,
    `${t(lang, 'profile_phone')} ${user.phone_number || t(lang, 'profile_phone_unverified')}`,
    ``,
    `${t(lang, 'profile_balance')} ${stats.balance.toFixed(4)} USDT`,
    `${t(lang, 'profile_points')} ${stats.exchange_points}`,
    ``,
    `${t(lang, 'profile_active_tasks')} ${stats.active_tasks}`,
    `${t(lang, 'profile_completed_subs')} ${stats.completed_submissions}`,
    `${t(lang, 'profile_pending_subs')} ${stats.pending_submissions}`,
    ``,
    `${t(lang, 'profile_total_deposited')} ${stats.total_deposited.toFixed(4)} USDT`,
    `${t(lang, 'profile_total_withdrawn')} ${stats.total_withdrawn.toFixed(4)} USDT`,
    stats.rating_avg ? `${t(lang, 'profile_rating')} ${stats.rating_avg}/5` : '',
  ].filter(Boolean).join('\n');

  await bot.sendMessage(chatId, lines, { parse_mode: 'Markdown' });
}
