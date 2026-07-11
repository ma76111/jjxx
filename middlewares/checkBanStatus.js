import { findUserByTelegramId } from '../services/userService.js';
import { t } from '../utils/i18n.js';

/**
 * Middleware to check ban/freeze status before processing any message.
 * Returns true if user can proceed, false if blocked.
 */
export async function checkBanStatus(bot, msg) {
  const telegramId = msg.from?.id;
  if (!telegramId) return true;

  const user = await findUserByTelegramId(telegramId);
  if (!user) return true; // New user, proceed to /start handler

  const lang = user.language || 'ar';

  if (user.ban_status === 'permanent') {
    await bot.sendMessage(msg.chat.id, t(lang, 'ban_permanent'));
    return false;
  }

  if (user.ban_status === 'temporary') {
    if (user.ban_expires_at && new Date(user.ban_expires_at) > new Date()) {
      await bot.sendMessage(
        msg.chat.id,
        t(lang, 'ban_message', {
          reason: 'مخالفة نظام',
          expires: new Date(user.ban_expires_at).toLocaleString('ar-SA'),
        })
      );
      return false;
    }
    // Ban expired but not lifted yet — allow through (job will clean it up)
  }

  if (user.ban_status === 'frozen_pending_review') {
    await bot.sendMessage(msg.chat.id, t(lang, 'ban_frozen'));
    return false;
  }

  return true;
}
