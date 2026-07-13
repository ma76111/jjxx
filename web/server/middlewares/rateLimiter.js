import rateLimit from 'express-rate-limit';

export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200, // Increased from 100 to 200
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'too_many_requests' },
  // Trust proxy: use X-Forwarded-For header from ngrok/localtunnel
  validate: { trustProxy: false },
  // Use combination of IP and forwarded IP for better tracking
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  },
});

export const protectedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'too_many_requests' },
  validate: { trustProxy: false },
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  },
});

export const authStartLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // Increased from 10 to 50 (for polling)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'too_many_auth_attempts' },
  validate: { trustProxy: false },
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  },
});
