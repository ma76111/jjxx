import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cron from 'node-cron';

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

// Init shared DB
initDb();

// Trust proxy for tunneling services (LocalTunnel, Ngrok, etc.)
app.set('trust proxy', true);

// Security middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost and configured origin
    const allowedOrigins = [
      CLIENT_ORIGIN,
      'http://localhost:5173',
      'http://localhost:3000',
    ];
    
    // Allow any loca.lt, ngrok.io, or serveo.net domain
    if (origin.includes('loca.lt') || origin.includes('ngrok.io') || origin.includes('serveo.net')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now (tunneling)
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(publicLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/tickets', ticketsRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ success: false, error: 'internal_server_error' });
});

// Cron: check stale tickets every 15 minutes
cron.schedule('*/15 * * * *', checkStaleTickets);

app.listen(PORT, () => {
  console.log(`[Server] Web server running on port ${PORT}`);
});

export default app;
