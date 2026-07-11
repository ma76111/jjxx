import { t } from '../utils/i18n.js';

/**
 * القائمة الرئيسية — ReplyKeyboardMarkup ثابتة في شريط الكتابة
 */
export function mainMenuKeyboard(lang, isAdmin = false) {
  const rows = [
    [
      { text: t(lang, 'btn_tasks') },
      { text: t(lang, 'btn_my_tasks') },
    ],
    [
      { text: t(lang, 'btn_wallet') },
      { text: t(lang, 'btn_profile') },
    ],
    [
      { text: t(lang, 'btn_tickets') },
      { text: t(lang, 'btn_notifications') },
    ],
  ];

  if (isAdmin) {
    rows.push([{ text: t(lang, 'btn_admin') }]);
  }

  // زر تغيير اللغة دائماً في الأسفل
  rows.push([{ text: t(lang, 'btn_language') }]);

  return {
    keyboard: rows,
    resize_keyboard: true,
    persistent: true,         // يبقى ظاهراً دائماً
    input_field_placeholder: '...',
  };
}

export function languageKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🇸🇦 العربية', callback_data: 'lang:ar' },
        { text: '🇬🇧 English', callback_data: 'lang:en' },
        { text: '🇷🇺 Русский', callback_data: 'lang:ru' },
      ],
    ],
  };
}

/**
 * زر رجوع inline — يُستخدم داخل الرسائل التفاعلية فقط
 */
export function backKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: t(lang, 'btn_back'), callback_data: 'menu:main' }],
    ],
  };
}

export function confirmCancelKeyboard(lang, confirmData) {
  return {
    inline_keyboard: [
      [
        { text: t(lang, 'btn_confirm'), callback_data: confirmData },
        { text: t(lang, 'btn_cancel'), callback_data: 'menu:main' },
      ],
    ],
  };
}

export function shareContactKeyboard(lang) {
  return {
    keyboard: [[{ text: t(lang, 'share_contact_btn'), request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

export function removeKeyboard() {
  return { remove_keyboard: true };
}
