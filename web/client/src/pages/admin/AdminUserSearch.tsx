import { useState } from 'react';
import { adminApi } from '../../api/admin.api';
import type { Violation } from '../../types';

export default function AdminUserSearch() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { const r = await adminApi.searchUsers(q); setUsers(r.data.users); setSelected(null); }
    catch { setMsg('❌ خطأ.'); } finally { setLoading(false); }
  };

  const selectUser = async (u: any) => {
    setSelected(u);
    const r = await adminApi.getUserViolations(u.id);
    setViolations(r.data.violations);
  };

  const adjustBalance = async () => {
    const dir = prompt('الاتجاه: add أو subtract'); if (!dir || !['add','subtract'].includes(dir)) return;
    const amount = parseFloat(prompt('المبلغ (USDT):') || '0'); if (!amount) return;
    const reason = prompt('السبب:') || '';
    try {
      const r = await adminApi.adjustBalance(selected.id, { amount, direction: dir, reason });
      if (r.data.requires_approval) setMsg(`⚠️ يحتاج موافقة — اقتراح #${r.data.proposal_id}`);
      else { setMsg(`✅ الرصيد الجديد: ${r.data.new_balance} USDT`); selectUser(selected); }
    } catch (e: any) { setMsg(`❌ ${e.response?.data?.error || 'خطأ'}`); }
  };

  const adjustPoints = async () => {
    const dir = prompt('الاتجاه: add أو subtract'); if (!dir) return;
    const amount = parseInt(prompt('النقاط:') || '0'); if (!amount) return;
    try { const r = await adminApi.adjustPoints(selected.id, { amount, direction: dir }); setMsg(`✅ النقاط: ${r.data.new_points}`); }
    catch { setMsg('❌ خطأ.'); }
  };

  const banUser = async () => {
    const type = prompt('temporary أو permanent'); if (!type) return;
    const days = type === 'temporary' ? parseInt(prompt('الأيام:') || '3') : undefined;
    const reason = prompt('السبب:'); if (!reason) return;
    try { await adminApi.banUser(selected.id, { type, duration_days: days, reason }); setMsg('✅ تم الحظر.'); selectUser(selected); }
    catch { setMsg('❌ خطأ.'); }
  };

  const unbanUser = async () => {
    if (!confirm('رفع الحظر؟')) return;
    try { await adminApi.unbanUser(selected.id); setMsg('✅ تم رفع الحظر.'); selectUser(selected); }
    catch { setMsg('❌ خطأ.'); }
  };

  const expireViolation = async (vId: number) => {
    try { await adminApi.expireViolation(selected.id, vId); setMsg('✅ تم إنهاء المخالفة.'); selectUser(selected); } catch { setMsg('❌ خطأ.'); }
  };
  const restoreViolation = async (vId: number) => {
    try { await adminApi.restoreViolation(selected.id, vId); setMsg('✅ تم الاسترجاع.'); selectUser(selected); } catch { setMsg('❌ خطأ.'); }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="text-xl font-semibold dark:text-gray-100">🔍 بحث عن مستخدم</h2>
      {msg && <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">{msg}</div>}

      <form onSubmit={search} className="flex gap-2">
        <input className="input flex-1" placeholder="ID أو username..." value={q} onChange={e => setQ(e.target.value)} />
        <button type="submit" className="btn-primary" disabled={loading}>🔍 بحث</button>
      </form>

      {users.length > 0 && !selected && (
        <div className="grid gap-2">
          {users.map(u => (
            <button key={u.id} onClick={() => selectUser(u)}
              className="card text-right w-full hover:shadow-md transition-shadow dark:hover:bg-gray-750">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold dark:text-gray-100">#{u.id}</span>
                <span className="dark:text-gray-300">@{u.username || '—'}</span>
                <span className="text-gray-400 dark:text-gray-500 text-sm">{u.telegram_id}</span>
                {u.is_banned === 1 && <span className="badge-red">محظور</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="space-y-4">
          <button className="btn-secondary text-sm" onClick={() => { setSelected(null); setUsers([]); }}>← رجوع</button>

          <div className="card space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-lg dark:text-gray-100">#{selected.id} @{selected.username || '—'}</span>
              {selected.is_banned === 1 && <span className="badge-red">محظور ({selected.ban_status})</span>}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
              <div>📱 {selected.phone_number || 'لا يوجد'} | 🌍 {selected.country_code || '—'}</div>
              <div>💰 {selected.balance?.toFixed(4)} USDT | 🔄 {selected.exchange_points} نقطة</div>
              <div>📅 {new Date(selected.created_at).toLocaleDateString('ar')}</div>
            </div>
            <div className="flex gap-2 flex-wrap pt-2">
              <button className="btn-secondary text-sm" onClick={adjustBalance}>💰 تعديل رصيد</button>
              <button className="btn-secondary text-sm" onClick={adjustPoints}>🔄 تعديل نقاط</button>
              {selected.is_banned === 0
                ? <button className="btn-danger text-sm" onClick={banUser}>🚫 حظر</button>
                : <button className="btn-success text-sm" onClick={unbanUser}>🔓 رفع حظر</button>
              }
            </div>
          </div>

          <div className="card space-y-3">
            <h3 className="font-semibold dark:text-gray-100">🛡 سجل المخالفات</h3>
            {!violations.length && <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد مخالفات.</p>}
            {violations.map(v => (
              <div key={v.id} className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="text-sm space-y-0.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium dark:text-gray-200">{v.type}</span>
                    <span className={v.track === 'security' ? 'badge-red' : 'badge-yellow'}>{v.track}</span>
                    <span className={v.status === 'active' ? 'badge-red' : v.status === 'pending' ? 'badge-yellow' : 'badge-gray'}>
                      {v.status}
                    </span>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">{v.points} نقطة | {v.reason || '—'}</div>
                  {v.expires_at && <div className="text-xs text-gray-400 dark:text-gray-500">تنتهي: {new Date(v.expires_at).toLocaleDateString('ar')}</div>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {v.status === 'active' && <button className="btn-secondary text-xs" onClick={() => expireViolation(v.id)}>⏱ إنهاء</button>}
                  {(v.status === 'expired' || v.status === 'dismissed') && <button className="btn-secondary text-xs" onClick={() => restoreViolation(v.id)}>↩️ استرجاع</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
