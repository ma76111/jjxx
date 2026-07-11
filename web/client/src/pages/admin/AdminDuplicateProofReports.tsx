import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin.api';

type ReportStatus = 'all' | 'under_evaluation' | 'pending_admin_decision' | 'dismissed' | 'confirmed_fraud_both' | 'confirmed_fraud_single';

const statusBadge: Record<string, string> = {
  under_evaluation:       'badge-yellow',
  pending_admin_decision: 'badge-red',
  dismissed:              'badge-gray',
  confirmed_fraud_both:   'badge-red',
  confirmed_fraud_single: 'badge-yellow',
};

const statusLabel: Record<string, string> = {
  under_evaluation:       '⏳ قيد التقييم',
  pending_admin_decision: '🔴 بانتظار قرار الأدمن',
  dismissed:              '✅ مرفوض / منتهي',
  confirmed_fraud_both:   '🚫 احتيال مؤكد (الاثنان)',
  confirmed_fraud_single: '⚠️ احتيال مؤكد (واحد)',
};

export default function AdminDuplicateProofReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus>('pending_admin_decision');
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'list' | 'settings'>('list');
  const [settings, setSettings] = useState<Record<string, { value: string; description: string }>>({});
  const [settingsEdit, setSettingsEdit] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getDuplicateProofReports(statusFilter === 'all' ? undefined : statusFilter)
      .then(r => { setReports(r.data.reports); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadSettings = () => {
    adminApi.getFraudDetectionSettings().then(r => {
      setSettings(r.data.settings);
      const edit: Record<string, string> = {};
      for (const [k, v] of Object.entries(r.data.settings as any)) {
        edit[k] = (v as any).value;
      }
      setSettingsEdit(edit);
    }).catch(() => {});
  };

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => { if (tab === 'settings') loadSettings(); }, [tab]);

  const openReport = async (id: number) => {
    try {
      const r = await adminApi.getDuplicateProofReport(id);
      setSelected(r.data);
    } catch { setMsg('❌ فشل تحميل التقرير.'); }
  };

  const dismiss = async (id: number) => {
    if (!confirm('هل تريد إلغاء البلاغ وفك التجميد؟')) return;
    try {
      await adminApi.dismissDuplicateProofReport(id);
      setMsg('✅ تم إلغاء البلاغ وفك التجميد.');
      setSelected(null); load();
    } catch { setMsg('❌ خطأ.'); }
  };

  const penalize = async (id: number) => {
    const target = prompt('الهدف: user_a / user_b / both')?.trim();
    if (!target || !['user_a', 'user_b', 'both'].includes(target)) return;
    const action = prompt('الإجراء: warning / temp_ban / permanent_ban / forfeit_reward')?.trim();
    if (!action || !['warning', 'temp_ban', 'permanent_ban', 'forfeit_reward'].includes(action)) return;
    let duration_days: number | undefined;
    if (action === 'temp_ban') {
      const d = prompt('عدد أيام الحظر المؤقت:');
      duration_days = d ? parseInt(d) : 7;
    }
    const note = prompt('ملاحظة (اختياري):') || undefined;
    try {
      await adminApi.penalizeDuplicateProofReport(id, { target, action, duration_days, note });
      setMsg('✅ تم تنفيذ العقوبة.');
      setSelected(null); load();
    } catch { setMsg('❌ خطأ في تنفيذ العقوبة.'); }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const updates: Record<string, number> = {};
      for (const [k, v] of Object.entries(settingsEdit)) updates[k] = parseFloat(v);
      await adminApi.updateFraudDetectionSettings(updates);
      setMsg('✅ تم حفظ الإعدادات.');
      loadSettings();
    } catch { setMsg('❌ خطأ في الحفظ.'); }
    setSavingSettings(false);
  };

  const scoreColor = (score: number) =>
    score >= 80 ? 'text-red-600 dark:text-red-400' :
    score >= 60 ? 'text-orange-500 dark:text-orange-400' :
    'text-yellow-600 dark:text-yellow-400';

  if (selected) {
    const eb = selected.evidence_breakdown || {};
    return (
      <div className="space-y-4 max-w-2xl">
        <button className="btn-secondary" onClick={() => setSelected(null)}>← رجوع</button>
        {msg && <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">{msg}</div>}

        <div className="card space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold text-lg dark:text-gray-100">تقرير #{ selected.id}</h2>
            <div className="flex items-center gap-2">
              <span className={statusBadge[selected.status] ?? 'badge-gray'}>{statusLabel[selected.status] ?? selected.status}</span>
              {selected.auto_frozen === 1 && <span className="badge-yellow">🧊 مجمّد</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
              <div className="font-medium dark:text-gray-200 mb-1">المستخدم أ</div>
              <div className="dark:text-gray-400">@{selected.user_a?.username || selected.user_a_id}</div>
              <div className="text-xs text-gray-400">ID: {selected.user_a?.telegram_id}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
              <div className="font-medium dark:text-gray-200 mb-1">المستخدم ب</div>
              <div className="dark:text-gray-400">@{selected.user_b?.username || selected.user_b_id}</div>
              <div className="text-xs text-gray-400">ID: {selected.user_b?.telegram_id}</div>
            </div>
          </div>

          {/* Confidence Score */}
          <div className="text-center py-2">
            <div className={`text-4xl font-bold ${scoreColor(selected.confidence_score)}`}>
              {selected.confidence_score}
            </div>
            <div className="text-xs text-gray-400 mt-1">درجة الثقة / 100</div>
          </div>

          {/* Evidence Breakdown */}
          <div className="space-y-2">
            <div className="font-medium text-sm dark:text-gray-200">الأدلة:</div>
            {eb.ip_match && (
              <EvidenceRow
                label="تطابق IP"
                matched={eb.ip_match.matched}
                weight={eb.ip_match.weight}
                detail={`مصدر أ: ${eb.ip_match.ip_source_a} | مصدر ب: ${eb.ip_match.ip_source_b}`}
              />
            )}
            {eb.fingerprint_match && (
              <EvidenceRow label="تطابق بصمة الجهاز" matched={eb.fingerprint_match.matched} weight={eb.fingerprint_match.weight} />
            )}
            {eb.time_gap && (
              <EvidenceRow
                label="فارق زمني قصير"
                matched={eb.time_gap.under_threshold}
                weight={eb.time_gap.weight}
                detail={`${Math.round(eb.time_gap.seconds)} ثانية`}
              />
            )}
            {eb.proof_similarity && (
              <EvidenceRow
                label="تشابه الإثبات"
                matched={eb.proof_similarity.high_similarity}
                weight={eb.proof_similarity.weight}
                detail={`${(eb.proof_similarity.score * 100).toFixed(0)}% تشابه`}
              />
            )}
            {eb.report_button_pressed && (
              <EvidenceRow label="زر البلاغ ضُغط" matched={eb.report_button_pressed.pressed} weight={eb.report_button_pressed.weight} />
            )}
          </div>

          {/* Proofs */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {selected.submission_a?.proof_text && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                <div className="font-medium dark:text-gray-300 mb-1">إثبات أ (نص)</div>
                <div className="dark:text-gray-400 break-words">{selected.submission_a.proof_text}</div>
              </div>
            )}
            {selected.submission_b?.proof_text && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                <div className="font-medium dark:text-gray-300 mb-1">إثبات ب (نص)</div>
                <div className="dark:text-gray-400 break-words">{selected.submission_b.proof_text}</div>
              </div>
            )}
          </div>

          {selected.status === 'pending_admin_decision' && (
            <div className="flex gap-2 pt-2">
              <button className="btn-secondary flex-1" onClick={() => dismiss(selected.id)}>❌ إلغاء البلاغ</button>
              <button className="btn-danger flex-1" onClick={() => penalize(selected.id)}>⚖️ تنفيذ عقوبة</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold dark:text-gray-100">🚩 تقارير الإثباتات المكررة</h2>
        <div className="flex gap-2">
          <button className={`btn ${tab === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('list')}>القائمة</button>
          <button className={`btn ${tab === 'settings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('settings')}>⚙️ إعدادات الخوارزمية</button>
        </div>
      </div>

      {msg && <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">{msg}</div>}

      {tab === 'list' && (
        <>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending_admin_decision', 'under_evaluation', 'dismissed', 'confirmed_fraud_both'] as ReportStatus[]).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`btn text-xs ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}>
                {s === 'all' ? 'الكل' : statusLabel[s] ?? s}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-gray-400 dark:text-gray-500">جاري التحميل...</p>
          ) : (
            <div className="space-y-3">
              {!reports.length && <p className="text-gray-500 dark:text-gray-400">لا توجد تقارير.</p>}
              {reports.map(r => (
                <button key={r.id} onClick={() => openReport(r.id)}
                  className="card w-full text-right hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-semibold dark:text-gray-100">تقرير #{r.id} — مهمة #{r.task_id}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${scoreColor(r.confidence_score)}`}>{r.confidence_score}/100</span>
                      <span className={statusBadge[r.status] ?? 'badge-gray'}>{statusLabel[r.status] ?? r.status}</span>
                      {r.auto_frozen === 1 && <span className="badge-yellow text-xs">🧊</span>}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    @{r.user_a_username || r.user_a_id} ↔ @{r.user_b_username || r.user_b_id}
                    <span className="mr-2">{new Date(r.created_at).toLocaleDateString('ar')}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'settings' && (
        <div className="card space-y-4 max-w-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            جميع الأوزان والعتبات قابلة للتعديل بدون تعديل الكود.
          </p>
          {Object.entries(settingsEdit).map(([key, val]) => (
            <div key={key} className="space-y-1">
              <label className="text-sm font-medium dark:text-gray-300">
                {key}
                {settings[key]?.description && (
                  <span className="text-xs text-gray-400 mr-2">— {settings[key].description}</span>
                )}
              </label>
              <input
                type="number"
                className="input"
                value={val}
                onChange={e => setSettingsEdit(prev => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
          <button className="btn-primary w-full" disabled={savingSettings} onClick={saveSettings}>
            {savingSettings ? '...' : '💾 حفظ الإعدادات'}
          </button>
        </div>
      )}
    </div>
  );
}

function EvidenceRow({ label, matched, weight, detail }: { label: string; matched: boolean; weight: number; detail?: string }) {
  return (
    <div className={`flex items-center justify-between p-2 rounded text-sm ${
      matched ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/30'
    }`}>
      <div>
        <span className={matched ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}>
          {matched ? '🔴' : '⚪'} {label}
        </span>
        {detail && <span className="text-xs text-gray-400 mr-2">({detail})</span>}
      </div>
      <span className={`text-xs font-semibold ${matched ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
        +{weight}
      </span>
    </div>
  );
}
