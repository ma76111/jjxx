import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import StatCard from '../components/widgets/StatCard';
import BalanceChart from '../components/widgets/BalanceChart';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import type { Stats } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get('/user/stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 dark:text-gray-500">{t('loading')}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        {t('welcomeUser')} {user?.username ? `@${user.username}` : `#${user?.telegram_id}`}
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="💰" label={t('balance')}        value={stats?.balance?.toFixed(4) ?? '0'}          color="blue" />
        <StatCard icon="🔄" label={t('barterPoints')}   value={stats?.exchange_points ?? 0}                 color="purple" />
        <StatCard icon="📋" label={t('activeTasks')}    value={stats?.active_tasks ?? 0}                    color="green" />
        <StatCard icon="✅" label={t('acceptedProofs')} value={stats?.completed_submissions ?? 0}           color="green" />
        <StatCard icon="⏳" label={t('pendingProofs')}  value={stats?.pending_submissions ?? 0}             color="yellow" />
        <StatCard icon="📥" label={t('totalDeposited')} value={`${stats?.total_deposited?.toFixed(2) ?? '0'} USDT`} color="blue" />
        <StatCard icon="📤" label={t('totalWithdrawn')} value={`${stats?.total_withdrawn?.toFixed(2) ?? '0'} USDT`} color="red" />
        {stats?.rating_avg && (
          <StatCard icon="⭐" label={t('rating')} value={`${stats.rating_avg}/5`} color="yellow" />
        )}
      </div>

      <BalanceChart days={30} />
    </div>
  );
}
