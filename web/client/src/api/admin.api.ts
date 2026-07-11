import axiosClient from './axiosClient';

export const adminApi = {
  getStats: () => axiosClient.get('/admin/stats'),
  searchUsers: (q: string) => axiosClient.get('/admin/users/search', { params: { q } }),
  adjustBalance: (id: number, data: object) => axiosClient.post(`/admin/users/${id}/balance`, data),
  adjustPoints: (id: number, data: object) => axiosClient.post(`/admin/users/${id}/points`, data),
  banUser: (id: number, data: object) => axiosClient.post(`/admin/users/${id}/ban`, data),
  unbanUser: (id: number) => axiosClient.post(`/admin/users/${id}/unban`),
  getUserViolations: (id: number) => axiosClient.get(`/admin/users/${id}/violations`),

  getDeposits: (page = 1) => axiosClient.get('/admin/deposits', { params: { page } }),
  acceptDeposit: (id: number) => axiosClient.post(`/admin/deposits/${id}/accept`),
  rejectDeposit: (id: number, reason: string) => axiosClient.post(`/admin/deposits/${id}/reject`, { reason }),

  getWithdrawals: (page = 1) => axiosClient.get('/admin/withdrawals', { params: { page } }),
  completeWithdrawal: (id: number) => axiosClient.post(`/admin/withdrawals/${id}/complete`),
  rejectWithdrawal: (id: number, reason: string) => axiosClient.post(`/admin/withdrawals/${id}/reject`, { reason }),

  getSubmissions: (page = 1) => axiosClient.get('/admin/submissions', { params: { page } }),
  acceptSubmission: (id: number) => axiosClient.post(`/admin/submissions/${id}/accept`),
  rejectSubmission: (id: number, data: object) => axiosClient.post(`/admin/submissions/${id}/reject`, data),

  getAppeals: (page = 1) => axiosClient.get('/admin/appeals', { params: { page } }),
  approveAppeal: (id: number, note?: string) => axiosClient.post(`/admin/appeals/${id}/approve`, { note }),
  rejectAppeal: (id: number, note: string) => axiosClient.post(`/admin/appeals/${id}/reject`, { note }),

  getBans: (page = 1) => axiosClient.get('/admin/bans', { params: { page } }),

  getSettings: () => axiosClient.get('/admin/settings'),
  updateSettings: (data: object) => axiosClient.post('/admin/settings', data),

  getDeviceLogs: (page = 1) => axiosClient.get('/admin/device-logs', { params: { page } }),
  getDuplicateAccounts: () => axiosClient.get('/admin/duplicate-accounts'),
  getReports: (page = 1) => axiosClient.get('/admin/reports', { params: { page } }),

  // Violation settings
  getViolationSettings: () => axiosClient.get('/admin/violation-settings'),
  updateViolationType: (track: string, type: string, data: object) =>
    axiosClient.put(`/admin/violation-settings/${track}/types/${type}`, data),
  addViolationType: (track: string, data: object) =>
    axiosClient.post(`/admin/violation-settings/${track}/types`, data),
  deleteViolationType: (track: string, type: string) =>
    axiosClient.delete(`/admin/violation-settings/${track}/types/${type}`),
  updateThresholds: (track: string, thresholds: object[]) =>
    axiosClient.put(`/admin/violation-settings/${track}/thresholds`, { thresholds }),
  updateGraceSettings: (data: object) =>
    axiosClient.put('/admin/violation-settings/first-offense-grace', data),

  // Security queue
  getSecurityQueue: () => axiosClient.get('/admin/security/review-queue'),
  confirmReport: (id: number) => axiosClient.post(`/admin/security/reports/${id}/confirm`),
  dismissReport: (id: number) => axiosClient.post(`/admin/security/reports/${id}/dismiss`),
  confirmPermanentBan: (id: number, note: string) =>
    axiosClient.post(`/admin/security/frozen-accounts/${id}/confirm-permanent-ban`, { note }),
  releaseFrozenAccount: (id: number) =>
    axiosClient.post(`/admin/security/frozen-accounts/${id}/release`),
  expireViolation: (userId: number, violationId: number) =>
    axiosClient.post(`/admin/users/${userId}/violations/${violationId}/expire-now`),
  restoreViolation: (userId: number, violationId: number) =>
    axiosClient.post(`/admin/users/${userId}/violations/${violationId}/restore`),

  // Proposals
  createProposal: (data: object) => axiosClient.post('/admin/proposals', data),
  getProposals: (status = 'pending_approval') =>
    axiosClient.get('/admin/proposals', { params: { status } }),
  approveProposal: (id: number) => axiosClient.post(`/admin/proposals/${id}/approve`),
  rejectProposal: (id: number, reason: string) =>
    axiosClient.post(`/admin/proposals/${id}/reject`, { reason }),

  // Duplicate proof reports (fraud detection)
  getDuplicateProofReports: (status?: string, page = 1) =>
    axiosClient.get('/admin/duplicate-proof-reports', { params: { status, page } }),
  getDuplicateProofReport: (id: number) =>
    axiosClient.get(`/admin/duplicate-proof-reports/${id}`),
  dismissDuplicateProofReport: (id: number) =>
    axiosClient.post(`/admin/duplicate-proof-reports/${id}/dismiss`),
  penalizeDuplicateProofReport: (id: number, data: { target: string; action: string; duration_days?: number; note?: string }) =>
    axiosClient.post(`/admin/duplicate-proof-reports/${id}/penalize`, data),

  // Fraud detection settings
  getFraudDetectionSettings: () => axiosClient.get('/admin/fraud-detection-settings'),
  updateFraudDetectionSettings: (updates: Record<string, string | number>) =>
    axiosClient.put('/admin/fraud-detection-settings', { updates }),
};
