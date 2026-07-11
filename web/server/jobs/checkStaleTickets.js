import { dbAll, dbGet, dbRun } from '../config/database.js';

export async function checkStaleTickets() {
  try {
    const stale = await dbAll(
      `SELECT t.*, u.username FROM tickets t JOIN users u ON t.user_id = u.id
       WHERE t.status != 'closed' AND t.updated_at <= datetime('now', '-48 hours')`
    );
    if (!stale.length) return;

    // Notify main admin
    const mainAdminId = parseInt(process.env.MAIN_ADMIN_ID) || 0;
    if (mainAdminId) {
      const adminUser = await dbGet('SELECT id FROM users WHERE telegram_id = ?', [mainAdminId]);
      if (adminUser) {
        await dbRun(
          "INSERT INTO notifications (user_id, type, title, body) VALUES (?, 'system_update', '🎫 تذاكر متأخرة', ?)",
          [adminUser.id, `${stale.length} تذكرة بدون رد منذ أكثر من 48 ساعة.`]
        );
      }
    }
    console.log(`[Job] checkStaleTickets: ${stale.length} stale tickets found.`);
  } catch (err) {
    console.error('[Job] checkStaleTickets error:', err.message);
  }
}
