import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin.api';

export default function AdminDeposits() {
  const [deps, setDeps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = () => { setLoading(true); adminApi.getDeposits().then(r => setDeps(r.data.deposits)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const accept = async (id: number) => {
    try { await adminApi.acceptDeposit(id); setMsg('✅ تم القبول.'); load(); } catch { setMsg('❌ خطأ.'); }
  };
  const reject = async (id: number) => {
    const reason = prompt('سبب الرفض:'); if (!reason) return;
    try { await adminApi.rejectDeposit(id, reason); setMsg('✅ تم الرفض.'); load(); } catch { setMsg('❌ خطأ.'); }
  };

  if (loading) return <div className="text-gray-400 dark:text-gray-500">جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold dark:text-gray-100">📥 الإيداعات المعلقة</h2>
      {msg && <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">{msg}</div>}
      {!deps.length && <p className="text-gray-500 dark:text-gray-400">لا توجد إيداعات معلقة.</p>}
      <div className="grid gap-3">
        {deps.map(d => (
          <div key={d.id} className="card space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold dark:text-gray-100">إيداع #{d.id}</span>
              <span className="badge-yellow">{d.status}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
              <div>👤 @{d.username || d.user_id} | 💰 {d.amount} USDT | 📡 {d.method}</div>
              {d.txid && <div className="font-mono text-xs break-all text-gray-500 dark:text-gray-500">TXID: {d.txid}</div>}
              {d.binance_id && <div>Binance ID: {d.binance_id}</div>}
              {d.network && <div>🌐 {d.network}</div>}
              <div>📅 {new Date(d.created_at).toLocaleString('ar')}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn-success text-sm" onClick={() => accept(d.id)}>✅ قبول</button>
              <button className="btn-danger text-sm" onClick={() => reject(d.id)}>❌ رفض</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
