import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPPORTED = ['ar', 'en', 'ru', 'fa', 'tr'];
const DEFAULT_LANG = 'ar';

const cache = {};

function loadLang(lang) {
  if (cache[lang]) return cache[lang];
  try {
    const file = join(__dirname, '..', 'i18n', `${lang}.json`);
    cache[lang] = JSON.parse(readFileSync(file, 'utf-8'));
  } catch {
    cache[lang] = {};
  }
  return cache[lang];
}

// Preload all supported languages
for (const lang of SUPPORTED) loadLang(lang);

/**
 * Translate a key for a given language, with optional variable substitution.
 * Falls back to Arabic if key not found in target language.
 */
export function t(lang, key, vars = {}) {
  const l = SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
  const strings = loadLang(l);
  const fallback = loadLang(DEFAULT_LANG);

  let text = strings[key] || fallback[key] || key;

  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

export const supportedLanguages = SUPPORTED;
