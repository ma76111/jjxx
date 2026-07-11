import { dbGet, dbRun } from '../config/database.js';

/**
 * Idempotency middleware for financial endpoints.
 * Checks Idempotency-Key header; replays stored response if key was seen.
 */
export function idempotencyMiddleware(endpoint) {
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key) return next(); // No key — proceed normally

    try {
      const existing = await dbGet(
        "SELECT * FROM idempotency_keys WHERE key = ? AND created_at >= datetime('now', '-24 hours')",
        [key]
      );

      if (existing) {
        if (existing.endpoint !== endpoint) {
          return res.status(409).json({ error: 'idempotency_key_endpoint_mismatch' });
        }
        const response = JSON.parse(existing.response_snapshot);
        return res.status(200).json({ ...response, idempotent_replay: true });
      }

      // Intercept res.json to store the response
      const originalJson = res.json.bind(res);
      res.json = async (body) => {
        if (res.statusCode < 400) {
          try {
            await dbRun(
              'INSERT OR IGNORE INTO idempotency_keys (key, endpoint, response_snapshot) VALUES (?, ?, ?)',
              [key, endpoint, JSON.stringify(body)]
            );
          } catch {}
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
