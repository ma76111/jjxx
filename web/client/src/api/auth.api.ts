import axiosClient from './axiosClient';

export const authApi = {
  start: () => axiosClient.post('/auth/start'),
  status: (token: string) => axiosClient.get(`/auth/status/${token}`),
  confirm: (loginToken: string) => axiosClient.post('/auth/confirm', { login_token: loginToken }),
};
