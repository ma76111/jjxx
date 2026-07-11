import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';

const userLinks = [
  { to: '/',             key: 'home',          icon: '📊', exact: true },
  { to: '/tasks',        key: 'tasks',         icon: '📝' },
  { to: '/my-tasks',     key: 'myTasks',       icon: '🗂' },
  { to: '/submissions',  key: 'submissions',   icon: '📤' },
  { to: '/wallet',       key: 'wallet',        icon: '💰' },
  { to: '/tickets',      key: 'tickets',       icon: '🎫' },
  { to: '/notifications',key: 'notifications', icon: '🔔' },
];

// Admin links stay in Arabic (admin UI always Arabic)
const adminLinks = [
  { to: '/admin',              label: '📈 إحصائيات',           exact: true },
  { to: '/admin/deposits',     label: '📥 الإيداعات' },
  { to: '/admin/withdrawals',  label: '📤 السحوبات' },
  { to: '/admin/submissions',  label: '📋 الإثباتات' },
  { to: '/admin/appeals',      label: '⚖️ الاستئنافات' },
  { to: '/admin/bans',         label: '🚫 المحظورون' },
  { to: '/admin/reports',      label: '📊 الإبلاغات' },
  { to: '/admin/violations',   label: '🛡 المخالفات والأمان' },
  { to: '/admin/users',        label: '🔍 بحث مستخدم' },
  { to: '/admin/device-logs',  label: '📡 سجل الأجهزة' },
  { to: '/admin/duplicates',   label: '👥 حسابات مكررة' },
  { to: '/admin/duplicate-proofs', label: '🚩 إثباتات مكررة' },
  { to: '/admin/settings',     label: '⚙️ الإعدادات' },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const { t } = useI18n();

  const cls = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-lg text-sm transition-colors ${
      isActive
        ? 'bg-blue-600 text-white dark:bg-blue-500'
        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
    }`;

  return (
    <aside className="w-56 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700
                      flex flex-col min-h-screen p-4 gap-1 shrink-0">
      {/* Header */}
      <div className="mb-4">
        <span className="font-bold text-lg text-blue-700 dark:text-blue-400">
          🤖 {t('dashboard')}
        </span>
        {user && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
            @{user.username || user.telegram_id}
          </div>
        )}
      </div>

      {/* User nav — labels come from i18n */}
      <nav className="flex flex-col gap-1">
        {userLinks.map(l => (
          <NavLink key={l.to} to={l.to} end={l.exact} className={cls}>
            {l.icon} {t(l.key)}
          </NavLink>
        ))}
      </nav>

      {/* Admin nav */}
      {isAdmin && (
        <>
          <div className="mt-4 mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase px-1">
            {t('admin')}
          </div>
          <nav className="flex flex-col gap-1">
            {adminLinks.map(l => (
              <NavLink key={l.to} to={l.to} end={l.exact} className={cls}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </>
      )}

      {/* Logout */}
      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={logout}
          className="w-full text-right px-3 py-2 text-sm text-red-500 hover:bg-red-50
                     dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          {t('logout')}
        </button>
      </div>
    </aside>
  );
}
