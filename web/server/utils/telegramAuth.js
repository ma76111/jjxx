import crypto from 'crypto';

/**
 * Verify Telegram Login Widget data (HMAC-SHA256).
 * Not used in the primary login flow (which uses Deep Link + Contact),
 * but kept here for any future widget integrations.
 */
export function verifyTelegramAuth(data, botToken) {
  const { hash, ...rest } = data;
  if (!hash) return false;

  // Check auth_date freshness (max 1 hour)
  const authDate = parseInt(rest.auth_date, 10);
  if (Date.now() / 1000 - authDate > 3600) return false;

  const checkString = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const expectedHash = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex');

  return expectedHash === hash;
}
