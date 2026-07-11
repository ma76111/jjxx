import { findUserByTelegramId } from '../services/userService.js';
import { submitReport } from '../services/reportService.js';
import { setState, getState, clearState } from '../utils/state.js';
import { t } from '../utils/i18n.js';

export async function handleReportMessage(bot, msg) {
  const telegramId = msg.from.id;
  const state = getState(telegramId);
  if (!state || state.step !== 'reporting_user') return;

  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';
  const { reported_user_id, task_id, submission_id } = state.data;
  clearState(telegramId);

  const result = await submitReport({
    reporterId: user.id,
    reportedUserId: reported_user_id,
    taskId: task_id || null,
    submissionId: submission_id || null,
    reason: msg.text?.trim() || 'مخالفة',
  });

  const messages = {
    report_own: t(lang, 'report_own'),
    duplicate_report: t(lang, 'report_duplicate'),
    spam_reports: t(lang, 'report_spam'),
  };

  await bot.sendMessage(
    msg.chat.id,
    result.success ? t(lang, 'report_submitted') : (messages[result.error] || t(lang, 'error_generic'))
  );
}

export async function startReport(bot, query, reportedUserId, taskId, submissionId) {
  const telegramId = query.from.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  setState(telegramId, 'reporting_user', {
    reported_user_id: parseInt(reportedUserId),
    task_id: taskId ? parseInt(taskId) : null,
    submission_id: submissionId ? parseInt(submissionId) : null,
  });

  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(query.message.chat.id, t(lang, 'report_reason'));
}
