# 🤖 Referral & Paid-Tasks Telegram Bot

Full-featured Telegram bot for referrals and paid tasks with web dashboard for users and admins.

---

## 🚀 Quick Setup on Termux

**Easiest way! One command:**

```bash
pkg update -y && pkg install -y git nodejs && git clone https://github.com/ma76111/jjxx.git && cd jjxx && bash setup-termux.sh
```

---

## 💻 Setup on Windows/Linux/Mac

### Requirements

- Node.js 20+
- npm 10+

### Quick Setup

### 1. Install Dependencies

```bash
# Bot (root)
npm install

# Web Server
cd web/server && npm install

# Web Client
cd web/client && npm install
```

### 2. Setup Environment Variables

```bash
# Copy environment files
cp .env.example .env
cp web/server/.env.example web/server/.env
cp web/client/.env.example web/client/.env
```

**`.env` (Bot):**
```
BOT_TOKEN=<token from @BotFather>
BOT_NAME=your_bot
MAIN_ADMIN_ID=<telegram_id>
ADMIN_IDS=<id1,id2>
DATABASE_PATH=./bot.db
BINANCE_API_KEY=           # Optional — for automatic TXID verification
BINANCE_API_SECRET=        # Optional
GITHUB_BACKUP_TOKEN=       # Optional — for backups
GITHUB_BACKUP_REPO=user/repo
```

**`web/server/.env`:**
```
BOT_TOKEN=<same bot token>
BOT_NAME=your_bot
JWT_SECRET=<long random string>
WEB_PORT=3001
CLIENT_ORIGIN=http://localhost:5173
MAIN_ADMIN_ID=<telegram_id>
```

**`web/client/.env`:**
```
VITE_BOT_NAME=your_bot
VITE_API_URL=http://localhost:3001/api
```

### 3. Run in Development Mode

```bash
# Terminal 1 — Bot
node index.js

# Terminal 2 — Web Server
node web/server/index.js

# Terminal 3 — Web Client
cd web/client && npm run dev
```

### 4. Build Client for Production

```bash
cd web/client && npm run build
```

### 5. Run with PM2 (Production)

```bash
pm2 start ecosystem.config.cjs
pm2 logs
pm2 restart all
```

## Project Structure

```
referral-bot/
├── index.js              # Bot entry point
├── config/               # DB + config
├── db/                   # Schema + seed + migrations
├── handlers/             # Telegram message handlers
├── services/             # Business logic
├── jobs/                 # Cron jobs
├── keyboards/            # Telegram keyboards
├── middlewares/          # Ban check + admin guard
├── utils/                # i18n, logger, state, validators
├── i18n/                 # ar, en, ru, fa, tr
└── web/
    ├── server/           # Express API (port 3001)
    └── client/           # React + Vite dashboard
```

## Web Login

1. Open website → Click "Open Bot and Login"
2. Open bot in Telegram → `/start`
3. Share phone number (first time only)
4. Website automatically detects and redirects to dashboard

No need to register domain in BotFather.

## Complete Reset (Development Only)

```bash
node reset_bot.js
```

---

## 🛠️ Termux Scripts

### `setup-termux.sh` - Complete Setup
```bash
bash setup-termux.sh        # Interactive menu
bash setup-termux.sh --auto # Full automatic
```

### `start-tunnel.sh` - Open Web Publicly
```bash
bash start-tunnel.sh
```
Options:
- LocalTunnel (easy & free)
- Serveo (SSH tunnel)
- Ngrok (professional)

### `manage.sh` - Quick Management
```bash
bash manage.sh
```
Features:
- Status and logs display
- Restart/Stop services
- Database backup
- Update from GitHub
- Clean logs

---

## 📱 Useful PM2 Commands

```bash
pm2 status              # Service status
pm2 logs                # View live logs
pm2 logs telegram-bot   # Bot logs only
pm2 logs web-server     # Server logs only
pm2 restart all         # Restart all
pm2 stop all            # Stop all
pm2 delete all          # Delete all
pm2 flush               # Clear logs
```

---
