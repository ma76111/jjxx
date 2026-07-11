import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin.api';

export default function AdminAppeals() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = () => { setLoading(true); adminApi.getAppeals().then(r => setList(r.data.appeals)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const approve = async (id: number) => {
    const note = prompt('ملاحظة (اختياري):') || '';
    try { await adminApi.approveAppeal(id, note); setMsg('✅ تم قبول الاستئناف.'); load(); } catch { setMsg('❌ خطأ.'); }
  };
  const reject = async (id: number) => {
    const note = prompt('سبب الرفض (إلزامي):'); if (!note) return;
    try { await adminApi.rejectAppeal(id, note); setMsg('✅ تم الرفض.'); load(); } catch { setMsg('❌ خطأ.'); }
  };

  if (loading) return <div className="text-gray-400 dark:text-gray-500">جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold dark:text-gray-100">⚖️ الاستئنافات المعلقة</h2>
      {msg && <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">{msg}</div>}
      {!list.length && <p className="text-gray-500 dark:text-gray-400">لا توجد استئنافات.</p>}
      <div className="grid gap-3">
        {list.map(a => (
          <div key={a.id} className="card space-y-2">
            <div className="font-semibold dark:text-gray-100">استئناف #{a.id}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">👤 @{a.username} | نوع الحظر: {a.ban_type}</div>
            <div className="text-sm bg-gray-50 dark:bg-gray-700/50 rounded p-2 dark:text-gray-300">📝 {a.reason}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">سبب الحظر: {a.ban_reason}</div>
            <div className="flex gap-2">
              <button className="btn-success text-sm" onClick={() => approve(a.id)}>✅ قبول الاستئناف</button>
              <button className="btn-danger text-sm" onClick={() => reject(a.id)}>❌ رفض الاستئناف</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
