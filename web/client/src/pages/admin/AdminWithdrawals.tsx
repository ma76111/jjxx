import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin.api';

export default function AdminWithdrawals() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = () => { setLoading(true); adminApi.getWithdrawals().then(r => setList(r.data.withdrawals)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const complete = async (id: number) => {
    try { await adminApi.completeWithdrawal(id); setMsg('✅ تم الإتمام.'); load(); }
    catch (e: any) { setMsg(`❌ ${e.response?.data?.error || 'خطأ'}`); }
  };
  const reject = async (id: number) => {
    const reason = prompt('سبب الرفض:'); if (!reason) return;
    try { await adminApi.rejectWithdrawal(id, reason); setMsg('✅ تم الرفض وإعادة الرصيد.'); load(); } catch { setMsg('❌ خطأ.'); }
  };

  if (loading) return <div className="text-gray-400 dark:text-gray-500">جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold dark:text-gray-100">📤 السحوبات المعلقة</h2>
      {msg && <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">{msg}</div>}
      {!list.length && <p className="text-gray-500 dark:text-gray-400">لا توجد سحوبات معلقة.</p>}
      <div className="grid gap-3">
        {list.map(w => (
          <div key={w.id} className="card space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold dark:text-gray-100">سحب #{w.id}</span>
              <span className="badge-yellow">{w.status}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
              <div>👤 @{w.username || w.user_id} | 💰 {w.amount} USDT</div>
              {w.wallet_address && <div className="font-mono text-xs break-all">📋 {w.wallet_address}</div>}
              <div>🌐 {w.network} | 📅 {new Date(w.created_at).toLocaleString('ar')}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn-success text-sm" onClick={() => complete(w.id)}>✅ إتمام</button>
              <button className="btn-danger text-sm" onClick={() => reject(w.id)}>❌ رفض</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
