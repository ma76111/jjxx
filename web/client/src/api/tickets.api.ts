import axiosClient from './axiosClient';

export const ticketsApi = {
  create: (data: { subject: string; body: string; priority?: string }) =>
    axiosClient.post('/tickets', data),
  getAll: () => axiosClient.get('/tickets'),
  get: (id: number) => axiosClient.get(`/tickets/${id}`),
  reply: (id: number, body: string) => axiosClient.post(`/tickets/${id}/reply`, { body }),
  // Admin
  adminGetAll: (page = 1, status?: string) =>
    axiosClient.get('/tickets/admin/all', { params: { page, status } }),
  adminReply: (id: number, body: string) =>
    axiosClient.post(`/tickets/admin/${id}/reply`, { body }),
  adminUpdateStatus: (id: number, status: string) =>
    axiosClient.put(`/tickets/admin/${id}/status`, { status }),
  adminAssign: (id: number, admin_id: number) =>
    axiosClient.put(`/tickets/admin/${id}/assign`, { admin_id }),
};
