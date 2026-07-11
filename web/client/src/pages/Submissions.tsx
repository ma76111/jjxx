import { useEffect, useState } from 'react';
import { tasksApi } from '../api/tasks.api';
import { useI18n } from '../context/I18nContext';
import type { Submission } from '../types';

export default function Submissions() {
  const { t, lang } = useI18n();
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksApi.getSubmissions().then(r => setSubs(r.data.submissions)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const statusLabel: Record<string, { label: string; cls: string }> = {
    pending: { label: t('statusPending'), cls: 'badge-yellow' },
    accept:  { label: t('statusAccepted'), cls: 'badge-green' },
    reject:  { label: t('statusRejected'), cls: 'badge-red' },
  };

  if (loading) return <div className="text-gray-400 dark:text-gray-500">{t('loading')}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('submissionsTitle')}</h1>
      {!subs.length && <p className="text-gray-500 dark:text-gray-400">{t('noSubmissionsYet')}</p>}
      <div className="grid gap-3">
        {subs.map(s => {
          const st = statusLabel[s.status] ?? statusLabel.pending;
          return (
            <div key={s.id} className="card space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold dark:text-gray-100">{t('proof')} #{s.id} — {t('task')} #{s.task_id}</span>
                <span className={st.cls}>{st.label}</span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {s.bot_name && <span>🤖 {s.bot_name} | </span>}
                {s.task_type === 'paid' ? <span>💰 {s.reward_per_user} USDT</span> : <span>🔄 {t('exchange')}</span>}
              </div>
              {s.proof_text && (
                <p className="text-sm bg-gray-50 dark:bg-gray-700/50 rounded p-2 dark:text-gray-300">
                  {s.proof_text}
                </p>
              )}
              {s.status === 'reject' && s.reject_message && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2">
                  {t('rejectionReason')} {s.reject_message}
                  {s.can_retry === 1 && s.improvement_deadline && (
                    <span className="mr-2 text-orange-600 dark:text-orange-400">
                      — {t('deadlineUntil')} {new Date(s.improvement_deadline).toLocaleTimeString(lang)}
                    </span>
                  )}
                </p>
              )}
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(s.created_at).toLocaleDateString(lang)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
