import { dbGet, dbAll, dbRun } from '../config/database.js';

function genTicketNo(id) {
  return `TCK-${String(id).padStart(6, '0')}`;
}

export async function createTicket(req, res) {
  const { subject, body, priority = 'medium' } = req.body;
  if (!subject || !body) return res.status(400).json({ success: false, error: 'missing_fields' });

  const result = await dbRun(
    "INSERT INTO tickets (user_id, subject, priority, ticket_no) VALUES (?, ?, ?, 'TEMP')",
    [req.user.id, subject, priority]
  );
  const ticketId = result.lastID;
  const ticketNo = genTicketNo(ticketId);
  await dbRun('UPDATE tickets SET ticket_no = ? WHERE id = ?', [ticketNo, ticketId]);
  await dbRun(
    'INSERT INTO ticket_messages (ticket_id, sender_id, is_admin, body) VALUES (?, ?, 0, ?)',
    [ticketId, req.user.id, body]
  );

  return res.status(201).json({ success: true, ticket_id: ticketId, ticket_no: ticketNo, status: 'open' });
}

export async function getUserTickets(req, res) {
  const rows = await dbAll(
    'SELECT * FROM tickets WHERE user_id = ? ORDER BY updated_at DESC',
    [req.user.id]
  );
  return res.json({ tickets: rows });
}

export async function getTicket(req, res) {
  const ticketId = parseInt(req.params.id);
  const ticket = await dbGet('SELECT * FROM tickets WHERE id = ?', [ticketId]);
  if (!ticket) return res.status(404).json({ success: false, error: 'not_found' });
  if (ticket.user_id !== req.user.id) return res.status(403).json({ success: false, error: 'forbidden' });

  const messages = await dbAll(
    'SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC',
    [ticketId]
  );
  return res.json({ ...ticket, messages });
}

export async function replyToTicket(req, res) {
  const ticketId = parseInt(req.params.id);
  const { body } = req.body;
  if (!body) return res.status(400).json({ success: false, error: 'missing_body' });

  const ticket = await dbGet('SELECT * FROM tickets WHERE id = ? AND user_id = ?', [ticketId, req.user.id]);
  if (!ticket) return res.status(404).json({ success: false, error: 'not_found' });
  if (ticket.status === 'closed') return res.status(400).json({ success: false, error: 'ticket_closed' });

  await dbRun(
    'INSERT INTO ticket_messages (ticket_id, sender_id, is_admin, body) VALUES (?, ?, 0, ?)',
    [ticketId, req.user.id, body]
  );
  await dbRun("UPDATE tickets SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?", [ticketId]);
  return res.json({ success: true });
}

// Admin endpoints
export async function adminGetAllTickets(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const status = req.query.status || null;
  const limit = 20;
  const offset = (page - 1) * limit;

  const where = status ? 'WHERE t.status = ?' : '';
  const params = status ? [status] : [];

  const [rows, total] = await Promise.all([
    dbAll(
      `SELECT t.*, u.username, u.telegram_id FROM tickets t
       JOIN users u ON t.user_id = u.id
       ${where} ORDER BY t.updated_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    dbGet(`SELECT COUNT(*) as c FROM tickets ${where}`, params),
  ]);

  return res.json({ tickets: rows, total: total.c, page });
}

export async function adminReplyToTicket(req, res) {
  const ticketId = parseInt(req.params.id);
  const { body } = req.body;
  if (!body) return res.status(400).json({ success: false, error: 'missing_body' });

  const ticket = await dbGet('SELECT * FROM tickets WHERE id = ?', [ticketId]);
  if (!ticket) return res.status(404).json({ success: false, error: 'not_found' });

  await dbRun(
    'INSERT INTO ticket_messages (ticket_id, sender_id, is_admin, body) VALUES (?, ?, 1, ?)',
    [ticketId, req.user.id, body]
  );
  await dbRun("UPDATE tickets SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?", [ticketId]);

  // Notify user
  await dbRun(
    "INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'ticket_reply', ?, ?)",
    [ticket.user_id, `رد على تذكرتك ${ticket.ticket_no}`, body.slice(0, 100)]
  );

  return res.json({ success: true });
}

export async function adminUpdateStatus(req, res) {
  const ticketId = parseInt(req.params.id);
  const { status } = req.body;
  const allowed = ['open', 'in_progress', 'closed'];
  if (!allowed.includes(status)) return res.status(400).json({ success: false, error: 'invalid_status' });

  await dbRun(
    `UPDATE tickets SET status = ?, updated_at = datetime('now')${status === 'closed' ? ", closed_at = datetime('now')" : ''} WHERE id = ?`,
    [status, ticketId]
  );
  return res.json({ success: true });
}

export async function adminAssignTicket(req, res) {
  const ticketId = parseInt(req.params.id);
  const { admin_id } = req.body;
  await dbRun("UPDATE tickets SET assigned_to = ?, updated_at = datetime('now') WHERE id = ?", [admin_id, ticketId]);
  return res.json({ success: true });
}
