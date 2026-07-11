import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { protectedLimiter } from '../middlewares/rateLimiter.js';
import { idempotencyMiddleware } from '../middlewares/idempotency.js';
import {
  getAvailableTasks, getMyTasks, getMySubmissions, createTask,
  updateTask, pauseTask, resumeTask, hideTask, submitProof, getTaskAudit, getUserSettings
} from '../controllers/tasks.controller.js';

const router = Router();
router.use(authMiddleware, protectedLimiter);

router.get('/', getAvailableTasks);
router.get('/mine', getMyTasks);
router.get('/submissions', getMySubmissions);
router.post('/submissions/:submissionId/report-duplicate', async (req, res) => {
  const { reportDuplicate } = await import('../controllers/duplicateProof.controller.js');
  return reportDuplicate(req, res);
});
router.post('/create', idempotencyMiddleware('/api/tasks/create'), createTask);
router.patch('/:id', updateTask);
router.post('/:id/pause', pauseTask);
router.post('/:id/resume', resumeTask);
router.post('/:id/hide', hideTask);
router.post('/:id/submit', submitProof);
router.get('/:id/audit', getTaskAudit);
router.get('/settings/public', getUserSettings);

export default router;
