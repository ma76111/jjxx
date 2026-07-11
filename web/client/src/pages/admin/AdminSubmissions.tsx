import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin.api';
import { tasksApi } from '../../api/tasks.api';

export default function AdminSubmissions() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = () => { setLoading(true); adminApi.getSubmissions().then(r => setList(r.data.submissions)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const accept = async (id: number) => {
    try { await adminApi.acceptSubmission(id); setMsg('✅ تم القبول.'); load(); } catch { setMsg('❌ خطأ.'); }
  };
  const reject = async (id: number, type: 'retry' | 'final') => {
    const m = prompt(`سبب الرفض (${type === 'retry' ? 'مؤقت' : 'نهائي'}):`); if (!m) return;
    try { await adminApi.rejectSubmission(id, { reject_type: type, reject_message: m }); setMsg(`✅ تم الرفض (${type}).`); load(); } catch { setMsg('❌ خطأ.'); }
  };
  const reportDup = async (id: number) => {
    const dupId = prompt('رقم الإثبات المكرر المشتبه به:');
    if (!dupId || isNaN(parseInt(dupId))) return;
    try {
      await tasksApi.reportDuplicate(id, parseInt(dupId));
      setMsg('✅ تم إرسال بلاغ الإثبات المكرر.');
    } catch (e: any) {
      setMsg(`❌ ${e.response?.data?.error || 'خطأ'}`);
    }
  };

  if (loading) return <div className="text-gray-400 dark:text-gray-500">جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold dark:text-gray-100">📋 الإثباتات المعلقة</h2>
      {msg && <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">{msg}</div>}
      {!list.length && <p className="text-gray-500 dark:text-gray-400">لا توجد إثباتات معلقة.</p>}
      <div className="grid gap-3">
        {list.map(s => (
          <div key={s.id} className="card space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold dark:text-gray-100">إثبات #{s.id} — مهمة #{s.task_id}</span>
              <span className="badge-yellow">معلق</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              👤 @{s.username || s.user_id} |
              {s.task_type === 'paid' ? ` 💰 ${s.reward_per_user} USDT` : ' 🔄 تبادل'}
              {s.bot_name && ` | 🤖 ${s.bot_name}`}
            </div>
            {s.proof_text && <p className="text-sm bg-gray-50 dark:bg-gray-700/50 rounded p-2 dark:text-gray-300">{s.proof_text}</p>}
            {s.proof_images && <div className="text-xs text-gray-400 dark:text-gray-500">🖼 {JSON.parse(s.proof_images).length} صورة مرفقة</div>}
            <div className="text-xs text-gray-400 dark:text-gray-500">{new Date(s.created_at).toLocaleString('ar')}</div>
            <div className="flex gap-2 flex-wrap">
              <button className="btn-success text-sm" onClick={() => accept(s.id)}>✅ قبول</button>
              <button className="btn-secondary text-sm" onClick={() => reject(s.id, 'retry')}>🔄 رفض مؤقت</button>
              <button className="btn-danger text-sm" onClick={() => reject(s.id, 'final')}>❌ رفض نهائي</button>
              <button className="btn-secondary text-sm" onClick={() => reportDup(s.id)}>🚩 إثبات مكرر</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminSubmissions() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = () => { setLoading(true); adminApi.getSubmissions().then(r => setList(r.data.submissions)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const accept = async (id: number) => {
    try { await adminApi.acceptSubmission(id); setMsg('✅ تم القبول.'); load(); } catch { setMsg('❌ خطأ.'); }
  };
  const reject = async (id: number, type: 'retry' | 'final') => {
    const m = prompt(`سبب الرفض (${type === 'retry' ? 'مؤقت' : 'نهائي'}):`); if (!m) return;
    try { await adminApi.rejectSubmission(id, { reject_type: type, reject_message: m }); setMsg(`✅ تم الرفض (${type}).`); load(); } catch { setMsg('❌ خطأ.'); }
  };

  if (loading) return <div className="text-gray-400 dark:text-gray-500">جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold dark:text-gray-100">📋 الإثباتات المعلقة</h2>
      {msg && <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">{msg}</div>}
      {!list.length && <p className="text-gray-500 dark:text-gray-400">لا توجد إثباتات معلقة.</p>}
      <div className="grid gap-3">
        {list.map(s => (
          <div key={s.id} className="card space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold dark:text-gray-100">إثبات #{s.id} — مهمة #{s.task_id}</span>
              <span className="badge-yellow">معلق</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              👤 @{s.username || s.user_id} |
              {s.task_type === 'paid' ? ` 💰 ${s.reward_per_user} USDT` : ' 🔄 تبادل'}
              {s.bot_name && ` | 🤖 ${s.bot_name}`}
            </div>
            {s.proof_text && <p className="text-sm bg-gray-50 dark:bg-gray-700/50 rounded p-2 dark:text-gray-300">{s.proof_text}</p>}
            {s.proof_images && <div className="text-xs text-gray-400 dark:text-gray-500">🖼 {JSON.parse(s.proof_images).length} صورة مرفقة</div>}
            <div className="text-xs text-gray-400 dark:text-gray-500">{new Date(s.created_at).toLocaleString('ar')}</div>
            <div className="flex gap-2 flex-wrap">
              <button className="btn-success text-sm" onClick={() => accept(s.id)}>✅ قبول</button>
              <button className="btn-secondary text-sm" onClick={() => reject(s.id, 'retry')}>🔄 رفض مؤقت</button>
              <button className="btn-danger text-sm" onClick={() => reject(s.id, 'final')}>❌ رفض نهائي</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
