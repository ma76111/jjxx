import { useEffect, useState } from 'react';
import { tasksApi } from '../api/tasks.api';
import { useI18n } from '../context/I18nContext';
import type { Task } from '../types';

export default function Tasks() {
  const { t, lang } = useI18n();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  const fetchTasks = (p: number) => {
    setLoading(true);
    tasksApi.getAll(p)
      .then(r => { setTasks(r.data.tasks); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(page); }, [page]);

  const handleSubmit = async (taskId: number) => {
    const proof = prompt(t('enterProof'));
    if (!proof) return;
    setSubmitting(taskId);
    try {
      await tasksApi.submit(taskId, { proof_text: proof });
      setMsg(t('proofSent'));
      fetchTasks(page);
    } catch (e: any) {
      setMsg(`❌ ${e.response?.data?.error || 'خطأ'}`);
    } finally { setSubmitting(null); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('availableTasks')}</h1>

      {msg && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-700 dark:text-blue-300 text-sm">
          {msg}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 dark:text-gray-500">{t('loading')}</p>
      ) : (
        <>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{total} {t('tasksAvailable')}</p>
          <div className="grid gap-4">
            {tasks.map(task => (
              <div key={task.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-snug">
                    #{task.id} {task.bot_name || (lang === 'ar' ? 'مهمة خارجية' : 'External Task')}
                  </span>
                  <span className="badge-green flex-shrink-0">
                    {task.required_count - task.completed_count} {t('remaining')}
                  </span>
                </div>
                <div className="flex gap-2 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                    {task.task_type === 'paid' ? `💰 ${task.reward_per_user} USDT` : `🔄 ${t('exchange')}`}
                  </span>
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                    👥 {task.completed_count}/{task.required_count}
                  </span>
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                    📋 {task.proof_type}
                  </span>
                </div>
                {task.verification_instructions && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 leading-relaxed">
                    {task.verification_instructions}
                  </p>
                )}
                {task.referral_link && (
                  <a href={task.referral_link} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 text-xs underline block">
                    🔗 {t('taskLink')}
                  </a>
                )}
                <button
                  className="btn-primary text-sm w-full sm:w-auto"
                  disabled={submitting === task.id}
                  onClick={() => handleSubmit(task.id)}
                >
                  {submitting === task.id ? '...' : t('submitProof')}
                </button>
              </div>
            ))}
          </div>

          {total > 10 && (
            <div className="flex gap-2 justify-center pt-2">
              <button className="btn-secondary flex-1 sm:flex-none" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{t('prevPage')}</button>
              <span className="py-2 px-3 text-sm dark:text-gray-300 self-center">{t('page')} {page}</span>
              <button className="btn-secondary flex-1 sm:flex-none" disabled={tasks.length < 10} onClick={() => setPage(p => p + 1)}>{t('nextPage')}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
