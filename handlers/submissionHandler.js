import { findUserByTelegramId } from '../services/userService.js';
import { getTaskById } from '../services/taskService.js';
import { submitProof, getTaskSubmissions, acceptSubmission, rejectSubmission } from '../services/submissionService.js';
import { setState, getState, clearState, updateStateData } from '../utils/state.js';
import { t } from '../utils/i18n.js';
import { submissionReviewKeyboard } from '../keyboards/taskKeyboards.js';
import { getSetting } from '../services/settingsService.js';

const MAX_IMAGES = 3;

export async function handleExecuteTask(bot, query, taskId) {
  const telegramId = query.from.id;
  const chatId = query.message.chat.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  const task = await getTaskById(parseInt(taskId));
  if (!task || task.status !== 'active') {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'task_not_found') });
    return;
  }
  if (task.owner_id === user.id) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'task_own_task') });
    return;
  }
  if (task.completed_count >= task.required_count) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'task_full') });
    return;
  }

  const taskTimeout = parseInt(await getSetting('task_timeout', '300'));
  const expiresAt = Date.now() + taskTimeout * 1000;

  setState(telegramId, 'submitting_proof', {
    task_id: parseInt(taskId),
    proof_type: task.proof_type,
    images: [],
    expires_at: expiresAt,
  });

  await bot.answerCallbackQuery(query.id);

  const details = [
    `${t(lang, 'task_detail')} #${task.id}`,
    `🤖 ${task.bot_name || ''}`,
    task.referral_link ? `🔗 ${task.referral_link}` : '',
    task.verification_instructions ? `\n📝 ${task.verification_instructions}` : '',
  ].filter(Boolean).join('\n');

  await bot.sendMessage(chatId, details);

  const promptKey = task.proof_type === 'text' ? 'submit_text'
    : task.proof_type === 'images' ? 'submit_images'
    : 'submit_both';

  await bot.sendMessage(chatId, t(lang, promptKey), {
    reply_markup: task.proof_type === 'images' || task.proof_type === 'both'
      ? { inline_keyboard: [[{ text: t(lang, 'task_confirm_send'), callback_data: `sub:send_images:${taskId}` }]] }
      : undefined,
  });

  setTimeout(async () => {
    const currentState = getState(telegramId);
    if (currentState && currentState.step === 'submitting_proof' && currentState.data.task_id === parseInt(taskId)) {
      clearState(telegramId);
      await bot.sendMessage(chatId, t(lang, 'submit_timeout')).catch(() => {});
    }
  }, taskTimeout * 1000);
}

export async function handleSubmissionMessage(bot, msg) {
  const telegramId = msg.from.id;
  const state = getState(telegramId);
  if (!state || state.step !== 'submitting_proof') return;

  if (Date.now() > state.data.expires_at) {
    clearState(telegramId);
    const user = await findUserByTelegramId(telegramId);
    await bot.sendMessage(msg.chat.id, t(user?.language || 'ar', 'submit_timeout'));
    return;
  }

  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';
  const { proof_type, task_id, images = [] } = state.data;

  if (msg.photo) {
    if (proof_type === 'text') {
      await bot.sendMessage(msg.chat.id, t(lang, 'proof_text_only'));
      return;
    }
    if (images.length >= MAX_IMAGES) {
      await bot.sendMessage(msg.chat.id, t(lang, 'submit_max_images'));
      return;
    }
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const newImages = [...images, fileId];
    updateStateData(telegramId, { images: newImages });
    await bot.sendMessage(msg.chat.id, t(lang, 'image_received', { current: newImages.length, max: MAX_IMAGES }));
    return;
  }

  if (msg.text) {
    if (proof_type === 'images') {
      await bot.sendMessage(msg.chat.id, t(lang, 'proof_images_only'));
      return;
    }
    updateStateData(telegramId, { proof_text: msg.text });

    if (proof_type === 'both') {
      await bot.sendMessage(msg.chat.id, t(lang, 'submit_images'), {
        reply_markup: { inline_keyboard: [[{ text: t(lang, 'task_confirm_send'), callback_data: `sub:send_images:${task_id}` }]] },
      });
      return;
    }

    await finalizeSubmission(bot, msg, user, lang);
  }
}

export async function handleConfirmSendImages(bot, query, taskId) {
  const telegramId = query.from.id;
  const state = getState(telegramId);
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  if (!state || state.step !== 'submitting_proof') {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'session_expired') });
    return;
  }

  await bot.answerCallbackQuery(query.id);
  await finalizeSubmission(bot, { ...query.message, from: query.from, chat: query.message.chat }, user, lang);
}

async function finalizeSubmission(bot, msg, user, lang) {
  const telegramId = msg.from.id;
  const state = getState(telegramId);
  if (!state) return;

  const { task_id, images, proof_text } = state.data;
  clearState(telegramId);

  const result = await submitProof({
    taskId: task_id,
    userId: user.id,
    proofText: proof_text || null,
    proofImages: images && images.length ? images : null,
  });

  if (result.error) {
    const errMap = {
      already_submitted: t(lang, 'task_already_submitted'),
      task_not_found: t(lang, 'task_not_found'),
      task_full: t(lang, 'task_full'),
      own_task: t(lang, 'task_own_task'),
    };
    await bot.sendMessage(msg.chat.id, errMap[result.error] || t(lang, 'error_generic'));
    return;
  }

  await bot.sendMessage(msg.chat.id, t(lang, 'submit_success'));
}

export async function handleViewTaskSubmissions(bot, query, taskId) {
  const telegramId = query.from.id;
  const chatId = query.message.chat.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  const result = await getTaskSubmissions(parseInt(taskId), user.id);
  if (!Array.isArray(result)) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'error_generic') });
    return;
  }

  const pending = result.filter(s => s.status === 'pending');
  if (!pending.length) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'sub_pending_none') });
    return;
  }

  await bot.answerCallbackQuery(query.id);

  for (const sub of pending.slice(0, 3)) {
    const text = [
      `📤 #${sub.id}`,
      `👤 @${sub.username || sub.telegram_id}`,
      sub.proof_text ? `📝 ${sub.proof_text}` : '',
      `📅 ${sub.created_at}`,
    ].filter(Boolean).join('\n');

    await bot.sendMessage(chatId, text, {
      reply_markup: submissionReviewKeyboard(lang, sub.id),
    });

    if (sub.proof_images) {
      try {
        const imgs = JSON.parse(sub.proof_images);
        for (const fileId of imgs) await bot.sendPhoto(chatId, fileId);
      } catch {}
    }
  }
}

export async function handleAcceptSubmission(bot, query, submissionId) {
  const telegramId = query.from.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  const result = await acceptSubmission(parseInt(submissionId), user.id);
  await bot.answerCallbackQuery(query.id, {
    text: result.success ? t(lang, 'sub_accepted') : (result.error || t(lang, 'error_generic')),
  });
}

export async function handleRejectSubmission(bot, query, submissionId, rejectType) {
  const telegramId = query.from.id;
  const chatId = query.message.chat.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  setState(telegramId, 'rejecting_submission', { submission_id: parseInt(submissionId), reject_type: rejectType });
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(chatId, t(lang, 'sub_reject_reason'));
}

export async function handleRejectionReason(bot, msg) {
  const telegramId = msg.from.id;
  const state = getState(telegramId);
  if (!state || state.step !== 'rejecting_submission') return;

  clearState(telegramId);
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  const result = await rejectSubmission(
    state.data.submission_id,
    user.id,
    state.data.reject_type,
    msg.text?.trim()
  );

  await bot.sendMessage(msg.chat.id, result.success ? t(lang, 'sub_rejected') : t(lang, 'error_generic'));
}

// ── Report duplicate submission ──
export async function handleReportDuplicateStart(bot, query, submissionId) {
  const telegramId = query.from.id;
  const chatId = query.message.chat.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  // Verify this user is the task owner or admin
  const { dbGet } = await import('../config/database.js');
  const sub = await dbGet('SELECT task_id FROM task_submissions WHERE id = ?', [parseInt(submissionId)]);
  if (!sub) { await bot.answerCallbackQuery(query.id, { text: t(lang, 'error_generic') }); return; }

  const task = await dbGet('SELECT owner_id FROM tasks WHERE id = ?', [sub.task_id]);
  const { isAdmin } = await import('../middlewares/isAdmin.js');
  const userIsAdmin = await isAdmin(telegramId);
  if (!task || (task.owner_id !== user.id && !userIsAdmin)) {
    await bot.answerCallbackQuery(query.id, { text: t(lang, 'action_not_allowed') });
    return;
  }

  setState(telegramId, 'reporting_duplicate_submission', { submission_a_id: parseInt(submissionId) });
  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(chatId, t(lang, 'report_dup_ask'));
}

export async function handleReportDuplicateMessage(bot, msg) {
  const telegramId = msg.from.id;
  const state = getState(telegramId);
  if (!state || state.step !== 'reporting_duplicate_submission') return;

  clearState(telegramId);
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  const suspectedId = parseInt(msg.text?.trim());
  if (!suspectedId || isNaN(suspectedId)) {
    await bot.sendMessage(msg.chat.id, t(lang, 'report_dup_invalid_id'));
    return;
  }

  try {
    const { dbGet: dbGetUtil, dbRun: dbRunUtil } = await import('../config/database.js');
    const subA = await dbGetUtil('SELECT * FROM task_submissions WHERE id = ?', [state.data.submission_a_id]);
    const subB = await dbGetUtil('SELECT * FROM task_submissions WHERE id = ?', [suspectedId]);

    if (!subA || !subB || subA.task_id !== subB.task_id || subA.user_id === subB.user_id) {
      await bot.sendMessage(msg.chat.id, t(lang, 'report_dup_error'));
      return;
    }

    // Check for existing report
    const existing = await dbGetUtil(
      `SELECT id FROM duplicate_proof_reports
       WHERE task_id = ?
         AND ((submission_a_id = ? AND submission_b_id = ?) OR (submission_a_id = ? AND submission_b_id = ?))`,
      [subA.task_id, state.data.submission_a_id, suspectedId, suspectedId, state.data.submission_a_id]
    );

    if (existing) {
      await bot.sendMessage(msg.chat.id, t(lang, 'report_dup_success'));
      return;
    }

    const result = await dbRunUtil(
      `INSERT INTO duplicate_proof_reports
         (task_id, submission_a_id, submission_b_id, user_a_id, user_b_id, reported_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [subA.task_id, state.data.submission_a_id, suspectedId, subA.user_id, subB.user_id, user.id]
    );

    const reportId = result.lastID;

    // Fire evaluation async
    const { evaluateDuplicateProofReport } = await import('../services/fraudDetectionService.js');
    setImmediate(() => evaluateDuplicateProofReport(reportId).catch(() => {}));

    await bot.sendMessage(msg.chat.id, t(lang, 'report_dup_success'));
  } catch (err) {
    await bot.sendMessage(msg.chat.id, t(lang, 'report_dup_error'));
  }
}
