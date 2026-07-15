import NotificationBar from './NotificationBar';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { useSidebar } from '../../context/SidebarContext';
import { useLocation } from 'react-router-dom';

const routeKeyMap: Record<string, string> = {
  '/':               'home',
  '/tasks':          'tasks',
  '/my-tasks':       'myTasks',
  '/submissions':    'submissions',
  '/wallet':         'wallet',
  '/tickets':        'tickets',
  '/notifications':  'notifications',
};

const adminLabels: Record<string, string> = {
  '/admin':                  'إحصائيات',
  '/admin/deposits':         'الإيداعات',
  '/admin/withdrawals':      'السحوبات',
  '/admin/submissions':      'الإثباتات',
  '/admin/appeals':          'الاستئنافات',
  '/admin/bans':             'المحظورون',
  '/admin/settings':         'الإعدادات',
  '/admin/users':            'بحث مستخدم',
  '/admin/device-logs':      'سجل الأجهزة',
  '/admin/duplicates':       'حسابات مكررة',
  '/admin/reports':          'الإبلاغات',
  '/admin/violations':       'المخالفات والأمان',
  '/admin/duplicate-proofs': 'إثباتات مكررة',
};

export default function Topbar() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const { toggle } = useSidebar();

  const pageTitle = routeKeyMap[pathname]
    ? t(routeKeyMap[pathname])
    : adminLabels[pathname] || '';

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-900
                       border-b border-gray-200 dark:border-gray-700
                       px-3 py-2 flex items-center justify-between gap-2 shadow-sm">

      <div className="flex items-center gap-2 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggle}
          className="md:hidden flex-shrink-0 p-2 rounded-lg text-gray-600 dark:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="فتح القائمة"
        >
          {/* 3-line hamburger icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}
               viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm sm:text-base truncate">
          {pageTitle}
        </span>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {user && <LanguageSwitcher />}
        {user && <NotificationBar />}
        <ThemeToggle />
      </div>
    </header>
  );
}
