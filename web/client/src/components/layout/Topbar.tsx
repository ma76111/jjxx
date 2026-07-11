import NotificationBar from './NotificationBar';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { useLocation } from 'react-router-dom';

// Route key → i18n key (or fixed Arabic for admin pages)
const routeKeyMap: Record<string, string> = {
  '/':                   'home',
  '/tasks':              'tasks',
  '/my-tasks':           'myTasks',
  '/submissions':        'submissions',
  '/wallet':             'wallet',
  '/tickets':            'tickets',
  '/notifications':      'notifications',
};

// Admin pages stay Arabic
const adminLabels: Record<string, string> = {
  '/admin':              'إحصائيات',
  '/admin/deposits':     'الإيداعات',
  '/admin/withdrawals':  'السحوبات',
  '/admin/submissions':  'الإثباتات',
  '/admin/appeals':      'الاستئنافات',
  '/admin/bans':         'المحظورون',
  '/admin/settings':     'الإعدادات',
  '/admin/users':        'بحث مستخدم',
  '/admin/device-logs':  'سجل الأجهزة',
  '/admin/duplicates':   'حسابات مكررة',
  '/admin/reports':      'الإبلاغات',
  '/admin/violations':   'المخالفات والأمان',
};

export default function Topbar() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { pathname } = useLocation();

  const pageTitle = routeKeyMap[pathname]
    ? t(routeKeyMap[pathname])
    : adminLabels[pathname] || '';

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-900
                        border-b border-gray-200 dark:border-gray-700
                        px-4 py-2 flex items-center justify-between gap-4 shadow-sm">
      <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm sm:text-base">
        {pageTitle}
      </span>

      <div className="flex items-center gap-1">
        {user && <LanguageSwitcher />}
        {user && <NotificationBar />}
        <ThemeToggle />
      </div>
    </header>
  );
}
