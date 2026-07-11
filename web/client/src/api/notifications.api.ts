import axiosClient from './axiosClient';

export const notificationsApi = {
  getAll: (page = 1) => axiosClient.get('/notifications', { params: { page } }),
  getUnreadCount: () => axiosClient.get('/notifications/unread-count'),
  markAllRead: () => axiosClient.post('/notifications/read-all'),
  markRead: (id: number) => axiosClient.post(`/notifications/${id}/read`),
  getPrefs: () => axiosClient.get('/notifications/prefs'),
  updatePrefs: (data: Record<string, boolean>) => axiosClient.put('/notifications/prefs', data),
};
