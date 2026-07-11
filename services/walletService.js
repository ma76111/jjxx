import { dbGet, dbAll, dbRun } from '../config/database.js';
import { getSetting } from './settingsService.js';
import { adjustBalance, findUserById } from './userService.js';
import { createNotification } from './notificationService.js';
import { verifyTxid } from './binanceService.js';
import { processingDeposits } from '../utils/state.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export async function createDeposit({ userId, amount, method, binanceId, txid, screenshotId, transferTime, walletAddress, network }) {
  // Check for duplicate TXID
  if (txid) {
    const existing = await dbGet('SELECT id FROM deposits WHERE txid = ?', [txid]);
    if (existing) return { error: 'duplicate_txid' };
  }

  const result = await dbRun(
    `INSERT INTO deposits (user_id, amount, method, binance_id, txid, screenshot_id, transfer_time, wallet_address, network)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, amount, method, binanceId || null, txid || null, screenshotId || null, transferTime || null, walletAddress || null, network || null]
  );

  const depositId = result.lastID;

  // Auto-verify TXID if available
  if (method === 'txid' && txid) {
    setImmediate(() => autoVerifyDeposit(depositId, txid, amount, network));
  }

  return { deposit_id: depositId, status: method === 'txid' ? 'pending_verification' : 'pending' };
}

async function autoVerifyDeposit(depositId, txid, expectedAmount, network) {
  if (processingDeposits.has(depositId)) return;
  processingDeposits.add(depositId);

  try {
    const deposit = await dbGet('SELECT * FROM deposits WHERE id = ?', [depositId]);
    if (!deposit || deposit.status !== 'pending') return;

    const result = await verifyTxid(txid, expectedAmount, network);

    if (result.verified) {
      await dbRun(
        "UPDATE deposits SET status = 'accept', reviewed_at = datetime('now') WHERE id = ?",
        [depositId]
      );
      await adjustBalance(deposit.user_id, deposit.amount);
      await createNotification({
        userId: deposit.user_id,
        type: 'deposit_completed',
        title: 'تم قبول إيداعك',
        body: `تم إضافة ${deposit.amount} USDT لرصيدك.`,
      });
      logger.info('[Deposit] Auto-accepted:', { depositId, amount: deposit.amount });
    } else {
      // Could not verify automatically — leave as pending for manual review
      logger.info('[Deposit] Auto-verify failed, left for manual review:', { depositId });
    }
  } catch (err) {
    logger.error('[Deposit] Auto-verify error:', { depositId, err: err.message });
  } finally {
    processingDeposits.delete(depositId);
  }
}

export async function adminAcceptDeposit(depositId, adminId) {
  const deposit = await dbGet('SELECT * FROM deposits WHERE id = ?', [depositId]);
  if (!deposit) return { error: 'not_found' };
  if (deposit.status !== 'pending' && deposit.status !== 'pending_verification') {
    return { error: 'not_pending' };
  }

  await dbRun(
    "UPDATE deposits SET status = 'accept', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?",
    [adminId, depositId]
  );
  await adjustBalance(deposit.user_id, deposit.amount);
  await createNotification({
    userId: deposit.user_id,
    type: 'deposit_completed',
    title: 'تم قبول إيداعك',
    body: `تم إضافة ${deposit.amount} USDT لرصيدك.`,
  });
  return { success: true };
}

export async function adminRejectDeposit(depositId, adminId, reason) {
  const deposit = await dbGet('SELECT * FROM deposits WHERE id = ?', [depositId]);
  if (!deposit) return { error: 'not_found' };

  await dbRun(
    "UPDATE deposits SET status = 'reject', reviewed_by = ?, reviewed_at = datetime('now'), reject_reason = ? WHERE id = ?",
    [adminId, reason || null, depositId]
  );
  return { success: true };
}

export async function createWithdrawal({ userId, amount, method, binanceId, walletAddress, network, tonAddress }) {
  const user = await findUserById(userId);
  if (!user) return { error: 'user_not_found' };

  const minWithdrawal = parseFloat(await getSetting('min_withdrawal', '0.1'));
  if (amount < minWithdrawal) return { error: 'below_min_withdrawal', min: minWithdrawal };
  if (user.balance < amount) return { error: 'insufficient_balance' };

  // Check daily limit
  const maxDaily = parseFloat(await getSetting('max_withdrawal_per_day', '1000'));
  const todayTotal = await dbGet(
    `SELECT COALESCE(SUM(amount),0) as total FROM withdrawals
     WHERE user_id = ? AND status != 'rejected' AND date(created_at) = date('now')`,
    [userId]
  );
  if (todayTotal.total + amount > maxDaily) return { error: 'daily_limit_exceeded' };

  // Check weekly limit
  const maxWeekly = parseFloat(await getSetting('max_withdrawal_per_week', '5000'));
  const weekTotal = await dbGet(
    `SELECT COALESCE(SUM(amount),0) as total FROM withdrawals
     WHERE user_id = ? AND status != 'rejected' AND created_at >= datetime('now', '-7 days')`,
    [userId]
  );
  if (weekTotal.total + amount > maxWeekly) return { error: 'weekly_limit_exceeded' };

  // First withdrawal delay
  const delayHours = parseInt(await getSetting('first_withdrawal_delay_hours', '24'));
  const isFirstWithdrawal = await dbGet(
    "SELECT COUNT(*) as c FROM withdrawals WHERE user_id = ?",
    [userId]
  );

  let eligibleAt = new Date().toISOString();
  if (isFirstWithdrawal.c === 0) {
    const eligible = new Date(new Date(user.created_at).getTime() + delayHours * 3600 * 1000);
    eligibleAt = eligible.toISOString();
  }

  // Deduct balance immediately (hold)
  await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);

  const result = await dbRun(
    `INSERT INTO withdrawals (user_id, amount, method, binance_id, wallet_address, network, ton_address, eligible_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, amount, method, binanceId || null, walletAddress || null, network || null, tonAddress || null, eligibleAt]
  );

  const withdrawalId = result.lastID;

  // Alert main admin for large withdrawals
  const alertThreshold = parseFloat(await getSetting('withdrawal_alert_threshold', '100'));
  if (amount >= alertThreshold) {
    logger.warn('[Withdrawal] Large withdrawal alert:', { userId, amount, withdrawalId });
    // Notification to main admin handled by notificationService
    await createNotification({
      userId: config.MAIN_ADMIN_ID,
      type: 'system_update',
      title: '⚠️ سحب كبير',
      body: `طلب سحب ${amount} USDT من المستخدم #${userId} (طلب #${withdrawalId})`,
    });
  }

  return { withdrawal_id: withdrawalId, status: 'pending', eligible_at: eligibleAt };
}

export async function adminCompleteWithdrawal(withdrawalId, adminId) {
  const w = await dbGet('SELECT * FROM withdrawals WHERE id = ?', [withdrawalId]);
  if (!w) return { error: 'not_found' };
  if (w.status !== 'pending') return { error: 'not_pending' };

  // Check eligible_at
  if (new Date(w.eligible_at) > new Date()) {
    return { error: 'not_eligible_yet', eligible_at: w.eligible_at };
  }

  await dbRun(
    "UPDATE withdrawals SET status = 'completed', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?",
    [adminId, withdrawalId]
  );
  await createNotification({
    userId: w.user_id,
    type: 'withdrawal_completed',
    title: 'تم تنفيذ سحبك',
    body: `تم تحويل ${w.amount} USDT بنجاح.`,
  });
  return { success: true };
}

export async function adminRejectWithdrawal(withdrawalId, adminId, reason) {
  const w = await dbGet('SELECT * FROM withdrawals WHERE id = ?', [withdrawalId]);
  if (!w) return { error: 'not_found' };
  if (w.status !== 'pending') return { error: 'not_pending' };

  // Refund balance
  await adjustBalance(w.user_id, w.amount);

  await dbRun(
    "UPDATE withdrawals SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now'), reject_reason = ? WHERE id = ?",
    [adminId, reason || null, withdrawalId]
  );
  await createNotification({
    userId: w.user_id,
    type: 'withdrawal_completed',
    title: 'تم رفض طلب السحب',
    body: `تم رفض سحبك بمبلغ ${w.amount} USDT. السبب: ${reason || 'غير محدد'}. تم إرجاع الرصيد.`,
  });
  return { success: true };
}

export async function getUserDeposits(userId) {
  return dbAll('SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC', [userId]);
}

export async function getUserWithdrawals(userId) {
  return dbAll('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC', [userId]);
}

export async function getPendingDeposits(page = 1) {
  const limit = 20;
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll(
      `SELECT d.*, u.username, u.telegram_id FROM deposits d
       JOIN users u ON d.user_id = u.id
       WHERE d.status IN ('pending','pending_verification')
       ORDER BY d.created_at ASC LIMIT ? OFFSET ?`,
      [limit, offset]
    ),
    dbGet("SELECT COUNT(*) as c FROM deposits WHERE status IN ('pending','pending_verification')"),
  ]);
  return { rows, total: total.c };
}

export async function getPendingWithdrawals(page = 1) {
  const limit = 20;
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll(
      `SELECT w.*, u.username, u.telegram_id FROM withdrawals w
       JOIN users u ON w.user_id = u.id
       WHERE w.status = 'pending' AND w.eligible_at <= datetime('now')
       ORDER BY w.created_at ASC LIMIT ? OFFSET ?`,
      [limit, offset]
    ),
    dbGet("SELECT COUNT(*) as c FROM withdrawals WHERE status = 'pending' AND eligible_at <= datetime('now')"),
  ]);
  return { rows, total: total.c };
}
