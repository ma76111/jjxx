import { useEffect, useState } from 'react';
import { walletApi } from '../api/wallet.api';
import axiosClient from '../api/axiosClient';
import { useI18n } from '../context/I18nContext';
import type { Deposit, Withdrawal } from '../types';

type Tab = 'overview' | 'deposit' | 'withdraw' | 'history';

const statusCls: Record<string, string> = {
  accept: 'badge-green', completed: 'badge-green',
  pending: 'badge-yellow', pending_verification: 'badge-yellow',
  reject: 'badge-red', rejected: 'badge-red',
};

export default function Wallet() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('overview');
  const [balance, setBalance] = useState(0);
  const [points, setPoints] = useState(0);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [depForm, setDepForm] = useState({ amount: '', method: 'txid', network: 'TRC20', txid: '', binance_id: '' });
  const [wdwForm, setWdwForm] = useState({ amount: '', wallet_address: '', network: 'TRC20' });

  useEffect(() => {
    Promise.all([axiosClient.get('/user/stats'), walletApi.getDeposits(), walletApi.getWithdrawals()])
      .then(([s, d, w]) => {
        setBalance(s.data.balance); setPoints(s.data.exchange_points);
        setDeposits(d.data.deposits); setWithdrawals(w.data.withdrawals);
      })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const submitDeposit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('');
    try {
      const r = await walletApi.deposit({ amount: parseFloat(depForm.amount), method: depForm.method, network: depForm.network, txid: depForm.txid || undefined, binance_id: depForm.binance_id || undefined });
      setMsg(`✅ ${t('depositRequest')} #${r.data.deposit_id} — ${r.data.status}`); setTab('history');
    } catch (e: any) { setMsg(`❌ ${e.response?.data?.error || 'error'}`); }
  };

  const submitWithdraw = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('');
    try {
      const r = await walletApi.withdraw({ amount: parseFloat(wdwForm.amount), wallet_address: wdwForm.wallet_address, network: wdwForm.network, method: 'wallet_address' });
      setMsg(`✅ ${t('withdrawRequest')} #${r.data.withdrawal_id}`); setTab('history');
    } catch (e: any) {
      const err = e.response?.data;
      const map: Record<string, string> = {
        below_min_withdrawal: `❌ ${t('belowMin')} ${err?.min_withdrawal} USDT`,
        insufficient_balance: t('insufficientBalance2'),
        daily_limit_exceeded: t('dailyLimitExceeded'),
        weekly_limit_exceeded: t('weeklyLimitExceeded'),
      };
      setMsg(map[err?.error] || `❌ ${err?.error || 'error'}`);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('tabBalance') },
    { key: 'deposit', label: t('tabDeposit') },
    { key: 'withdraw', label: t('tabWithdraw') },
    { key: 'history', label: t('tabHistory') },
  ];

  if (loading) return <div className="text-gray-400 dark:text-gray-500">{t('loading')}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('walletTitle')}</h1>
      {msg && <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-700 dark:text-blue-300 text-sm">{msg}</div>}

      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab_ => (
          <button key={tab_.key} onClick={() => setTab(tab_.key)}
            className={`btn text-sm flex-1 sm:flex-none min-w-[4rem] ${tab === tab_.key ? 'btn-primary' : 'btn-secondary'}`}>
            {tab_.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{balance.toFixed(4)}</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm mt-1">USDT</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{points}</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('exchangePoints')}</div>
          </div>
        </div>
      )}

      {tab === 'deposit' && (
        <form onSubmit={submitDeposit} className="card space-y-3 max-w-md">
          <h2 className="font-semibold dark:text-gray-100">{t('depositRequest')}</h2>
          <input required className="input" type="number" step="0.01" min="0.01" placeholder={t('amount')} value={depForm.amount} onChange={e => setDepForm(f => ({ ...f, amount: e.target.value }))} />
          <select className="input" value={depForm.method} onChange={e => setDepForm(f => ({ ...f, method: e.target.value }))}>
            <option value="txid">{t('txid')}</option>
            <option value="binance_pay">{t('binancePay')}</option>
          </select>
          {depForm.method === 'txid'
            ? <input required className="input" placeholder={t('txidInput')} value={depForm.txid} onChange={e => setDepForm(f => ({ ...f, txid: e.target.value }))} />
            : <input required className="input" placeholder={t('binanceInput')} value={depForm.binance_id} onChange={e => setDepForm(f => ({ ...f, binance_id: e.target.value }))} />
          }
          <select className="input" value={depForm.network} onChange={e => setDepForm(f => ({ ...f, network: e.target.value }))}>
            <option value="TRC20">TRC20</option><option value="BSC">BSC</option><option value="TON">TON</option>
          </select>
          <button type="submit" className="btn-primary w-full">{t('sendDepositReq')}</button>
        </form>
      )}

      {tab === 'withdraw' && (
        <form onSubmit={submitWithdraw} className="card space-y-3 max-w-md">
          <h2 className="font-semibold dark:text-gray-100">{t('withdrawRequest')}</h2>
          <input required className="input" type="number" step="0.01" min="0.1" placeholder={t('amount')} value={wdwForm.amount} onChange={e => setWdwForm(f => ({ ...f, amount: e.target.value }))} />
          <input required className="input" placeholder={t('walletAddress')} value={wdwForm.wallet_address} onChange={e => setWdwForm(f => ({ ...f, wallet_address: e.target.value }))} />
          <select className="input" value={wdwForm.network} onChange={e => setWdwForm(f => ({ ...f, network: e.target.value }))}>
            <option value="TRC20">TRC20</option><option value="BSC">BSC</option><option value="TON">TON</option>
          </select>
          <button type="submit" className="btn-primary w-full">{t('sendWithdrawReq')}</button>
        </form>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">{t('depositsHistory')}</h3>
            {!deposits.length && <p className="text-gray-400 dark:text-gray-500 text-sm">{t('noDeposits')}</p>}
            <div className="space-y-2">
              {deposits.map(d => (
                <div key={d.id} className="history-row">
                  <div className="flex flex-col gap-0.5 dark:text-gray-300 min-w-0">
                    <span className="font-medium">#{d.id} — {d.amount} USDT</span>
                    <span className="text-xs text-gray-400">{d.method} · {d.network}</span>
                  </div>
                  <span className={`${statusCls[d.status] ?? 'badge-gray'} self-start sm:self-center`}>{d.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">{t('withdrawalsHistory')}</h3>
            {!withdrawals.length && <p className="text-gray-400 dark:text-gray-500 text-sm">{t('noWithdrawals')}</p>}
            <div className="space-y-2">
              {withdrawals.map(w => (
                <div key={w.id} className="history-row">
                  <div className="flex flex-col gap-0.5 dark:text-gray-300 min-w-0">
                    <span className="font-medium">#{w.id} — {w.amount} USDT</span>
                    <span className="text-xs text-gray-400">{w.network}</span>
                  </div>
                  <span className={`${statusCls[w.status] ?? 'badge-gray'} self-start sm:self-center`}>{w.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
