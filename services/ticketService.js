import { dbGet, dbAll, dbRun } from '../config/database.js';
import { createNotification } from './notificationService.js';

function generateTicketNo(id) {
  return `TCK-${String(id).padStart(6, '0')}`;
}

export async function createTicket({ userId, subject, body, priority = 'medium' }) {
  const result = await dbRun(
    `INSERT INTO tickets (user_id, subject, priority, ticket_no)
     VALUES (?, ?, ?, 'TEMP')`,
    [userId, subject, priority]
  );

  const ticketId = result.lastID;
  const ticketNo = generateTicketNo(ticketId);

  await dbRun('UPDATE tickets SET ticket_no = ? WHERE id = ?', [ticketNo, ticketId]);

  // Add first message
  await dbRun(
    'INSERT INTO ticket_messages (ticket_id, sender_id, is_admin, body) VALUES (?, ?, 0, ?)',
    [ticketId, userId, body]
  );

  return { ticket_id: ticketId, ticket_no: ticketNo, status: 'open' };
}

export async function getUserTickets(userId) {
  return dbAll(
    'SELECT * FROM tickets WHERE user_id = ? ORDER BY updated_at DESC',
    [userId]
  );
}

export async function getTicketWithMessages(ticketId, userId = null) {
  const ticket = await dbGet('SELECT * FROM tickets WHERE id = ?', [ticketId]);
  if (!ticket) return null;
  if (userId && ticket.user_id !== userId) return null;

  const messages = await dbAll(
    'SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC',
    [ticketId]
  );
  return { ...ticket, messages };
}

export async function replyToTicket({ ticketId, senderId, body, isAdmin = false }) {
  const ticket = await dbGet('SELECT * FROM tickets WHERE id = ?', [ticketId]);
  if (!ticket) return { error: 'not_found' };
  if (ticket.status === 'closed') return { error: 'ticket_closed' };

  await dbRun(
    `INSERT INTO ticket_messages (ticket_id, sender_id, is_admin, body) VALUES (?, ?, ?, ?)`,
    [ticketId, senderId, isAdmin ? 1 : 0, body]
  );

  await dbRun(
    "UPDATE tickets SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?",
    [ticketId]
  );

  // Notify the other party
  if (isAdmin) {
    await createNotification({
      userId: ticket.user_id,
      type: 'ticket_reply',
      title: `رد على تذكرتك ${ticket.ticket_no}`,
      body: body.slice(0, 100),
      link: `/tickets/${ticketId}`,
    });
  }

  return { success: true };
}

export async function closeTicket(ticketId, adminId) {
  await dbRun(
    "UPDATE tickets SET status = 'closed', closed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
    [ticketId]
  );
  return { success: true };
}

export async function getAllTickets(page = 1, limit = 20, status = null) {
  const offset = (page - 1) * limit;
  const where = status ? 'WHERE t.status = ?' : '';
  const params = status ? [status] : [];

  const [rows, total] = await Promise.all([
    dbAll(
      `SELECT t.*, u.username, u.telegram_id FROM tickets t
       JOIN users u ON t.user_id = u.id
       ${where}
       ORDER BY t.updated_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    dbGet(`SELECT COUNT(*) as c FROM tickets ${where}`, params),
  ]);
  return { rows, total: total.c, page };
}

export async function assignTicket(ticketId, adminId) {
  await dbRun(
    "UPDATE tickets SET assigned_to = ?, updated_at = datetime('now') WHERE id = ?",
    [adminId, ticketId]
  );
  return { success: true };
}

export async function updateTicketStatus(ticketId, status) {
  const allowed = ['open', 'in_progress', 'closed'];
  if (!allowed.includes(status)) return { error: 'invalid_status' };
  await dbRun(
    `UPDATE tickets SET status = ?, updated_at = datetime('now')${status === 'closed' ? ", closed_at = datetime('now')" : ''} WHERE id = ?`,
    [status, ticketId]
  );
  return { success: true };
}

export async function getStaleTickets(hoursSinceLastReply = 48) {
  return dbAll(
    `SELECT t.*, u.username, u.telegram_id
     FROM tickets t
     JOIN users u ON t.user_id = u.id
     WHERE t.status != 'closed'
       AND t.updated_at <= datetime('now', ?)`,
    [`-${hoursSinceLastReply} hours`]
  );
}
