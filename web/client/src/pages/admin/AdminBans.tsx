import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin.api';

export default function AdminBans() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = () => { setLoading(true); adminApi.getBans().then(r => setList(r.data.bans)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const unban = async (id: number) => {
    if (!confirm('رفع الحظر عن هذا المستخدم؟')) return;
    try { await adminApi.unbanUser(id); setMsg('✅ تم رفع الحظر.'); load(); } catch { setMsg('❌ خطأ.'); }
  };

  if (loading) return <div className="text-gray-400 dark:text-gray-500">جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold dark:text-gray-100">🚫 المحظورون</h2>
      {msg && <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">{msg}</div>}
      {!list.length && <p className="text-gray-500 dark:text-gray-400">لا يوجد محظورون.</p>}
      <div className="grid gap-3">
        {list.map((b, i) => (
          <div key={i} className="card space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold dark:text-gray-100">@{b.username || b.telegram_id}</span>
              <span className={b.ban_status === 'permanent' ? 'badge-red' : 'badge-yellow'}>{b.ban_status}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              📌 {b.reason}
              {b.ban_expires_at && <span> | ينتهي: {new Date(b.ban_expires_at).toLocaleDateString('ar')}</span>}
            </div>
            {b.ban_status !== 'permanent' && (
              <button className="btn-secondary text-sm" onClick={() => unban(b.id)}>🔓 رفع الحظر</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
