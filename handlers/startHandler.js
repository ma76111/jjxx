import { findUserByTelegramId, createUser, updateUserByTelegramId } from '../services/userService.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import { t } from '../utils/i18n.js';
import { mainMenuKeyboard, languageKeyboard } from '../keyboards/mainMenu.js';
import { dbGet, dbRun } from '../config/database.js';
import { setState } from '../utils/state.js';
import { hasAcceptedTerms, acceptTerms, checkNewUserDuplicateDevice } from '../services/antiFraudService.js';
import { createNotification } from '../services/notificationService.js';
import logger from '../utils/logger.js';

export async function handleStart(bot, msg) {
  const telegramId = msg.from.id;
  const username = msg.from.username || null;
  const text = msg.text || '';
  const payload = text.split(' ')[1] || null;

  // Handle login deep link
  if (payload && payload.startsWith('login_')) {
    await handleLoginDeepLink(bot, msg, payload.replace('login_', ''));
    return;
  }

  let user = await findUserByTelegramId(telegramId);

  if (!user) {
    // New user — create account
    user = await createUser({ telegram_id: telegramId, username });

    // Check duplicate device fingerprint (uses language_code as minimal signal in bot context)
    const ua = msg.from?.language_code || '';
    await checkNewUserDuplicateDevice(user.id, null, ua);

    // Send anti-fraud notice as a plain message (no blocking, no button required)
    await bot.sendMessage(
      msg.chat.id,
      t(user.language || 'ar', 'anti_fraud_welcome'),
      { parse_mode: 'Markdown' }
    );

    // Mark terms as "sent" so we don't send again
    await acceptTerms(user.id);

    // Show language selection
    await bot.sendMessage(msg.chat.id, t(user.language || 'ar', 'choose_language'), {
      reply_markup: languageKeyboard(),
    });
    return;
  }

  // Existing user — update username if changed
  if (username && user.username !== username) {
    await updateUserByTelegramId(telegramId, { username });
    user = await findUserByTelegramId(telegramId);
  }

  // First time opening after account existed but notice not sent yet
  if (!(await hasAcceptedTerms(user.id))) {
    const lang = user.language || 'ar';
    // Send as notification (non-blocking)
    await createNotification({
      userId: user.id,
      type: 'system_update',
      title: '🛡 قواعد الاستخدام',
      body: t(lang, 'anti_fraud_welcome'),
    });
    await acceptTerms(user.id);
  }

  const lang = user.language || 'ar';
  const adminUser = await isAdmin(telegramId);

  await bot.sendMessage(
    msg.chat.id,
    t(lang, 'welcome_back', { name: msg.from.first_name || username || 'User' }),
    { reply_markup: mainMenuKeyboard(lang, adminUser) }
  );
}

async function handleLoginDeepLink(bot, msg, loginToken) {
  const telegramId = msg.from.id;
  const user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  const session = await dbGet(
    "SELECT * FROM login_sessions WHERE login_token = ? AND status = 'pending' AND expires_at > datetime('now')",
    [loginToken]
  );

  if (!session) {
    await bot.sendMessage(msg.chat.id, t(lang, 'login_link_expired'));
    return;
  }

  if (user && user.phone_verified_at) {
    await confirmLoginSession(bot, msg, session, user, lang);
    return;
  }

  const { shareContactKeyboard } = await import('../keyboards/mainMenu.js');
  setState(telegramId, 'awaiting_contact_for_login', { login_token: loginToken });
  await bot.sendMessage(msg.chat.id, t(lang, 'share_contact_prompt'), {
    reply_markup: shareContactKeyboard(lang),
  });
}

async function confirmLoginSession(bot, msg, session, user, lang) {
  const telegramId = msg.from.id;
  await dbRun(
    `UPDATE login_sessions SET status = 'confirmed', telegram_id = ?, confirmed_at = datetime('now') WHERE id = ?`,
    [telegramId, session.id]
  );

  // Confirm login success
  await bot.sendMessage(msg.chat.id, t(lang, 'login_success'), {
    reply_markup: { remove_keyboard: true },
  });

  // Immediately show the main menu so keyboard appears again
  const adminUser = await isAdmin(telegramId);
  const freshUser = await findUserByTelegramId(telegramId);
  const userLang = freshUser?.language || lang;

  await bot.sendMessage(
    msg.chat.id,
    t(userLang, 'main_menu'),
    { reply_markup: mainMenuKeyboard(userLang, adminUser) }
  );
}

export { confirmLoginSession };
