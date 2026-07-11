import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { protectedLimiter } from '../middlewares/rateLimiter.js';
import { getMe, getStats, getActivity, getBalanceChart, getWidgetsConfig, setWidgetsConfig } from '../controllers/user.controller.js';

const router = Router();
router.use(authMiddleware, protectedLimiter);

router.get('/me', getMe);
router.get('/stats', getStats);
router.get('/activity', getActivity);
router.get('/balance-chart', getBalanceChart);
router.get('/widgets-config', getWidgetsConfig);
router.put('/widgets-config', setWidgetsConfig);

// Language update — also pushes updated keyboard to Telegram immediately
router.put('/language', async (req, res) => {
  const { language } = req.body;
  const allowed = ['ar', 'en', 'ru', 'fa', 'tr'];
  if (!allowed.includes(language)) return res.status(400).json({ success: false, error: 'invalid_language' });

  const { dbRun, dbGet } = await import('../config/database.js');
  await dbRun('UPDATE users SET language = ? WHERE id = ?', [language, req.user.id]);

  // Push new keyboard to Telegram silently (fire-and-forget, no await)
  pushKeyboardToTelegram(req.user.id, language).catch(() => {});

  return res.json({ success: true, language });
});

async function pushKeyboardToTelegram(userId, language) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) return;

  const { dbGet } = await import('../config/database.js');
  const user = await dbGet('SELECT telegram_id, is_banned FROM users WHERE id = ?', [userId]);
  if (!user || user.is_banned) return;

  // Check if user is admin
  const MAIN_ADMIN_ID = Number(process.env.MAIN_ADMIN_ID) || 0;
  const adminRow = await dbGet(
    'SELECT id FROM admins WHERE telegram_id = ? AND is_active = 1',
    [user.telegram_id]
  );
  const isAdmin = user.telegram_id === MAIN_ADMIN_ID || !!adminRow;

  // Build the same keyboard as the bot
  const keyboard = buildMainMenuKeyboard(language, isAdmin);

  // Get the translated confirmation message
  const confirmMsg = getLanguageSetMsg(language);

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: user.telegram_id,
      text: confirmMsg,
      reply_markup: keyboard,
    }),
  });
}

function buildMainMenuKeyboard(lang, isAdmin) {
  const labels = {
    ar: { tasks: '📝 المهام', my_tasks: '🗂 مهامي', wallet: '💰 المحفظة', profile: '👤 حسابي', tickets: '🎫 الدعم', notifs: '🔔 الإشعارات', admin: '⚙️ لوحة الأدمن', language: '🌐 تغيير اللغة' },
    en: { tasks: '📝 Tasks', my_tasks: '🗂 My Tasks', wallet: '💰 Wallet', profile: '👤 My Account', tickets: '🎫 Support', notifs: '🔔 Notifications', admin: '⚙️ Admin Panel', language: '🌐 Change Language' },
    ru: { tasks: '📝 Задачи', my_tasks: '🗂 Мои задачи', wallet: '💰 Кошелёк', profile: '👤 Мой аккаунт', tickets: '🎫 Поддержка', notifs: '🔔 Уведомления', admin: '⚙️ Панель админа', language: '🌐 Сменить язык' },
    fa: { tasks: '📝 وظایف', my_tasks: '🗂 وظایف من', wallet: '💰 کیف پول', profile: '👤 حساب من', tickets: '🎫 پشتیبانی', notifs: '🔔 اعلان‌ها', admin: '⚙️ پنل ادمین', language: '🌐 تغییر زبان' },
    tr: { tasks: '📝 Görevler', my_tasks: '🗂 Görevlerim', wallet: '💰 Cüzdan', profile: '👤 Hesabım', tickets: '🎫 Destek', notifs: '🔔 Bildirimler', admin: '⚙️ Admin Paneli', language: '🌐 Dil Değiştir' },
  };
  const l = labels[lang] || labels['ar'];

  const rows = [
    [{ text: l.tasks }, { text: l.my_tasks }],
    [{ text: l.wallet }, { text: l.profile }],
    [{ text: l.tickets }, { text: l.notifs }],
  ];
  if (isAdmin) rows.push([{ text: l.admin }]);
  rows.push([{ text: l.language }]);

  return { keyboard: rows, resize_keyboard: true, persistent: true, input_field_placeholder: '...' };
}

function getLanguageSetMsg(lang) {
  const msgs = {
    ar: '✅ تم ضبط اللغة العربية.',
    en: '✅ Language set to English.',
    ru: '✅ Язык установлен на русский.',
    fa: '✅ زبان فارسی تنظیم شد.',
    tr: '✅ Dil Türkçe olarak ayarlandı.',
  };
  return msgs[lang] || msgs['ar'];
}

export default router;
