import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cron from 'node-cron';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { initDb } from './config/database.js';
import { publicLimiter } from './middlewares/rateLimiter.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import tasksRoutes from './routes/tasks.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import adminRoutes from './routes/admin.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import ticketsRoutes from './routes/tickets.routes.js';

import { checkStaleTickets } from './jobs/checkStaleTickets.js';

const app = express();
const PORT = process.env.WEB_PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, '../client/dist');

// Init shared DB
initDb();

// Trust proxy for tunneling services (LocalTunnel, Ngrok, etc.)
app.set('trust proxy', true);

// Security — CSP disabled for tunnel/dev compatibility
app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      origin.includes('loca.lt') ||
      origin.includes('ngrok.io') ||
      origin.includes('serveo.net') ||
      origin.includes('localhost')
    ) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));

// Serve built React static files FIRST — no rate limiting on assets
if (existsSync(distPath)) {
  app.use(express.static(distPath, {
    maxAge: '1h',
    etag: true,
  }));
}

// Health check — no rate limit
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Apply rate limiter only to API routes
app.use('/api', publicLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/tickets', ticketsRoutes);

// SPA fallback — serve index.html for all non-API routes (React Router)
if (existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ success: false, error: 'internal_server_error' });
});

// Cron: check stale tickets every 15 minutes
cron.schedule('*/15 * * * *', checkStaleTickets);

app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  if (existsSync(distPath)) {
    console.log(`[Server] Serving React app from ${distPath}`);
  } else {
    console.log(`[Server] No React build found at ${distPath} — API only mode`);
  }
});

export default app;
