import { isMainAdmin } from '../config/index.js';
import { getAdminByTelegramId } from '../services/adminService.js';

/**
 * Check if a telegram user is an admin (main or secondary active).
 */
export async function isAdmin(telegramId) {
  if (isMainAdmin(telegramId)) return true;
  const admin = await getAdminByTelegramId(telegramId);
  return !!admin;
}

export async function requireAdmin(bot, msg) {
  const allowed = await isAdmin(msg.from?.id);
  if (!allowed) {
    await bot.sendMessage(msg.chat.id, '🚫 هذا الأمر للأدمن فقط.');
  }
  return allowed;
}
