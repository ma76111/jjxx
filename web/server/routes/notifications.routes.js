import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { protectedLimiter } from '../middlewares/rateLimiter.js';
import { getNotifications, getUnreadCount, markAllRead, markOneRead, getPrefs, updatePrefs } from '../controllers/notifications.controller.js';

const router = Router();
router.use(authMiddleware, protectedLimiter);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/read-all', markAllRead);
router.post('/:id/read', markOneRead);
router.get('/prefs', getPrefs);
router.put('/prefs', updatePrefs);

export default router;
