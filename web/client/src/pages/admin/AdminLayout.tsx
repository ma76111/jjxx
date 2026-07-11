import { Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xl font-bold text-gray-800 dark:text-gray-100">⚙️ لوحة الأدمن</span>
      </div>
      <Outlet />
    </div>
  );
}
