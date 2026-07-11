import { dbGet } from '../config/database.js';
import dotenv from 'dotenv';
dotenv.config();

const MAIN_ADMIN_ID = Number(process.env.MAIN_ADMIN_ID) || 0;

export async function adminMiddleware(req, res, next) {
  const telegramId = req.user?.telegram_id;
  if (!telegramId) return res.status(403).json({ success: false, error: 'forbidden' });

  if (Number(telegramId) === MAIN_ADMIN_ID) {
    req.isMainAdmin = true;
    req.adminRecord = { permissions: '["all"]', role: 'primary' };
    return next();
  }

  const admin = await dbGet(
    'SELECT * FROM admins WHERE telegram_id = ? AND is_active = 1',
    [telegramId]
  );

  if (!admin) return res.status(403).json({ success: false, error: 'forbidden' });

  req.adminRecord = admin;
  req.isMainAdmin = false;
  next();
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (req.isMainAdmin) return next();
    try {
      const perms = JSON.parse(req.adminRecord?.permissions || '[]');
      if (perms.includes('all') || perms.includes(permission)) return next();
    } catch {}
    return res.status(403).json({ success: false, error: 'insufficient_permissions' });
  };
}
