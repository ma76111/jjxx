import { t } from '../utils/i18n.js';

export function taskTypeKeyboard(lang) {
  return {
    inline_keyboard: [
      [
        { text: t(lang, 'task_type_paid'), callback_data: 'task_create:type:paid' },
        { text: t(lang, 'task_type_exchange'), callback_data: 'task_create:type:exchange' },
      ],
      [{ text: t(lang, 'btn_back'), callback_data: 'menu:main' }],
    ],
  };
}

export function proofTypeKeyboard(lang) {
  return {
    inline_keyboard: [
      [
        { text: '✍️ نص', callback_data: 'task_create:proof:text' },
        { text: '📸 صور', callback_data: 'task_create:proof:images' },
        { text: '📤 كلاهما', callback_data: 'task_create:proof:both' },
      ],
    ],
  };
}

export function skipKeyboard(lang, skipData) {
  return {
    inline_keyboard: [
      [{ text: t(lang, 'skip'), callback_data: skipData }],
    ],
  };
}

export function taskActionsKeyboard(lang, taskId, status) {
  const rows = [];
  if (status === 'active') {
    rows.push([{ text: '⏸ إيقاف', callback_data: `task:pause:${taskId}` }]);
  } else if (status === 'paused') {
    rows.push([{ text: '▶️ استئناف', callback_data: `task:resume:${taskId}` }]);
  }
  rows.push([
    { text: '📋 الإثباتات', callback_data: `task:subs:${taskId}` },
    { text: t(lang, 'btn_back'), callback_data: 'menu:my_tasks' },
  ]);
  return { inline_keyboard: rows };
}

export function networkKeyboard(lang) {
  return {
    inline_keyboard: [
      [
        { text: 'BSC', callback_data: 'network:BSC' },
        { text: 'TRC20', callback_data: 'network:TRC20' },
        { text: 'TON', callback_data: 'network:TON' },
      ],
    ],
  };
}

export function submissionReviewKeyboard(lang, submissionId) {
  return {
    inline_keyboard: [
      [
        { text: t(lang, 'sub_accept_btn'),        callback_data: `sub:accept:${submissionId}` },
        { text: t(lang, 'sub_reject_retry_btn'),  callback_data: `sub:reject_retry:${submissionId}` },
        { text: t(lang, 'sub_reject_final_btn'),  callback_data: `sub:reject_final:${submissionId}` },
      ],
      [
        { text: t(lang, 'sub_report_duplicate_btn'), callback_data: `sub:report_dup:${submissionId}` },
      ],
    ],
  };
}
