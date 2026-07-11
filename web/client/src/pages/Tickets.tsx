import { useEffect, useState } from 'react';
import { ticketsApi } from '../api/tickets.api';
import { useI18n } from '../context/I18nContext';
import type { Ticket, TicketWithMessages } from '../types';

const statusCls: Record<string, string> = {
  open: 'badge-green', in_progress: 'badge-yellow', closed: 'badge-gray',
};
const priorityCls: Record<string, string> = {
  low: 'badge-gray', medium: 'badge-blue', high: 'badge-yellow', urgent: 'badge-red',
};

export default function Tickets() {
  const { t, lang } = useI18n();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<TicketWithMessages | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [form, setForm] = useState({ subject: '', body: '', priority: 'medium' });
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    ticketsApi.getAll().then(r => setTickets(r.data.tickets)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openTicket = async (id: number) => {
    const r = await ticketsApi.get(id);
    setSelected(r.data);
  };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await ticketsApi.create(form);
      setMsg(`✅ ${t('ticketCreated')} ${r.data.ticket_no}`);
      setCreating(false); load();
    } catch { setMsg(t('ticketError')); }
  };

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;
    await ticketsApi.reply(selected.id, replyText);
    setReplyText('');
    openTicket(selected.id);
  };

  if (selected) {
    return (
      <div className="space-y-4">
        <button className="btn-secondary" onClick={() => setSelected(null)}>← {t('back')}</button>
        <div className="card space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-semibold text-lg dark:text-gray-100">{selected.ticket_no}</h2>
            <span className={statusCls[selected.status]}>{selected.status}</span>
            <span className={priorityCls[selected.priority]}>{selected.priority}</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{selected.subject}</p>
        </div>
        <div className="space-y-2">
          {selected.messages.map(m => (
            <div key={m.id} className={`p-3 rounded-lg text-sm max-w-lg ${
              m.is_admin
                ? 'bg-blue-50 dark:bg-blue-900/30 mr-auto'
                : 'bg-gray-50 dark:bg-gray-700/50 ml-auto'
            }`}>
              <div className="font-medium mb-1 dark:text-gray-200">{m.is_admin ? t('adminLabel') : t('youLabel')}</div>
              <div className="dark:text-gray-300">{m.body}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {new Date(m.created_at).toLocaleString(lang)}
              </div>
            </div>
          ))}
        </div>
        {selected.status !== 'closed' && (
          <div className="flex gap-2">
            <input className="input flex-1" placeholder={t('replyPlaceholder')} value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendReply()} />
            <button className="btn-primary" onClick={sendReply}>{t('send')}</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('ticketsTitle')}</h1>
        <button className="btn-primary" onClick={() => setCreating(c => !c)}>
          {creating ? `✕ ${t('cancel')}` : t('newTicket')}
        </button>
      </div>
      {msg && <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-700 dark:text-blue-300 text-sm">{msg}</div>}

      {creating && (
        <form onSubmit={submitNew} className="card space-y-3 max-w-md">
          <input required className="input" placeholder={t('subject')} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          <textarea required className="input" rows={3} placeholder={t('message')} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            <option value="low">{t('priorityLow')}</option>
            <option value="medium">{t('priorityMedium')}</option>
            <option value="high">{t('priorityHigh')}</option>
            <option value="urgent">{t('priorityUrgent')}</option>
          </select>
          <button type="submit" className="btn-primary w-full">✅ {t('create')}</button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-400 dark:text-gray-500">{t('loading')}</p>
      ) : (
        <div className="grid gap-3">
          {!tickets.length && <p className="text-gray-500 dark:text-gray-400">{t('noTickets')}</p>}
          {tickets.map(ticket => (
            <button key={ticket.id} onClick={() => openTicket(ticket.id)}
              className="card text-right w-full hover:shadow-md transition-shadow dark:hover:bg-gray-750">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-xs text-gray-400 dark:text-gray-500">{ticket.ticket_no}</span>
                <span className={statusCls[ticket.status]}>{ticket.status}</span>
                <span className={priorityCls[ticket.priority]}>{ticket.priority}</span>
              </div>
              <div className="font-medium dark:text-gray-100">{ticket.subject}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {new Date(ticket.updated_at).toLocaleDateString(lang)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
