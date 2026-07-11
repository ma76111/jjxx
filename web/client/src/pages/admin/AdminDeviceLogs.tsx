import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin.api';

export default function AdminDeviceLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { adminApi.getDeviceLogs().then(r => setLogs(r.data.logs)).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="text-gray-400 dark:text-gray-500">جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold dark:text-gray-100">📡 سجل الأجهزة</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700 text-right">
              <th className="p-3 dark:text-gray-300">المستخدم</th>
              <th className="p-3 dark:text-gray-300">IP</th>
              <th className="p-3 dark:text-gray-300">الجهاز</th>
              <th className="p-3 dark:text-gray-300">النوع</th>
              <th className="p-3 dark:text-gray-300">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="p-3 dark:text-gray-300">@{l.username || l.user_id}</td>
                <td className="p-3 font-mono text-xs dark:text-gray-400">{l.ip_address || '—'}</td>
                <td className="p-3 text-xs text-gray-500 dark:text-gray-500 max-w-xs truncate">{l.user_agent || '—'}</td>
                <td className="p-3"><span className="badge-blue">{l.session_type}</span></td>
                <td className="p-3 text-xs text-gray-400 dark:text-gray-500">{new Date(l.created_at).toLocaleString('ar')}</td>
              </tr>
            ))}
            {!logs.length && <tr><td colSpan={5} className="p-4 text-center text-gray-400 dark:text-gray-500">لا توجد سجلات.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
