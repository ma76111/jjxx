import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbRun } from '../config/database.js';
import { generateToken } from '../middlewares/authMiddleware.js';
import dotenv from 'dotenv';
dotenv.config();

const SESSION_TTL_SECONDS = 300; // 5 minutes

export async function startLogin(req, res) {
  const loginToken = uuidv4().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  const botName = process.env.BOT_NAME || 'your_bot';

  await dbRun(
    `INSERT INTO login_sessions (login_token, status, expires_at) VALUES (?, 'pending', ?)`,
    [loginToken, expiresAt]
  );

  const deepLink = `https://t.me/${botName}?start=login_${loginToken}`;

  return res.status(200).json({
    login_token: loginToken,
    deep_link: deepLink,
    expires_in: SESSION_TTL_SECONDS,
  });
}

export async function getLoginStatus(req, res) {
  const { token } = req.params;
  const session = await dbGet(
    'SELECT status FROM login_sessions WHERE login_token = ?',
    [token]
  );

  if (!session) return res.status(404).json({ status: 'not_found' });
  return res.status(200).json({ status: session.status });
}

export async function confirmLogin(req, res) {
  const { login_token } = req.body;
  if (!login_token) return res.status(400).json({ success: false, error: 'missing_token' });

  const session = await dbGet(
    "SELECT * FROM login_sessions WHERE login_token = ? AND status = 'confirmed'",
    [login_token]
  );

  if (!session) {
    return res.status(409).json({ success: false, error: 'session_not_confirmed' });
  }

  // Prevent replay — mark consumed
  await dbRun(
    "UPDATE login_sessions SET status = 'consumed', consumed_at = datetime('now') WHERE id = ?",
    [session.id]
  );

  const user = await dbGet(
    'SELECT * FROM users WHERE telegram_id = ?',
    [session.telegram_id]
  );

  if (!user) return res.status(404).json({ success: false, error: 'user_not_found' });

  const MAIN_ADMIN_ID = Number(process.env.MAIN_ADMIN_ID) || 0;
  const adminRow = await dbGet(
    'SELECT id FROM admins WHERE telegram_id = ? AND is_active = 1',
    [user.telegram_id]
  );
  const isAdmin = user.telegram_id === MAIN_ADMIN_ID || !!adminRow;

  const token = generateToken({
    id: user.id,
    telegram_id: user.telegram_id,
    username: user.username,
    phone_verified: !!user.phone_verified_at,
  });

  return res.status(200).json({
    success: true,
    token,
    user: {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      phone_verified: !!user.phone_verified_at,
      is_admin: isAdmin,
      language: user.language,
    },
  });
}
