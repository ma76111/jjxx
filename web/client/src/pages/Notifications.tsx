import { useEffect, useState } from 'react';
import { notificationsApi } from '../api/notifications.api';
import { useI18n } from '../context/I18nContext';
import type { Notification } from '../types';

export default function Notifications() {
  const { t, lang } = useI18n();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<'list' | 'prefs'>('list');
  const [loading, setLoading] = useState(true);

  const prefLabels: Record<string, string> = {
    submission_accepted: `✅ ${lang === 'ar' ? 'قبول الإثبات' : lang === 'ru' ? 'Принятие доказательства' : 'Submission Accepted'}`,
    submission_rejected: `❌ ${lang === 'ar' ? 'رفض الإثبات' : lang === 'ru' ? 'Отклонение доказательства' : 'Submission Rejected'}`,
    task_completed:      `🎉 ${lang === 'ar' ? 'اكتمال المهمة' : lang === 'ru' ? 'Задача завершена' : 'Task Completed'}`,
    promotional:         `📢 ${lang === 'ar' ? 'إعلانات' : lang === 'ru' ? 'Реклама' : 'Promotional'}`,
    system_update:       `⚙️ ${lang === 'ar' ? 'تحديثات النظام' : lang === 'ru' ? 'Обновления системы' : 'System Updates'}`,
    ticket_reply:        `🎫 ${lang === 'ar' ? 'ردود التذاكر' : lang === 'ru' ? 'Ответы на обращения' : 'Ticket Replies'}`,
    deposit_completed:   `📥 ${lang === 'ar' ? 'إتمام الإيداع' : lang === 'ru' ? 'Пополнение завершено' : 'Deposit Completed'}`,
    withdrawal_completed:`📤 ${lang === 'ar' ? 'إتمام السحب' : lang === 'ru' ? 'Вывод завершён' : 'Withdrawal Completed'}`,
  };

  const load = () => {
    setLoading(true);
    Promise.all([notificationsApi.getAll(), notificationsApi.getPrefs()])
      .then(([n, p]) => {
        setNotifications(n.data.notifications);
        const raw = p.data;
        const obj: Record<string, boolean> = {};
        for (const key of Object.keys(raw)) {
          if (typeof raw[key] === 'number') obj[key] = raw[key] === 1;
        }
        setPrefs(obj);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const markAllRead = async () => { await notificationsApi.markAllRead(); load(); };
  const markRead = async (id: number) => {
    await notificationsApi.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  };
  const savePref = async (key: string, val: boolean) => {
    setPrefs(p => ({ ...p, [key]: val }));
    await notificationsApi.updatePrefs({ [key]: val });
  };

  if (loading) return <div className="text-gray-400 dark:text-gray-500">{t('loading')}</div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('notificationsTitle')}</h1>
        <div className="flex gap-2">
          <button className={`btn ${tab === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('list')}>{t('listTab')}</button>
          <button className={`btn ${tab === 'prefs' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('prefs')}>{t('prefsTab')}</button>
        </div>
      </div>

      {tab === 'list' && (
        <>
          {notifications.some(n => !n.is_read) && (
            <button className="btn-secondary text-sm" onClick={markAllRead}>{t('markAllReadBtn')}</button>
          )}
          {!notifications.length && <p className="text-gray-500 dark:text-gray-400">{t('noNotificationsList')}</p>}
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} onClick={() => n.is_read === 0 && markRead(n.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  n.is_read === 0
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-r-4 border-blue-500'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm dark:text-gray-200">{n.title}</span>
                  {n.is_read === 0 && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{n.body}</p>
                <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(n.created_at).toLocaleString(lang)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'prefs' && (
        <div className="card space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('prefsDesc')}</p>
          {Object.entries(prefLabels).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm dark:text-gray-300">{label}</span>
              <input type="checkbox" checked={prefs[key] !== false} onChange={e => savePref(key, e.target.checked)}
                className="w-4 h-4 accent-blue-600" />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
