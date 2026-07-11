import { dbGet, dbAll, dbRun } from '../config/database.js';

async function getSetting(key, def = null) {
  const row = await dbGet('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : def;
}

export async function getDeposits(req, res) {
  const rows = await dbAll(
    'SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id]
  );
  return res.json({ deposits: rows });
}

export async function getWithdrawals(req, res) {
  const rows = await dbAll(
    'SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id]
  );
  return res.json({ withdrawals: rows });
}

export async function createDeposit(req, res) {
  const userId = req.user.id;
  const { amount, method, network, txid, binance_id, transfer_time } = req.body;

  if (!amount || !method) return res.status(400).json({ success: false, error: 'missing_fields' });

  if (txid) {
    const dup = await dbGet('SELECT id FROM deposits WHERE txid = ?', [txid]);
    if (dup) return res.status(409).json({ success: false, error: 'duplicate_txid' });
  }

  const result = await dbRun(
    `INSERT INTO deposits (user_id, amount, method, binance_id, txid, transfer_time, network)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, amount, method, binance_id || null, txid || null, transfer_time || null, network || null]
  );

  const depositId = result.lastID;

  // Auto-verify TXID async
  if (method === 'txid' && txid) {
    setImmediate(async () => {
      try {
        const { verifyTxid } = await import('../../../services/binanceService.js').catch(() => ({ verifyTxid: async () => ({ verified: false }) }));
        const verification = await verifyTxid(txid, amount, network);
        if (verification.verified) {
          await dbRun(
            "UPDATE deposits SET status = 'accept', reviewed_at = datetime('now') WHERE id = ?",
            [depositId]
          );
          await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, userId]);
          await dbRun('INSERT INTO balance_history (user_id, balance) SELECT ?, balance FROM users WHERE id = ?', [userId, userId]);
          await dbRun(
            "INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'deposit_completed', 'تم قبول إيداعك', ?)",
            [userId, `تم إضافة ${amount} USDT لرصيدك.`]
          );
        }
      } catch {}
    });
    return res.status(202).json({ success: true, status: 'pending_verification', deposit_id: depositId });
  }

  return res.status(202).json({ success: true, status: 'pending', deposit_id: depositId });
}

export async function createWithdrawal(req, res) {
  const userId = req.user.id;
  const { amount, method, wallet_address, network, ton_address, binance_id } = req.body;

  if (!amount) return res.status(400).json({ success: false, error: 'missing_fields' });

  const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
  const minWithdrawal = parseFloat(await getSetting('min_withdrawal', '0.1'));

  if (amount < minWithdrawal) {
    return res.status(400).json({ success: false, error: 'below_min_withdrawal', min_withdrawal: minWithdrawal });
  }
  if (user.balance < amount) {
    return res.status(400).json({ success: false, error: 'insufficient_balance' });
  }

  // Daily limit check
  const maxDaily = parseFloat(await getSetting('max_withdrawal_per_day', '1000'));
  const todayTotal = await dbGet(
    "SELECT COALESCE(SUM(amount),0) as t FROM withdrawals WHERE user_id = ? AND status != 'rejected' AND date(created_at) = date('now')",
    [userId]
  );
  if (todayTotal.t + amount > maxDaily) {
    return res.status(400).json({ success: false, error: 'daily_limit_exceeded' });
  }

  // Weekly limit check
  const maxWeekly = parseFloat(await getSetting('max_withdrawal_per_week', '5000'));
  const weekTotal = await dbGet(
    "SELECT COALESCE(SUM(amount),0) as t FROM withdrawals WHERE user_id = ? AND status != 'rejected' AND created_at >= datetime('now', '-7 days')",
    [userId]
  );
  if (weekTotal.t + amount > maxWeekly) {
    return res.status(400).json({ success: false, error: 'weekly_limit_exceeded' });
  }

  // First withdrawal delay
  const delayHours = parseInt(await getSetting('first_withdrawal_delay_hours', '24'));
  const withdrawalCount = await dbGet('SELECT COUNT(*) as c FROM withdrawals WHERE user_id = ?', [userId]);
  let eligibleAt = new Date().toISOString();
  if (withdrawalCount.c === 0) {
    const eligible = new Date(new Date(user.created_at).getTime() + delayHours * 3600 * 1000);
    eligibleAt = eligible.toISOString();
  }

  // Deduct balance
  await dbRun('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);

  const result = await dbRun(
    `INSERT INTO withdrawals (user_id, amount, method, binance_id, wallet_address, network, ton_address, eligible_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, amount, method || 'wallet_address', binance_id || null, wallet_address || null, network || null, ton_address || null, eligibleAt]
  );

  const withdrawalId = result.lastID;

  // Alert admin for large withdrawal
  const alertThreshold = parseFloat(await getSetting('withdrawal_alert_threshold', '100'));
  if (amount >= alertThreshold) {
    const mainAdminId = parseInt(process.env.MAIN_ADMIN_ID) || 0;
    if (mainAdminId) {
      const adminUser = await dbGet('SELECT id FROM users WHERE telegram_id = ?', [mainAdminId]);
      if (adminUser) {
        await dbRun(
          "INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'system_update', '⚠️ سحب كبير', ?)",
          [adminUser.id, `طلب سحب ${amount} USDT من المستخدم #${userId} (طلب #${withdrawalId})`]
        );
      }
    }
  }

  return res.status(200).json({ success: true, withdrawal_id: withdrawalId, status: 'pending', eligible_at: eligibleAt });
}
