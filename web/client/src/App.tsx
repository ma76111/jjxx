import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider, useI18n } from './context/I18nContext';
import { SidebarProvider } from './context/SidebarContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import MyTasks from './pages/MyTasks';
import Submissions from './pages/Submissions';
import Wallet from './pages/Wallet';
import Tickets from './pages/Tickets';

import AdminLayout from './pages/admin/AdminLayout';
import AdminStats from './pages/admin/AdminStats';
import AdminDeposits from './pages/admin/AdminDeposits';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminSubmissions from './pages/admin/AdminSubmissions';
import AdminAppeals from './pages/admin/AdminAppeals';
import AdminBans from './pages/admin/AdminBans';
import AdminSettings from './pages/admin/AdminSettings';
import AdminUserSearch from './pages/admin/AdminUserSearch';
import AdminDeviceLogs from './pages/admin/AdminDeviceLogs';
import AdminDuplicateAccounts from './pages/admin/AdminDuplicateAccounts';
import AdminReports from './pages/admin/AdminReports';
import AdminViolations from './pages/admin/AdminViolations';
import AdminDuplicateProofReports from './pages/admin/AdminDuplicateProofReports';

import Notifications from './pages/Notifications';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';

// Bridge: syncs I18n with user.language from DB (shared with bot)
// On mount + window focus → AuthContext refreshes user from API → I18nSync picks up new lang
function I18nBridge({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const initialLang = user?.language || 'ar';

  return (
    <I18nProvider initialLang={initialLang}>
      <_I18nSync userLang={user?.language}>{children}</_I18nSync>
    </I18nProvider>
  );
}

// Syncs lang whenever user.language changes (e.g. refreshUser() picked up a bot lang change)
function _I18nSync({ children, userLang }: { children: React.ReactNode; userLang?: string }) {
  const { lang, setLang } = useI18n();
  useEffect(() => {
    if (userLang && userLang !== lang) setLang(userLang);
  }, [userLang]); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, isAdmin } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nBridge>
          <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><AppLayout><Tasks /></AppLayout></ProtectedRoute>} />
          <Route path="/my-tasks" element={<ProtectedRoute><AppLayout><MyTasks /></AppLayout></ProtectedRoute>} />
          <Route path="/submissions" element={<ProtectedRoute><AppLayout><Submissions /></AppLayout></ProtectedRoute>} />
          <Route path="/wallet" element={<ProtectedRoute><AppLayout><Wallet /></AppLayout></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><AppLayout><Tickets /></AppLayout></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><AppLayout><Notifications /></AppLayout></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminStats />} />
            <Route path="deposits" element={<AdminDeposits />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="submissions" element={<AdminSubmissions />} />
            <Route path="appeals" element={<AdminAppeals />} />
            <Route path="bans" element={<AdminBans />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="users" element={<AdminUserSearch />} />
            <Route path="device-logs" element={<AdminDeviceLogs />} />
            <Route path="duplicates" element={<AdminDuplicateAccounts />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="violations" element={<AdminViolations />} />
            <Route path="duplicate-proofs" element={<AdminDuplicateProofReports />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
        </I18nBridge>
    </AuthProvider>
  </ThemeProvider>
  );
}
