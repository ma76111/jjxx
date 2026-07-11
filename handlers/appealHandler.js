import { findUserByTelegramId } from '../services/userService.js';
import { createAppeal } from '../services/banService.js';
import { dbGet } from '../config/database.js';
import { setState, getState, clearState } from '../utils/state.js';
import { t } from '../utils/i18n.js';

export async function handleAppealStart(bot, query) {
  const telegramId = query.from.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  if (!user.is_banned) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'appeal_not_banned') });
    return;
  }

  // Get active ban
  const ban = await dbGet(
    "SELECT * FROM bans WHERE user_id = ? AND status = 'active' LIMIT 1",
    [user.id]
  );

  if (!ban) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'appeal_not_banned') });
    return;
  }

  setState(telegramId, 'writing_appeal', { ban_id: ban.id });
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(query.message.chat.id, t(lang, 'appeal_reason'));
}

export async function handleAppealMessage(bot, msg) {
  const telegramId = msg.from.id;
  const state = getState(telegramId);
  if (!state || state.step !== 'writing_appeal') return;

  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';
  clearState(telegramId);

  const result = await createAppeal({
    userId: user.id,
    banId: state.data.ban_id,
    reason: msg.text?.trim(),
  });

  await bot.sendMessage(
    msg.chat.id,
    result.success ? t(lang, 'appeal_submitted') : t(lang, 'error_generic')
  );
}
