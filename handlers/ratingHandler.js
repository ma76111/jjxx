import { findUserByTelegramId } from '../services/userService.js';
import { dbGet, dbRun } from '../config/database.js';
import { setState, getState, clearState } from '../utils/state.js';
import { t } from '../utils/i18n.js';

export async function handleRatingStart(bot, query, taskId, ratedUserId) {
  const telegramId = query.from.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  const task = await dbGet('SELECT * FROM tasks WHERE id = ? AND owner_id = ?', [taskId, user.id]);
  if (!task) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'rating_no_permission') });
    return;
  }

  const existing = await dbGet(
    'SELECT id FROM ratings WHERE task_id = ? AND rater_user_id = ?',
    [taskId, user.id]
  );
  if (existing) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'rating_already_done') });
    return;
  }

  setState(telegramId, 'rating_user', { task_id: parseInt(taskId), rated_user_id: parseInt(ratedUserId) });
  await bot.answerCallbackQuery(query.id);

  await bot.sendMessage(query.message.chat.id, t(lang, 'rating_prompt'), {
    reply_markup: {
      inline_keyboard: [[
        { text: '1⭐', callback_data: 'rating:1' },
        { text: '2⭐', callback_data: 'rating:2' },
        { text: '3⭐', callback_data: 'rating:3' },
        { text: '4⭐', callback_data: 'rating:4' },
        { text: '5⭐', callback_data: 'rating:5' },
      ]],
    },
  });
}

export async function handleRatingSelect(bot, query, rating) {
  const telegramId = query.from.id;
  const state = getState(telegramId);
  if (!state || state.step !== 'rating_user') {
    await bot.answerCallbackQuery(query.id);
    return;
  }
  clearState(telegramId);
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  try {
    await dbRun(
      'INSERT INTO ratings (task_id, rater_user_id, rated_user_id, rating) VALUES (?, ?, ?, ?)',
      [state.data.task_id, user.id, state.data.rated_user_id, parseInt(rating)]
    );
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'rating_done', { stars: rating }) });
  } catch {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'error_generic') });
  }
}
