import axiosClient from './axiosClient';

const uuidv4 = () => crypto.randomUUID();

export const tasksApi = {
  getAll: (page = 1, country?: string) =>
    axiosClient.get('/tasks', { params: { page, country } }),
  getMine: () => axiosClient.get('/tasks/mine'),
  getSubmissions: () => axiosClient.get('/tasks/submissions'),
  create: (data: Record<string, unknown>) =>
    axiosClient.post('/tasks/create', data, {
      headers: { 'Idempotency-Key': uuidv4() },
    }),
  update: (id: number, data: Record<string, unknown>) =>
    axiosClient.patch(`/tasks/${id}`, data),
  pause: (id: number) => axiosClient.post(`/tasks/${id}/pause`),
  resume: (id: number) => axiosClient.post(`/tasks/${id}/resume`),
  hide: (id: number) => axiosClient.post(`/tasks/${id}/hide`),
  submit: (id: number, data: Record<string, unknown>) =>
    axiosClient.post(`/tasks/${id}/submit`, data),
  getAudit: (id: number) => axiosClient.get(`/tasks/${id}/audit`),
  getSettings: () => axiosClient.get('/tasks/settings/public'),
  reportDuplicate: (submissionId: number, suspectedDuplicateId: number, note?: string) =>
    axiosClient.post(`/tasks/submissions/${submissionId}/report-duplicate`, {
      suspected_duplicate_submission_id: suspectedDuplicateId,
      note,
    }),
};
