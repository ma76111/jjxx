import { useEffect, useState } from 'react';
import { tasksApi } from '../api/tasks.api';
import { useI18n } from '../context/I18nContext';
import type { Task } from '../types';

export default function MyTasks() {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    task_type: 'paid', bot_name: '', referral_link: '',
    required_count: 5, reward_per_user: 0.05,
    proof_type: 'images', verification_instructions: '',
  });
  const [msg, setMsg] = useState('');

  const statusLabel: Record<string, string> = {
    active: t('statusActive'), paused: t('statusPaused'), completed: t('statusCompleted'),
    expired: t('statusExpired'), cancelled: t('statusCancelled'),
  };

  const load = () => {
    setLoading(true);
    tasksApi.getMine().then(r => setTasks(r.data.tasks)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggle = async (task: Task) => {
    if (task.status === 'active') await tasksApi.pause(task.id);
    else if (task.status === 'paused') await tasksApi.resume(task.id);
    load();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('');
    try {
      const r = await tasksApi.create(form);
      setMsg(`✅ ${t('taskCreated')} #${r.data.task_id} | ${t('charged')} ${r.data.charged}`);
      setCreating(false); load();
    } catch (e: any) {
      const err = e.response?.data;
      if (err?.error === 'insufficient_balance') setMsg(`❌ ${t('insufficientBalance')} ${err.required} USDT`);
      else setMsg(`❌ ${err?.error || 'خطأ'}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('myTasksTitle')}</h1>
        <button className="btn-primary" onClick={() => setCreating(c => !c)}>
          {creating ? `✕ ${t('cancel')}` : t('newTask')}
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-700 dark:text-blue-300 text-sm">
          {msg}
        </div>
      )}

      {creating && (
        <form onSubmit={submit} className="card space-y-3">
          <h2 className="font-semibold dark:text-gray-100">{t('createTask')}</h2>
          <select className="input" value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))}>
            <option value="paid">{t('paid')}</option>
            <option value="exchange">{t('exchange')}</option>
          </select>
          <input className="input" placeholder={t('botName')} value={form.bot_name}
            onChange={e => setForm(f => ({ ...f, bot_name: e.target.value }))} />
          <input className="input" placeholder={t('referralLink')} value={form.referral_link}
            onChange={e => setForm(f => ({ ...f, referral_link: e.target.value }))} />
          <input className="input" type="number" min={1} max={10} placeholder={t('requiredCount')}
            value={form.required_count} onChange={e => setForm(f => ({ ...f, required_count: +e.target.value }))} />
          {form.task_type === 'paid' && (
            <input className="input" type="number" step="0.01" placeholder={t('rewardPerUser')}
              value={form.reward_per_user} onChange={e => setForm(f => ({ ...f, reward_per_user: +e.target.value }))} />
          )}
          <select className="input" value={form.proof_type} onChange={e => setForm(f => ({ ...f, proof_type: e.target.value }))}>
            <option value="text">{t('proofText')}</option>
            <option value="images">{t('proofImages')}</option>
            <option value="both">{t('proofBoth')}</option>
          </select>
          <textarea className="input" rows={2} placeholder={t('verificationInstructions')}
            value={form.verification_instructions}
            onChange={e => setForm(f => ({ ...f, verification_instructions: e.target.value }))} />
          <button type="submit" className="btn-primary w-full">✅ {t('create')}</button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-400 dark:text-gray-500">{t('loading')}</p>
      ) : (
        <div className="grid gap-3">
          {!tasks.length && <p className="text-gray-500 dark:text-gray-400">{t('noTasksYet')}</p>}
          {tasks.map(task => (
            <div key={task.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold dark:text-gray-100">#{task.id} {task.bot_name || t('myTasks')}</span>
                <span className="text-sm dark:text-gray-300">{statusLabel[task.status]}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                👥 {task.completed_count}/{task.required_count} |
                {task.task_type === 'paid' ? ` 💰 ${task.reward_per_user} USDT` : ` 🔄 ${t('exchange')}`}
              </div>
              {(task.status === 'active' || task.status === 'paused') && (
                <button className="btn-secondary text-sm" onClick={() => toggle(task)}>
                  {task.status === 'active' ? t('pause') : t('resume')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
