import { useEffect, useState, useCallback } from 'react';
import { notificationsApi } from '../../api/notifications.api';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import type { Notification } from '../../types';

export default function NotificationBar() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!token) return;
    try {
      const r = await notificationsApi.getUnreadCount();
      setUnread(r.data.unread_count);
    } catch {}
  }, [token]);

  const fetchAll = async () => {
    try {
      const r = await notificationsApi.getAll(1);
      setNotifications(r.data.notifications?.slice(0, 8) || []);
    } catch {}
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 20000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const handleOpen = async () => {
    if (!open) await fetchAll();
    setOpen(o => !o);
  };

  const markRead = async (id: number) => {
    await notificationsApi.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAll = async () => {
    await notificationsApi.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnread(0);
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                   text-gray-600 dark:text-gray-300
                   hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label={t('notifications')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159
               c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span className="text-sm font-medium hidden sm:inline">{t('notifications')}</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs
                           rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute left-0 top-full mt-2 w-80 z-50
                          bg-white dark:bg-gray-800 rounded-xl shadow-xl
                          border border-gray-200 dark:border-gray-700
                          max-h-96 flex flex-col"
               dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3
                            border-b border-gray-100 dark:border-gray-700">
              <span className="font-semibold text-sm dark:text-gray-100">
                الإشعارات {unread > 0 && <span className="badge-red mr-1">{unread}</span>}
              </span>
              {unread > 0 && (
                <button onClick={markAll}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  {t('markAllRead')}
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {!notifications.length && (
                <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-sm">
                {t('noNotifications')}
              </div>
              )}
              {notifications.map(n => (
                <div key={n.id} onClick={() => n.is_read === 0 && markRead(n.id)}
                  className={`px-4 py-3 cursor-pointer border-b border-gray-50 dark:border-gray-700/50
                    last:border-0 transition-colors
                    ${n.is_read === 0
                      ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium dark:text-gray-200 truncate">{n.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(n.created_at).toLocaleString('ar')}
                      </p>
                    </div>
                    {n.is_read === 0 && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-1 shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
