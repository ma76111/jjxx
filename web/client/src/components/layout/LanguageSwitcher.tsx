import { useState, useRef, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';

const LANGS = [
  { code: 'ar', label: 'عربي', flag: '🇸🇦' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

export default function LanguageSwitcher() {
  const { user, login, token } = useAuth();
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = LANGS.find(l => l.code === lang) || LANGS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const switchLang = async (code: string) => {
    if (code === lang || saving) return;
    setSaving(true);
    setOpen(false);

    // 1. Update UI immediately
    setLang(code);

    // 2. Persist to DB via API (syncs with bot too — same bot.db)
    try {
      await axiosClient.put('/user/language', { language: code });
      // Update cached user in AuthContext
      if (user && token) {
        login(token, { ...user, language: code });
      }
    } catch {
      // Revert on failure
      setLang(lang);
    }
    setSaving(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                   text-gray-600 dark:text-gray-300
                   hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                   disabled:opacity-50"
        aria-label="تغيير اللغة"
      >
        <span>{currentLang.flag}</span>
        <span className="hidden sm:inline font-medium">{currentLang.label}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 min-w-[140px]
                          bg-white dark:bg-gray-800 rounded-xl shadow-lg
                          border border-gray-200 dark:border-gray-700 overflow-hidden"
               dir="ltr">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => switchLang(l.code)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors
                  ${l.code === lang
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.label}</span>
                {l.code === lang && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mr-auto text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
