import { Router } from 'express';
import { startLogin, getLoginStatus, confirmLogin } from '../controllers/auth.controller.js';
import { authStartLimiter, publicLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/start', authStartLimiter, startLogin);
router.get('/status/:token', authStartLimiter, getLoginStatus);
router.post('/confirm', publicLimiter, confirmLogin);

export default router;
