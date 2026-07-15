import { findUserByTelegramId } from '../services/userService.js';
import {
  createTask, getAvailableTasks, getUserTasks, getTaskById,
  pauseTask, resumeTask
} from '../services/taskService.js';
import { getSetting } from '../services/settingsService.js';
import { setState, getState, clearState } from '../utils/state.js';
import { t } from '../utils/i18n.js';
import { taskTypeKeyboard, proofTypeKeyboard, skipKeyboard, taskActionsKeyboard } from '../keyboards/taskKeyboards.js';
import { isValidBotName, isValidUrl, isPositiveInteger, isPositiveNumber } from '../utils/validators.js';

function extractContext(msgOrQuery) {
  const telegramId = msgOrQuery.from?.id ?? msgOrQuery.message?.from?.id;
  const chatId     = msgOrQuery.chat?.id ?? msgOrQuery.message?.chat?.id;
  return { telegramId, chatId };
}

// ── المهام المتاحة ──
export async function handleTasksMenu(bot, msgOrQuery) {
  const { telegramId, chatId } = extractContext(msgOrQuery);
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  const { tasks, total } = await getAvailableTasks(user.id, 1, user.country_code);

  const lines = [t(lang, total ? 'task_available' : 'task_no_available', { count: total })];
  const buttons = [];

  for (const task of tasks.slice(0, 5)) {
    const unit = task.task_type === 'paid' ? `${task.reward_per_user} USDT` : `1 ${t(lang, 'exchange_point')}`;
    lines.push(`\n🔹 #${task.id} ${task.bot_name || t(lang, 'task_external')}\n👥 ${task.completed_count}/${task.required_count} | 💰 ${unit}`);
    buttons.push([{ text: `${t(lang, 'task_execute')} #${task.id}`, callback_data: `task:execute:${task.id}` }]);
  }
  buttons.push([{ text: t(lang, 'task_create_btn'), callback_data: 'task_create:start' }]);

  await bot.sendMessage(chatId, lines.join('\n'), {
    reply_markup: { inline_keyboard: buttons },
  });
}

// ── مهامي ──
export async function handleMyTasks(bot, msgOrQuery) {
  const { telegramId, chatId } = extractContext(msgOrQuery);
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  const tasks = await getUserTasks(user.id);

  if (!tasks.length) {
    await bot.sendMessage(chatId, t(lang, 'my_tasks_empty'), {
      reply_markup: {
        inline_keyboard: [[{ text: t(lang, 'task_create_btn'), callback_data: 'task_create:start' }]],
      },
    });
    return;
  }

  const buttons = tasks.slice(0, 8).map(task => ([{
    text: `${task.status === 'active' ? '🟢' : task.status === 'paused' ? '🟡' : '🔴'} #${task.id} ${task.bot_name || t(lang, 'task_external')} (${task.completed_count}/${task.required_count})`,
    callback_data: `task:manage:${task.id}`,
  }]));
  buttons.push([{ text: t(lang, 'task_create_btn'), callback_data: 'task_create:start' }]);

  await bot.sendMessage(chatId, t(lang, 'my_tasks_title'), {
    reply_markup: { inline_keyboard: buttons },
  });
}

// ── بدء إنشاء مهمة ──
export async function handleStartCreateTask(bot, query) {
  const telegramId = query.from.id;
  const chatId = query.message.chat.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  setState(telegramId, 'task_create_type', {});
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(chatId, t(lang, 'task_create'), {
    reply_markup: taskTypeKeyboard(lang),
  });
}

// ── اختيار نوع المهمة ──
export async function handleTaskTypeSelect(bot, query, taskType) {
  const telegramId = query.from.id;
  const chatId = query.message.chat.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  setState(telegramId, 'task_create_bot_name', { task_type: taskType });
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(chatId, t(lang, 'task_bot_name'));
}

// ── رسائل إنشاء المهمة ──
export async function handleTaskCreateMessage(bot, msg) {
  const telegramId = msg.from.id;
  const state = getState(telegramId);
  if (!state || !state.step.startsWith('task_create')) return;

  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';
  const text = msg.text?.trim() || '';

  switch (state.step) {
    case 'task_create_bot_name': {
      if (!text || text.length < 3 || text.length > 64) {
        await bot.sendMessage(msg.chat.id, t(lang, 'invalid_bot_name'));
        return;
      }
      // Normalize: add @ prefix if missing and looks like a username
      const botName = text.startsWith('@') ? text.trim() : `@${text.trim()}`;
      setState(telegramId, 'task_create_link', { ...state.data, bot_name: botName });
      await bot.sendMessage(msg.chat.id, t(lang, 'task_referral_link'));
      break;
    }
    case 'task_create_link': {
      // Accept any reasonable link/text: URL, t.me link, or short description
      if (!text || text.length < 3 || text.length > 500) {
        await bot.sendMessage(msg.chat.id, t(lang, 'invalid_link'));
        return;
      }
      const maxCount = await getSetting('max_required_count', '10');
      setState(telegramId, 'task_create_count', { ...state.data, referral_link: text });
      await bot.sendMessage(msg.chat.id, t(lang, 'task_required_count', { max: maxCount }));
      break;
    }
    case 'task_create_count': {
      const maxCount = parseInt(await getSetting('max_required_count', '10'));
      if (!isPositiveInteger(text) || parseInt(text) > maxCount) {
        await bot.sendMessage(msg.chat.id, t(lang, 'task_max_count', { max: maxCount }));
        return;
      }
      const count = parseInt(text);
      if (state.data.task_type === 'exchange') {
        setState(telegramId, 'task_create_proof_type', { ...state.data, required_count: count, reward_per_user: 0 });
        await bot.sendMessage(msg.chat.id, t(lang, 'task_proof_type'), { reply_markup: proofTypeKeyboard(lang) });
      } else {
        setState(telegramId, 'task_create_reward', { ...state.data, required_count: count });
        await bot.sendMessage(msg.chat.id, t(lang, 'task_reward'));
      }
      break;
    }
    case 'task_create_reward': {
      const minReward = parseFloat(await getSetting('min_reward', '0.01'));
      if (!isPositiveNumber(text) || parseFloat(text) < minReward) {
        await bot.sendMessage(msg.chat.id, t(lang, 'min_reward_error', { min: minReward }));
        return;
      }
      setState(telegramId, 'task_create_proof_type', { ...state.data, reward_per_user: parseFloat(text) });
      await bot.sendMessage(msg.chat.id, t(lang, 'task_proof_type'), { reply_markup: proofTypeKeyboard(lang) });
      break;
    }
    case 'task_create_instructions': {
      setState(telegramId, 'task_create_confirm', { ...state.data, verification_instructions: text });
      await finalizeCreateTask(bot, msg, user, lang);
      break;
    }
  }
}

// ── اختيار نوع الإثبات ──
export async function handleProofTypeSelect(bot, query, proofType) {
  const telegramId = query.from.id;
  const chatId = query.message.chat.id;
  const state = getState(telegramId);
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  setState(telegramId, 'task_create_instructions', { ...state.data, proof_type: proofType });
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(chatId, t(lang, 'task_instructions'), {
    reply_markup: skipKeyboard(lang, 'task_create:skip_instructions'),
  });
}

// ── تخطي التعليمات ──
export async function handleSkipInstructions(bot, query) {
  const telegramId = query.from.id;
  const state = getState(telegramId);
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  setState(telegramId, 'task_create_confirm', { ...state.data, verification_instructions: null });
  await bot.answerCallbackQuery(query.id);
  const fakeMsg = { from: query.from, chat: query.message.chat };
  await finalizeCreateTask(bot, fakeMsg, user, lang);
}

async function finalizeCreateTask(bot, msg, user, lang) {
  const telegramId = msg.from.id;
  const state = getState(telegramId);
  const data = state.data;
  clearState(telegramId);

  const result = await createTask({
    owner_id: user.id,
    bot_name: data.bot_name,
    referral_link: data.referral_link,
    required_count: data.required_count,
    task_type: data.task_type,
    reward_per_user: data.reward_per_user || 0,
    verification_instructions: data.verification_instructions,
    proof_type: data.proof_type || 'images',
    country_code: user.country_code,
  });

  if (result.error) {
    const errorMessages = {
      max_tasks_reached:    t(lang, 'task_max_active', { max: result.max }),
      max_required_count:   t(lang, 'task_max_count', { max: result.max }),
      insufficient_balance: t(lang, 'task_insufficient_balance', { required: result.required, available: result.available }),
      insufficient_points:  t(lang, 'task_insufficient_points', { required: result.required, available: result.available }),
    };
    await bot.sendMessage(msg.chat.id, errorMessages[result.error] || t(lang, 'error_generic'));
    return;
  }

  const unit = data.task_type === 'paid' ? 'USDT' : t(lang, 'exchange_point');
  await bot.sendMessage(msg.chat.id, t(lang, 'task_created', { id: result.task_id, charged: result.charged, unit }));
}

// ── إدارة مهمة ──
export async function handleManageTask(bot, query, taskId) {
  const telegramId = query.from.id;
  const chatId = query.message.chat.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  const task = await getTaskById(parseInt(taskId));
  if (!task || task.owner_id !== user.id) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'task_not_found') });
    return;
  }

  const text = `${t(lang, 'task_detail')} #${task.id}\n🤖 ${task.bot_name || t(lang, 'task_external')}\n👥 ${task.completed_count}/${task.required_count}\n${t(lang, 'task_status')} ${task.status}`;
  await bot.sendMessage(chatId, text, {
    reply_markup: taskActionsKeyboard(lang, task.id, task.status),
  });
}

export async function handlePauseTask(bot, query, taskId) {
  const telegramId = query.from.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  const result = await pauseTask(parseInt(taskId), user.id);
  await bot.answerCallbackQuery(query.id, {
    text: result.error ? t(lang, 'error_generic') : t(lang, 'task_paused', { id: taskId }),
  });
  if (!result.error) await handleManageTask(bot, query, taskId);
}

export async function handleResumeTask(bot, query, taskId) {
  const telegramId = query.from.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  const result = await resumeTask(parseInt(taskId), user.id);
  await bot.answerCallbackQuery(query.id, {
    text: result.error ? t(lang, 'error_generic') : t(lang, 'task_resumed', { id: taskId }),
  });
  if (!result.error) await handleManageTask(bot, query, taskId);
}
