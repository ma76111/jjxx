import { dbGet, dbRun, dbAll } from '../config/database.js';

export async function getSetting(key, defaultValue = null) {
  const row = await dbGet('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : defaultValue;
}

export async function setSetting(key, value) {
  await dbRun(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, String(value)]
  );
}

export async function getAllSettings() {
  const rows = await dbAll('SELECT key, value, updated_at FROM settings ORDER BY key');
  const result = {};
  for (const row of rows) result[row.key] = row.value;
  return result;
}

export async function updateSettings(settingsObj) {
  for (const [key, value] of Object.entries(settingsObj)) {
    await setSetting(key, value);
  }
}
