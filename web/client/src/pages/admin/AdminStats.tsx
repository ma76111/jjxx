import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin.api';
import StatCard from '../../components/widgets/StatCard';
import type { AdminStats } from '../../types';

export default function AdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  useEffect(() => { adminApi.getStats().then(r => setStats(r.data)).catch(() => {}); }, []);
  if (!stats) return <div className="text-gray-400 dark:text-gray-500">جاري التحميل...</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard icon="👥" label="المستخدمون"        value={stats.total_users}          color="blue" />
      <StatCard icon="📋" label="المهام النشطة"      value={stats.active_tasks}         color="green" />
      <StatCard icon="📥" label="إيداعات معلقة"     value={stats.pending_deposits}     color="yellow" />
      <StatCard icon="📤" label="سحوبات معلقة"      value={stats.pending_withdrawals}  color="yellow" />
      <StatCard icon="📋" label="إثباتات معلقة"     value={stats.pending_submissions}  color="yellow" />
      <StatCard icon="🎫" label="تذاكر مفتوحة"      value={stats.open_tickets}         color="purple" />
      <StatCard icon="⚖️" label="استئنافات"         value={stats.pending_appeals}      color="red" />
      <StatCard icon="💰" label="رصيد إجمالي"       value={`${stats.total_balance_held?.toFixed(2)} $`} color="blue" />
      <StatCard icon="📥" label="مجموع الإيداعات"  value={`${stats.total_deposited?.toFixed(2)} $`}   color="green" />
      <StatCard icon="📤" label="مجموع السحوبات"   value={`${stats.total_withdrawn?.toFixed(2)} $`}   color="red" />
    </div>
  );
}
