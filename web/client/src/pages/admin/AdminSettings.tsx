import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin.api';

const FINANCIAL_KEYS = ['min_withdrawal', 'exchange_points_cost', 'min_reward', 'min_external_reward'];

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [changed, setChanged] = useState<Record<string, string>>({});

  useEffect(() => {
    adminApi.getSettings().then(r => setSettings(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, val: string) => {
    setSettings(s => ({ ...s, [key]: val }));
    setChanged(c => ({ ...c, [key]: val }));
  };

  const save = async () => {
    if (!Object.keys(changed).length) return;
    try { await adminApi.updateSettings(changed); setMsg('✅ تم حفظ الإعدادات.'); setChanged({}); }
    catch { setMsg('❌ خطأ في الحفظ.'); }
  };

  if (loading) return <div className="text-gray-400 dark:text-gray-500">جاري التحميل...</div>;

  const entries = Object.entries(settings).filter(([k]) => !k.startsWith('widgets_config_'));

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold dark:text-gray-100">⚙️ إعدادات النظام</h2>
        {Object.keys(changed).length > 0 && (
          <button className="btn-primary" onClick={save}>💾 حفظ ({Object.keys(changed).length})</button>
        )}
      </div>
      {msg && <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">{msg}</div>}

      <div className="card space-y-3">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-64 shrink-0">
              {key}
              {FINANCIAL_KEYS.includes(key) && <span className="mr-1 badge-yellow text-xs">مالي</span>}
            </label>
            <input className="input flex-1" value={val} onChange={e => handleChange(key, e.target.value)} />
            {changed[key] !== undefined && <span className="text-orange-500 text-xs">●</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
