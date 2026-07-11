/**
 * Input validation utilities
 */

export function isValidBotName(name) {
  return /^@[a-zA-Z][a-zA-Z0-9_]{3,}bot$/i.test(name.trim());
}

export function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isValidTelegramLink(url) {
  try {
    const u = new URL(url);
    return u.hostname === 't.me' && u.pathname.length > 1;
  } catch {
    return false;
  }
}

export function isPositiveNumber(val) {
  const n = parseFloat(val);
  return !isNaN(n) && n > 0;
}

export function isPositiveInteger(val) {
  const n = parseInt(val, 10);
  return !isNaN(n) && n > 0 && String(n) === String(val).trim();
}

export function isValidTxid(txid) {
  // TXID is typically hex 64 chars (BTC/ETH style) or base58; basic length check
  return typeof txid === 'string' && txid.trim().length >= 20;
}

export function isValidNetwork(network) {
  return ['BSC', 'TRC20', 'TON'].includes(network);
}

export function isValidLanguage(lang) {
  return ['ar', 'en', 'ru', 'fa', 'tr'].includes(lang);
}

export function sanitizeText(text, maxLen = 1000) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, maxLen);
}

export function isValidAmount(val, min = 0) {
  const n = parseFloat(val);
  return !isNaN(n) && n > min;
}

export function isValidPriority(p) {
  return ['low', 'medium', 'high', 'urgent'].includes(p);
}
