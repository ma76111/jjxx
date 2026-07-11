import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin.api';

export default function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = () => { setLoading(true); adminApi.getReports().then(r => setReports(r.data.reports)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const confirm = async (id: number) => {
    try { await adminApi.confirmReport(id); setMsg('✅ تم تأكيد البلاغ.'); load(); } catch { setMsg('❌ خطأ.'); }
  };
  const dismiss = async (id: number) => {
    try { await adminApi.dismissReport(id); setMsg('✅ تم رفض البلاغ.'); load(); } catch { setMsg('❌ خطأ.'); }
  };

  if (loading) return <div className="text-gray-400 dark:text-gray-500">جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold dark:text-gray-100">📊 الإبلاغات المعلقة</h2>
      {msg && <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">{msg}</div>}
      {!reports.length && <p className="text-gray-500 dark:text-gray-400">لا توجد إبلاغات معلقة.</p>}
      <div className="grid gap-3">
        {reports.map(r => (
          <div key={r.id} className="card space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold dark:text-gray-100">بلاغ #{r.id}</span>
              <span className="badge-yellow">معلق</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
              <div>📢 المُبلِّغ: @{r.reporter_name}</div>
              <div>🎯 المُبلَّغ عنه: @{r.reported_name}</div>
              <div>📝 {r.reason}</div>
              <div>📅 {new Date(r.created_at).toLocaleString('ar')}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn-danger text-sm" onClick={() => confirm(r.id)}>✅ تأكيد البلاغ</button>
              <button className="btn-secondary text-sm" onClick={() => dismiss(r.id)}>❌ رفض البلاغ</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
