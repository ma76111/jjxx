import { findUserByTelegramId, createUser, updateUserByTelegramId, isPhoneNumberTaken } from '../services/userService.js';
import { getState, clearState } from '../utils/state.js';
import { confirmLoginSession } from './startHandler.js';
import { checkDuplicatePhone } from '../services/deviceFingerprintService.js';
import { dbGet, dbRun } from '../config/database.js';
import { t } from '../utils/i18n.js';
import { removeKeyboard } from '../keyboards/mainMenu.js';
import logger from '../utils/logger.js';

export async function handleContact(bot, msg) {
  const contact = msg.contact;
  const telegramId = msg.from.id;

  if (!contact) return;

  // CRITICAL: Must be the user's own contact
  if (contact.user_id !== telegramId) {
    const user = await findUserByTelegramId(telegramId);
    const lang = user?.language || 'ar';
    await bot.sendMessage(msg.chat.id, t(lang, 'contact_mismatch'), {
      reply_markup: removeKeyboard(),
    });
    return;
  }

  const phone = contact.phone_number;
  const state = getState(telegramId);
  let user = await findUserByTelegramId(telegramId);
  const lang = user?.language || 'ar';

  // Check duplicate phone
  const duplicate = await checkDuplicatePhone(phone, telegramId);
  if (duplicate) {
    logger.warn('[Contact] Duplicate phone detected:', { telegramId, phone, existingUser: duplicate.telegram_id });
    // Log for admin review but don't block (notify admin silently)
  }

  const verifiedAt = new Date().toISOString();

  if (user) {
    await updateUserByTelegramId(telegramId, {
      phone_number: phone,
      phone_verified_at: verifiedAt,
    });
  } else {
    user = await createUser({
      telegram_id: telegramId,
      username: msg.from.username || null,
      phone_number: phone,
      phone_verified_at: verifiedAt,
    });
  }

  // Refresh user
  user = await findUserByTelegramId(telegramId);

  await bot.sendMessage(msg.chat.id, t(lang, 'phone_verified'), {
    reply_markup: removeKeyboard(),
  });

  // If there's a pending login session, confirm it now
  if (state && state.step === 'awaiting_contact_for_login') {
    const loginToken = state.data.login_token;
    const session = await dbGet(
      "SELECT * FROM login_sessions WHERE login_token = ? AND status = 'pending' AND expires_at > datetime('now')",
      [loginToken]
    );
    if (session) {
      clearState(telegramId);
      await confirmLoginSession(bot, msg, session, user, lang);
      return;
    }
  }

  clearState(telegramId);

  // Show main menu
  const { isAdmin } = await import('../middlewares/isAdmin.js');
  const { mainMenuKeyboard } = await import('../keyboards/mainMenu.js');
  const adminUser = await isAdmin(telegramId);

  await bot.sendMessage(
    msg.chat.id,
    t(lang, 'welcome', { name: msg.from.first_name || 'User' }),
    { reply_markup: mainMenuKeyboard(lang, adminUser) }
  );
}
