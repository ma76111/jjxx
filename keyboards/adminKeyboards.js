import { t } from '../utils/i18n.js';

export function adminMenuKeyboard(lang) {
  return {
    inline_keyboard: [
      [
        { text: '📥 الإيداعات', callback_data: 'admin:deposits' },
        { text: '📤 السحوبات', callback_data: 'admin:withdrawals' },
      ],
      [
        { text: '📋 الإثباتات', callback_data: 'admin:submissions' },
        { text: '⚖️ الاستئنافات', callback_data: 'admin:appeals' },
      ],
      [
        { text: '🚫 المحظورون', callback_data: 'admin:bans' },
        { text: '📊 الإبلاغات', callback_data: 'admin:reports' },
      ],
      [
        { text: '🎫 التذاكر', callback_data: 'admin:tickets' },
        { text: '⚙️ الإعدادات', callback_data: 'admin:settings' },
      ],
      [
        { text: '📈 الإحصائيات', callback_data: 'admin:stats' },
        { text: '📡 الإرسال الجماعي', callback_data: 'admin:broadcast' },
      ],
      [{ text: t(lang, 'btn_back'), callback_data: 'menu:main' }],
    ],
  };
}

export function depositReviewKeyboard(depositId) {
  return {
    inline_keyboard: [
      [
        { text: '✅ قبول', callback_data: `admin_dep:accept:${depositId}` },
        { text: '❌ رفض', callback_data: `admin_dep:reject:${depositId}` },
      ],
    ],
  };
}

export function withdrawalReviewKeyboard(withdrawalId) {
  return {
    inline_keyboard: [
      [
        { text: '✅ إتمام', callback_data: `admin_wdw:complete:${withdrawalId}` },
        { text: '❌ رفض', callback_data: `admin_wdw:reject:${withdrawalId}` },
      ],
    ],
  };
}

export function appealReviewKeyboard(appealId) {
  return {
    inline_keyboard: [
      [
        { text: '✅ قبول الاستئناف', callback_data: `admin_appeal:approve:${appealId}` },
        { text: '❌ رفض الاستئناف', callback_data: `admin_appeal:reject:${appealId}` },
      ],
    ],
  };
}
