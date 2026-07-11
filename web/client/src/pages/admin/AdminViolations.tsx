import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin.api';

type Panel = 'trust' | 'security' | 'queue' | 'proposals';

export default function AdminViolations() {
  const [panel, setPanel] = useState<Panel>('trust');
  const [settings, setSettings] = useState<any>(null);
  const [queue, setQueue] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  const loadSettings = () => adminApi.getViolationSettings().then(r => setSettings(r.data)).catch(() => {});
  const loadQueue    = () => adminApi.getSecurityQueue().then(r => setQueue(r.data)).catch(() => {});
  const loadProposals = () => adminApi.getProposals('pending_approval').then(r => setProposals(r.data.proposals)).catch(() => {});

  useEffect(() => { loadSettings(); loadQueue(); loadProposals(); }, []);

  const withMsg = async (fn: () => Promise<void>) => {
    try { await fn(); } catch { setMsg('❌ خطأ.'); }
  };

  const tabs: { key: Panel; label: string }[] = [
    { key: 'trust',     label: '🤝 مسار الثقة' },
    { key: 'security',  label: '🔒 مسار الأمان' },
    { key: 'queue',     label: `📋 طابور${queue ? ` (${(queue.pending_reports?.length||0)+(queue.frozen_accounts?.length||0)})` : ''}` },
    { key: 'proposals', label: `📝 اقتراحات${proposals.length ? ` (${proposals.length})` : ''}` },
  ];

  const renderTrack = (track: 'trust' | 'security') => {
    if (!settings) return <div className="text-gray-400 dark:text-gray-500">جاري التحميل...</div>;
    const types = settings.types?.filter((t: any) => t.track === track) || [];
    const thresholds = settings.thresholds?.filter((t: any) => t.track === track) || [];

    return (
      <div className="space-y-6">
        <div className="card space-y-3">
          <h3 className="font-semibold dark:text-gray-100">أنواع المخالفات — {track}</h3>
          {types.map((t: any) => (
            <div key={t.type_key} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-sm">
                <span className="font-medium dark:text-gray-200">{t.type_key}</span>
                <span className="text-gray-500 dark:text-gray-400 mr-2">• {t.points} نقطة</span>
                {t.expiry_days && <span className="text-gray-400 dark:text-gray-500">• {t.expiry_days} يوم</span>}
                {!t.is_active && <span className="badge-gray mr-2">معطّل</span>}
              </div>
              <div className="flex gap-1">
                <button className="btn-secondary text-xs" onClick={() => withMsg(async () => {
                  const points = parseInt(prompt('النقاط:') || '0');
                  const expiry = parseInt(prompt('صلاحية (يوم):') || '0');
                  if (!points) return;
                  await adminApi.updateViolationType(track, t.type_key, { points, expiry_days: expiry || null });
                  setMsg('✅ تم.'); loadSettings();
                })}>✏️ تعديل</button>
                <button className="btn-secondary text-xs" onClick={() => withMsg(async () => {
                  await (t.is_active ? adminApi.deleteViolationType(track, t.type_key) : adminApi.updateViolationType(track, t.type_key, { is_active: 1 }));
                  setMsg('✅ تم.'); loadSettings();
                })}>{t.is_active ? '🗑️ تعطيل' : '✅ تفعيل'}</button>
              </div>
            </div>
          ))}
          <button className="btn-secondary text-sm" onClick={() => withMsg(async () => {
            const typeKey = prompt('اسم النوع:'); if (!typeKey) return;
            const points = parseInt(prompt('النقاط:') || '1');
            const expiry = parseInt(prompt('صلاحية (يوم، 0=دائم):') || '30');
            await adminApi.addViolationType(track, { type_key: typeKey, points, expiry_days: expiry || null });
            setMsg('✅ تمت الإضافة.'); loadSettings();
          })}>➕ إضافة نوع</button>
        </div>

        <div className="card space-y-3">
          <h3 className="font-semibold dark:text-gray-100">جدول العتبات</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 text-right">
                  <th className="p-2 dark:text-gray-300">من</th><th className="p-2 dark:text-gray-300">إلى</th><th className="p-2 dark:text-gray-300">العقوبة</th>
                </tr>
              </thead>
              <tbody>
                {thresholds.map((t: any, i: number) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="p-2 font-mono dark:text-gray-300">{t.min_points}</td>
                    <td className="p-2 font-mono dark:text-gray-300">{t.max_points ?? '∞'}</td>
                    <td className="p-2 text-blue-700 dark:text-blue-400">{t.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn-secondary text-sm" onClick={() => withMsg(async () => {
            const raw = prompt('JSON للعتبات:\n[{"min_points":3,"max_points":4,"action":"warning"},...]');
            if (!raw) return;
            await adminApi.updateThresholds(track, JSON.parse(raw));
            setMsg('✅ تم.'); loadSettings();
          })}>⚙️ تعديل العتبات (JSON)</button>
        </div>

        {track === 'trust' && settings.grace && (
          <div className="card space-y-2">
            <h3 className="font-semibold dark:text-gray-100">🎚 سماحية أول مخالفة</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              الحالة: <span className={settings.grace.is_enabled ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
                {settings.grace.is_enabled ? 'مفعّلة' : 'معطّلة'}
              </span> | الحد الأدنى: {settings.grace.min_account_age_days} يوم
            </div>
            <button className="btn-secondary text-sm" onClick={() => withMsg(async () => {
              const enabled = confirm('تفعيل؟ (إلغاء = تعطيل)');
              const days = parseInt(prompt('الحد الأدنى (يوم):') || '90');
              await adminApi.updateGraceSettings({ is_enabled: enabled, min_account_age_days: days });
              setMsg('✅ تم.'); loadSettings();
            })}>🎚 تعديل</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold dark:text-gray-100">🛡 مركز التحكم بالمخالفات والأمان</h2>
      {msg && <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">{msg}</div>}

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setPanel(t.key)}
            className={`btn ${panel === t.key ? 'btn-primary' : 'btn-secondary'}`}>{t.label}</button>
        ))}
      </div>

      {panel === 'trust' && renderTrack('trust')}
      {panel === 'security' && renderTrack('security')}

      {panel === 'queue' && (
        <div className="space-y-6">
          <div className="card space-y-3">
            <h3 className="font-semibold dark:text-gray-100">✅ بلاغات بانتظار التأكيد</h3>
            {!queue?.pending_reports?.length && <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد.</p>}
            {queue?.pending_reports?.map((r: any) => (
              <div key={r.id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-sm">
                  <div className="font-medium dark:text-gray-200">مخالفة #{r.id} — مستخدم #{r.user_id}</div>
                  <div className="text-gray-500 dark:text-gray-400">{r.reason || '—'}</div>
                </div>
                <div className="flex gap-1">
                  <button className="btn-danger text-xs" onClick={() => withMsg(async () => { await adminApi.confirmReport(r.id); setMsg('✅'); loadQueue(); })}>✅ تأكيد</button>
                  <button className="btn-secondary text-xs" onClick={() => withMsg(async () => { await adminApi.dismissReport(r.id); setMsg('✅'); loadQueue(); })}>❌ رفض</button>
                </div>
              </div>
            ))}
          </div>

          <div className="card space-y-3">
            <h3 className="font-semibold dark:text-gray-100">🔒 حسابات مجمّدة</h3>
            {!queue?.frozen_accounts?.length && <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد.</p>}
            {queue?.frozen_accounts?.map((a: any) => (
              <div key={a.user_id} className="flex items-start justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-sm">
                  <div className="font-medium dark:text-gray-200">@{a.username || a.telegram_id} (#{a.user_id})</div>
                  <div className="text-gray-600 dark:text-gray-400">نقاط أمان: {a.security_points}</div>
                </div>
                <div className="flex gap-1">
                  <button className="btn-danger text-xs" onClick={() => {
                    const note = prompt('ملاحظة (إلزامي):'); if (!note) return;
                    withMsg(async () => { await adminApi.confirmPermanentBan(a.user_id, note); setMsg('✅ حظر دائم.'); loadQueue(); });
                  }}>🔒 حظر دائم</button>
                  <button className="btn-success text-xs" onClick={() => withMsg(async () => { await adminApi.releaseFrozenAccount(a.user_id); setMsg('✅ إفراج.'); loadQueue(); })}>🔓 إفراج</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {panel === 'proposals' && (
        <div className="card space-y-3">
          <h3 className="font-semibold dark:text-gray-100">📝 اقتراحات معلقة (Maker-Checker)</h3>
          {!proposals.length && <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد اقتراحات.</p>}
          {proposals.map(p => {
            let payload: any = {};
            try { payload = JSON.parse(p.payload); } catch {}
            return (
              <div key={p.id} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium dark:text-gray-200">اقتراح #{p.id}</span>
                  <span className="badge-yellow">بانتظار الموافقة</span>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-0.5">
                  <div>📌 النوع: <strong>{p.action_type}</strong></div>
                  <div>🎯 {p.target_type} #{p.target_id} | 👤 @{p.proposer_username || p.proposer_id}</div>
                  <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 rounded p-1 break-all">{JSON.stringify(payload)}</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-success text-sm" onClick={() => withMsg(async () => { await adminApi.approveProposal(p.id); setMsg('✅ تم التنفيذ.'); loadProposals(); })}>✅ موافقة</button>
                  <button className="btn-danger text-sm" onClick={() => {
                    const reason = prompt('سبب الرفض:'); if (!reason) return;
                    withMsg(async () => { await adminApi.rejectProposal(p.id, reason); setMsg('✅ تم الرفض.'); loadProposals(); });
                  }}>❌ رفض</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
