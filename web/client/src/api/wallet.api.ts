import axiosClient from './axiosClient';

const uuidv4 = () => crypto.randomUUID();

export const walletApi = {
  getDeposits: () => axiosClient.get('/wallet/deposits'),
  getWithdrawals: () => axiosClient.get('/wallet/withdrawals'),
  deposit: (data: Record<string, unknown>) =>
    axiosClient.post('/wallet/deposit', data, {
      headers: { 'Idempotency-Key': uuidv4() },
    }),
  withdraw: (data: Record<string, unknown>) =>
    axiosClient.post('/wallet/withdraw', data, {
      headers: { 'Idempotency-Key': uuidv4() },
    }),
};
