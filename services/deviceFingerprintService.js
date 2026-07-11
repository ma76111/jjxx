import crypto from 'crypto';
import { dbGet, dbAll, dbRun } from '../config/database.js';

export function generateFingerprint(ip, userAgent) {
  return crypto
    .createHash('sha256')
    .update(`${ip || ''}|${userAgent || ''}`)
    .digest('hex');
}

export async function logDevice({ userId, ip, userAgent, countryCode, sessionType }) {
  const fingerprint = generateFingerprint(ip, userAgent);
  await dbRun(
    `INSERT INTO device_logs (user_id, ip_address, user_agent, fingerprint, country_code, session_type)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, ip || null, userAgent || null, fingerprint, countryCode || null, sessionType || 'web']
  );
  return fingerprint;
}

export async function findDuplicateAccounts() {
  // Group by fingerprint where multiple distinct users share same fingerprint
  const rows = await dbAll(`
    SELECT dl.fingerprint, dl.ip_address as shared_ip, COUNT(DISTINCT dl.user_id) as user_count,
           COUNT(*) as occurrences,
           GROUP_CONCAT(DISTINCT dl.user_id) as user_ids
    FROM device_logs dl
    GROUP BY dl.fingerprint
    HAVING user_count > 1
    ORDER BY occurrences DESC
  `);

  const results = [];
  for (const row of rows) {
    const userIds = row.user_ids.split(',').map(Number);
    const users = await dbAll(
      `SELECT id, telegram_id, username FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`,
      userIds
    );
    results.push({
      fingerprint: row.fingerprint,
      shared_ip: row.shared_ip,
      occurrences: row.occurrences,
      users,
    });
  }
  return results;
}

/**
 * Check if a phone number is already used by another telegram_id.
 * Used for duplicate account detection via phone.
 */
export async function checkDuplicatePhone(phone, currentTelegramId) {
  const row = await dbGet(
    `SELECT id, telegram_id, username FROM users
     WHERE phone_number = ? AND phone_verified_at IS NOT NULL AND telegram_id != ?`,
    [phone, currentTelegramId]
  );
  return row || null;
}
