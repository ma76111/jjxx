import { dbGet, dbAll, dbRun } from '../config/database.js';
import { isMainAdmin } from '../config/index.js';
import { logger } from '../utils/logger.js';

export async function getAdminByTelegramId(telegramId) {
  return dbGet('SELECT * FROM admins WHERE telegram_id = ? AND is_active = 1', [telegramId]);
}

export async function isAdminUser(telegramId) {
  if (isMainAdmin(telegramId)) return true;
  const admin = await getAdminByTelegramId(telegramId);
  return !!admin;
}

export async function hasPermission(telegramId, permission) {
  if (isMainAdmin(telegramId)) return true;
  const admin = await getAdminByTelegramId(telegramId);
  if (!admin) return false;
  try {
    const perms = JSON.parse(admin.permissions);
    return perms.includes('all') || perms.includes(permission);
  } catch {
    return admin.permissions === 'all';
  }
}

export async function addAdmin({ telegramId, username, addedBy, permissions = ['all'] }) {
  try {
    const result = await dbRun(
      `INSERT INTO admins (telegram_id, username, added_by, permissions)
       VALUES (?, ?, ?, ?)`,
      [telegramId, username || null, addedBy, JSON.stringify(permissions)]
    );
    return { success: true, admin_id: result.lastID };
  } catch (e) {
    if (e.message.includes('UNIQUE')) return { error: 'already_exists' };
    return { error: e.message };
  }
}

export async function removeAdmin(telegramId, removedBy) {
  if (isMainAdmin(telegramId)) return { error: 'cannot_remove_main_admin' };
  await dbRun('UPDATE admins SET is_active = 0 WHERE telegram_id = ?', [telegramId]);
  return { success: true };
}

export async function getAllAdmins() {
  return dbAll('SELECT * FROM admins WHERE is_active = 1 ORDER BY created_at');
}

export async function getAdminStats() {
  const [users, tasks, deposits, withdrawals, submissions, tickets, appeals] = await Promise.all([
    dbGet('SELECT COUNT(*) as c FROM users'),
    dbGet("SELECT COUNT(*) as c FROM tasks WHERE status = 'active'"),
    dbGet("SELECT COUNT(*) as c FROM deposits WHERE status IN ('pending','pending_verification')"),
    dbGet("SELECT COUNT(*) as c FROM withdrawals WHERE status = 'pending' AND eligible_at <= datetime('now')"),
    dbGet("SELECT COUNT(*) as c FROM task_submissions WHERE status = 'pending'"),
    dbGet("SELECT COUNT(*) as c FROM tickets WHERE status != 'closed'"),
    dbGet("SELECT COUNT(*) as c FROM appeals WHERE status = 'pending'"),
  ]);

  const [totalBalance, totalDeposited, totalWithdrawn] = await Promise.all([
    dbGet('SELECT COALESCE(SUM(balance),0) as total FROM users'),
    dbGet("SELECT COALESCE(SUM(amount),0) as total FROM deposits WHERE status = 'accept'"),
    dbGet("SELECT COALESCE(SUM(amount),0) as total FROM withdrawals WHERE status = 'completed'"),
  ]);

  return {
    total_users: users.c,
    active_tasks: tasks.c,
    pending_deposits: deposits.c,
    pending_withdrawals: withdrawals.c,
    pending_submissions: submissions.c,
    open_tickets: tickets.c,
    pending_appeals: appeals.c,
    total_balance_held: totalBalance.total,
    total_deposited: totalDeposited.total,
    total_withdrawn: totalWithdrawn.total,
  };
}

// ============================================================
// Maker-Checker (admin_action_proposals)
// ============================================================

export async function createProposal({ proposerId, actionType, targetType, targetId, payload }) {
  const result = await dbRun(
    `INSERT INTO admin_action_proposals (proposer_id, action_type, target_type, target_id, payload)
     VALUES (?, ?, ?, ?, ?)`,
    [proposerId, actionType, targetType, targetId || null, JSON.stringify(payload || {})]
  );
  return { success: true, proposal_id: result.lastID, status: 'pending_approval' };
}

export async function getProposals(status = 'pending_approval', page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    dbAll(
      `SELECT p.*, a.username as proposer_username
       FROM admin_action_proposals p
       LEFT JOIN admins a ON p.proposer_id = a.id
       WHERE p.status = ?
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [status, limit, offset]
    ),
    dbGet('SELECT COUNT(*) as c FROM admin_action_proposals WHERE status = ?', [status]),
  ]);
  return { rows, total: total.c };
}

export async function approveProposal(proposalId, approverId) {
  const proposal = await dbGet('SELECT * FROM admin_action_proposals WHERE id = ?', [proposalId]);
  if (!proposal) return { error: 'not_found' };
  if (proposal.status !== 'pending_approval') return { error: 'not_pending' };

  // CRITICAL: Prevent self-approval
  if (proposal.proposer_id === approverId) {
    return { error: 'self_approval_forbidden' };
  }

  // Execute the proposal action
  const result = await executeProposalAction(proposal);
  if (result.error) return result;

  await dbRun(
    `UPDATE admin_action_proposals
     SET status = 'approved', approved_by = ?, resolved_at = datetime('now')
     WHERE id = ?`,
    [approverId, proposalId]
  );

  return { success: true, proposal_id: proposalId, status: 'approved', executed: true, ...result };
}

export async function rejectProposal(proposalId, approverId, reason) {
  if (!reason || !reason.trim()) return { error: 'reason_required' };

  const proposal = await dbGet('SELECT * FROM admin_action_proposals WHERE id = ?', [proposalId]);
  if (!proposal) return { error: 'not_found' };
  if (proposal.status !== 'pending_approval') return { error: 'not_pending' };

  await dbRun(
    `UPDATE admin_action_proposals
     SET status = 'rejected', approved_by = ?, approval_note = ?, resolved_at = datetime('now')
     WHERE id = ?`,
    [approverId, reason, proposalId]
  );
  return { success: true, proposal_id: proposalId, status: 'rejected' };
}

async function executeProposalAction(proposal) {
  const payload = JSON.parse(proposal.payload);

  switch (proposal.action_type) {
    case 'adjust_balance': {
      const { adjustBalance, findUserById } = await import('./userService.js');
      const user = await findUserById(proposal.target_id);
      if (!user) return { error: 'user_not_found' };
      const delta = payload.direction === 'add' ? payload.amount : -payload.amount;
      const newBalance = await adjustBalance(proposal.target_id, delta);
      return { new_balance: newBalance };
    }

    case 'adjust_points': {
      const { adjustPoints, findUserById } = await import('./userService.js');
      const user = await findUserById(proposal.target_id);
      if (!user) return { error: 'user_not_found' };
      const delta = payload.direction === 'add' ? payload.amount : -payload.amount;
      const newPoints = await adjustPoints(proposal.target_id, delta);
      return { new_points: newPoints };
    }

    case 'update_financial_setting': {
      const { setSetting } = await import('./settingsService.js');
      await setSetting(payload.key, payload.value);
      return { updated_setting: payload.key };
    }

    case 'confirm_permanent_ban': {
      const { confirmPermanentBan } = await import('./violationService.js');
      return confirmPermanentBan(proposal.target_id, proposal.proposer_id, payload.note);
    }

    case 'cancel_task_refund': {
      const { refundTask } = await import('./taskService.js');
      return refundTask(proposal.target_id, proposal.proposer_id);
    }

    default:
      logger.warn('[Proposal] Unknown action type:', proposal.action_type);
      return { error: 'unknown_action_type' };
  }
}

// ============================================================
// Idempotency
// ============================================================

export async function checkIdempotencyKey(key, endpoint) {
  const row = await dbGet(
    "SELECT * FROM idempotency_keys WHERE key = ? AND created_at >= datetime('now', '-24 hours')",
    [key]
  );
  if (!row) return null;
  if (row.endpoint !== endpoint) return { conflict: true };
  return { replay: true, response: JSON.parse(row.response_snapshot) };
}

export async function storeIdempotencyKey(key, endpoint, responseSnapshot) {
  try {
    await dbRun(
      'INSERT OR IGNORE INTO idempotency_keys (key, endpoint, response_snapshot) VALUES (?, ?, ?)',
      [key, endpoint, JSON.stringify(responseSnapshot)]
    );
  } catch {
    // Already stored — that's fine
  }
}

export async function cleanupIdempotencyKeys() {
  const result = await dbRun(
    "DELETE FROM idempotency_keys WHERE created_at < datetime('now', '-24 hours')"
  );
  return result.changes;
}
