import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin.api';

interface Group { fingerprint: string; shared_ip: string; occurrences: number; users: { id: number; telegram_id: number; username: string | null }[]; }

export default function AdminDuplicateAccounts() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { adminApi.getDuplicateAccounts().then(r => setGroups(r.data.groups)).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="text-gray-400 dark:text-gray-500">جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold dark:text-gray-100">👥 الحسابات المكررة</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">الحسابات المرتبطة بنفس بصمة الجهاز.</p>
      {!groups.length && <p className="text-gray-500 dark:text-gray-400">لم يُرصد أي تكرار.</p>}
      <div className="grid gap-4">
        {groups.map((g, i) => (
          <div key={i} className="card space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-gray-500 dark:text-gray-400 truncate">{g.fingerprint}</span>
              <span className="badge-red">{g.users.length} حسابات</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              🌐 IP: <span className="font-mono">{g.shared_ip || '—'}</span> | 🔢 {g.occurrences} تكرار
            </div>
            <div className="flex flex-wrap gap-2">
              {g.users.map(u => (
                <span key={u.id} className="badge-blue">#{u.id} @{u.username || u.telegram_id}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
