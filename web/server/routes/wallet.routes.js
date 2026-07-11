import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { protectedLimiter } from '../middlewares/rateLimiter.js';
import { idempotencyMiddleware } from '../middlewares/idempotency.js';
import { getDeposits, getWithdrawals, createDeposit, createWithdrawal } from '../controllers/wallet.controller.js';

const router = Router();
router.use(authMiddleware, protectedLimiter);

router.get('/deposits', getDeposits);
router.get('/withdrawals', getWithdrawals);
router.post('/deposit', idempotencyMiddleware('/api/wallet/deposit'), createDeposit);
router.post('/withdraw', idempotencyMiddleware('/api/wallet/withdraw'), createWithdrawal);

export default router;
