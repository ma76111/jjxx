import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { protectedLimiter } from '../middlewares/rateLimiter.js';
import {
  createTicket, getUserTickets, getTicket, replyToTicket,
  adminGetAllTickets, adminReplyToTicket, adminUpdateStatus, adminAssignTicket
} from '../controllers/tickets.controller.js';

const router = Router();
router.use(authMiddleware, protectedLimiter);

router.post('/', createTicket);
router.get('/', getUserTickets);
router.get('/:id', getTicket);
router.post('/:id/reply', replyToTicket);

// Admin sub-routes
router.get('/admin/all', adminMiddleware, adminGetAllTickets);
router.post('/admin/:id/reply', adminMiddleware, adminReplyToTicket);
router.put('/admin/:id/status', adminMiddleware, adminUpdateStatus);
router.put('/admin/:id/assign', adminMiddleware, adminAssignTicket);

export default router;
