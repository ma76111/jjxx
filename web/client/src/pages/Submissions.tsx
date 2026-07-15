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
            <div key={s.id} className="card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold dark:text-gray-100 text-sm leading-snug">
                  {t('proof')} #{s.id} — {t('task')} #{s.task_id}
                </span>
                <span className={`${st.cls} flex-shrink-0`}>{st.label}</span>
              </div>
              <div className="flex gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                {s.bot_name && (
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                    🤖 {s.bot_name}
                  </span>
                )}
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                  {s.task_type === 'paid' ? `💰 ${s.reward_per_user} USDT` : `🔄 ${t('exchange')}`}
                </span>
              </div>
              {s.proof_text && (
                <p className="text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 dark:text-gray-300 leading-relaxed break-words">
                  {s.proof_text}
                </p>
              )}
              {s.status === 'reject' && s.reject_message && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-2 space-y-1">
                  <p>{t('rejectionReason')} {s.reject_message}</p>
                  {s.can_retry === 1 && s.improvement_deadline && (
                    <p className="text-orange-600 dark:text-orange-400 text-xs">
                      ⏰ {t('deadlineUntil')} {new Date(s.improvement_deadline).toLocaleTimeString(lang)}
                    </p>
                  )}
                </div>
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
