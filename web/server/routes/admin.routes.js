import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware, requirePermission } from '../middlewares/adminMiddleware.js';
import { protectedLimiter } from '../middlewares/rateLimiter.js';
import * as a from '../controllers/admin.controller.js';

const router = Router();
router.use(authMiddleware, adminMiddleware, protectedLimiter);

// Stats
router.get('/stats', a.getStats);

// Users
router.get('/users/search', a.searchUsers);
router.post('/users/:id/balance', a.adjustBalance);
router.post('/users/:id/points', a.adjustPoints);
router.post('/users/:id/ban', a.banUser);
router.post('/users/:id/unban', a.unbanUser);
router.get('/users/:id/violations', a.getUserViolations);

// Deposits
router.get('/deposits', a.getPendingDeposits);
router.post('/deposits/:id/accept', a.acceptDeposit);
router.post('/deposits/:id/reject', a.rejectDeposit);

// Withdrawals
router.get('/withdrawals', a.getPendingWithdrawals);
router.post('/withdrawals/:id/complete', a.completeWithdrawal);
router.post('/withdrawals/:id/reject', a.rejectWithdrawal);

// Submissions
router.get('/submissions', a.getPendingSubmissions);
router.post('/submissions/:id/accept', a.acceptSubmission);
router.post('/submissions/:id/reject', a.rejectSubmission);

// Appeals
router.get('/appeals', a.getPendingAppeals);
router.post('/appeals/:id/approve', a.approveAppeal);
router.post('/appeals/:id/reject', a.rejectAppeal);

// Bans
router.get('/bans', a.getBans);

// Settings
router.get('/settings', a.getSettings);
router.post('/settings', a.updateSettings);

// Device logs
router.get('/device-logs', a.getDeviceLogs);
router.get('/duplicate-accounts', a.getDuplicateAccounts);

// Reports
router.get('/reports', a.getReports);

// Violation settings
router.get('/violation-settings', a.getViolationSettings);
router.put('/violation-settings/:track', requirePermission('edit_trust_settings'), a.updateViolationTrack);
router.put('/violation-settings/:track/types/:type', requirePermission('edit_trust_settings'), a.updateViolationType);
router.post('/violation-settings/:track/types', requirePermission('edit_trust_settings'), a.addViolationType);
router.delete('/violation-settings/:track/types/:type', requirePermission('edit_trust_settings'), a.deleteViolationType);
router.put('/violation-settings/:track/thresholds', requirePermission('edit_trust_settings'), a.updateThresholds);
router.put('/violation-settings/first-offense-grace', requirePermission('edit_trust_settings'), a.updateGraceSettings);

// Security queue
router.get('/security/review-queue', a.getSecurityReviewQueue);
router.post('/security/reports/:id/confirm', requirePermission('confirm_reports'), a.confirmReport);
router.post('/security/reports/:id/dismiss', requirePermission('confirm_reports'), a.dismissReport);
router.get('/security/frozen-accounts', a.getSecurityReviewQueue);
router.post('/security/frozen-accounts/:id/confirm-permanent-ban', requirePermission('confirm_permanent_ban'), a.confirmPermanentBan);
router.post('/security/frozen-accounts/:id/release', a.releaseFrozenAccount);
router.post('/users/:id/violations/:violationId/expire-now', a.expireViolationNow);
router.post('/users/:id/violations/:violationId/restore', a.restoreViolation);

// Maker-Checker proposals
router.post('/proposals', a.createProposal);
router.get('/proposals', a.getProposals);
router.post('/proposals/:id/approve', a.approveProposal);
router.post('/proposals/:id/reject', a.rejectProposal);

// Duplicate proof reports (fraud detection)
router.get('/duplicate-proof-reports', requirePermission('review_fraud_reports'), async (req, res) => {
  const { getDuplicateProofReports } = await import('../controllers/duplicateProof.controller.js');
  return getDuplicateProofReports(req, res);
});
router.get('/duplicate-proof-reports/:id', requirePermission('review_fraud_reports'), async (req, res) => {
  const { getDuplicateProofReport } = await import('../controllers/duplicateProof.controller.js');
  return getDuplicateProofReport(req, res);
});
router.post('/duplicate-proof-reports/:id/dismiss', requirePermission('review_fraud_reports'), async (req, res) => {
  const { dismissDuplicateProofReport } = await import('../controllers/duplicateProof.controller.js');
  return dismissDuplicateProofReport(req, res);
});
router.post('/duplicate-proof-reports/:id/penalize', requirePermission('penalize_fraud_accounts'), async (req, res) => {
  const { penalizeDuplicateProofReport } = await import('../controllers/duplicateProof.controller.js');
  return penalizeDuplicateProofReport(req, res);
});

// Fraud detection settings
router.get('/fraud-detection-settings', requirePermission('review_fraud_reports'), async (req, res) => {
  const { getFraudSettings } = await import('../controllers/duplicateProof.controller.js');
  return getFraudSettings(req, res);
});
router.put('/fraud-detection-settings', requirePermission('edit_fraud_detection_settings'), async (req, res) => {
  const { updateFraudSettings } = await import('../controllers/duplicateProof.controller.js');
  return updateFraudSettings(req, res);
});

export default router;
