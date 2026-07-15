import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { useSidebar } from '../../context/SidebarContext';

const userLinks = [
  { to: '/',             key: 'home',          icon: '📊', exact: true },
  { to: '/tasks',        key: 'tasks',         icon: '📝' },
  { to: '/my-tasks',     key: 'myTasks',       icon: '🗂' },
  { to: '/submissions',  key: 'submissions',   icon: '📤' },
  { to: '/wallet',       key: 'wallet',        icon: '💰' },
  { to: '/tickets',      key: 'tickets',       icon: '🎫' },
  { to: '/notifications',key: 'notifications', icon: '🔔' },
];

const adminLinks = [
  { to: '/admin',                  label: '📈 إحصائيات',        exact: true },
  { to: '/admin/deposits',         label: '📥 الإيداعات' },
  { to: '/admin/withdrawals',      label: '📤 السحوبات' },
  { to: '/admin/submissions',      label: '📋 الإثباتات' },
  { to: '/admin/appeals',          label: '⚖️ الاستئنافات' },
  { to: '/admin/bans',             label: '🚫 المحظورون' },
  { to: '/admin/reports',          label: '📊 الإبلاغات' },
  { to: '/admin/violations',       label: '🛡 المخالفات والأمان' },
  { to: '/admin/users',            label: '🔍 بحث مستخدم' },
  { to: '/admin/device-logs',      label: '📡 سجل الأجهزة' },
  { to: '/admin/duplicates',       label: '👥 حسابات مكررة' },
  { to: '/admin/duplicate-proofs', label: '🚩 إثباتات مكررة' },
  { to: '/admin/settings',         label: '⚙️ الإعدادات' },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const { t } = useI18n();
  const { isOpen, close } = useSidebar();
  const navigate = useNavigate();

  const cls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
      isActive
        ? 'bg-blue-600 text-white dark:bg-blue-500'
        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
    }`;

  // Close sidebar and navigate (for mobile — tapping a link closes the drawer)
  const handleNavClick = () => {
    close();
  };

  const handleLogout = () => {
    close();
    logout();
  };

  const sidebarContent = (
    <aside className="w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700
                      flex flex-col h-full p-4 gap-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-lg text-blue-700 dark:text-blue-400">
          🤖 {t('dashboard')}
        </span>
        {/* Close button — mobile only */}
        <button
          onClick={close}
          className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100
                     dark:text-gray-400 dark:hover:bg-gray-700"
          aria-label="إغلاق القائمة"
        >
          ✕
        </button>
      </div>

      {user && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 truncate px-1">
          @{user.username || user.telegram_id}
        </div>
      )}

      {/* User nav */}
      <nav className="flex flex-col gap-1">
        {userLinks.map(l => (
          <NavLink key={l.to} to={l.to} end={l.exact} className={cls} onClick={handleNavClick}>
            <span>{l.icon}</span>
            <span>{t(l.key)}</span>
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
              <NavLink key={l.to} to={l.to} end={l.exact} className={cls} onClick={handleNavClick}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </>
      )}

      {/* Logout */}
      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full text-right px-3 py-2.5 text-sm text-red-500 hover:bg-red-50
                     dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
        >
          <span>🚪</span>
          <span>{t('logout')}</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Desktop: always visible sidebar ── */}
      <div className="hidden md:flex w-64 min-h-screen shrink-0">
        {sidebarContent}
      </div>

      {/* ── Mobile: drawer overlay ── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer panel — slides in from right (RTL) */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-72 shadow-2xl
                    transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
