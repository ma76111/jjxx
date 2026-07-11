# Referral & Paid-Tasks Bot

بوت تيليجرام لتبادل الإحالات وتنفيذ المهام المدفوعة + لوحة ويب للمستخدمين والأدمن.

## المتطلبات

- Node.js 20+
- npm 10+

## الإعداد السريع

### 1. تثبيت الاعتماديات

```bash
# Bot (root)
npm install

# Web Server
cd web/server && npm install

# Web Client
cd web/client && npm install
```

### 2. إعداد متغيرات البيئة

```bash
# نسخ ملفات البيئة
cp .env.example .env                    # أو عدّل .env مباشرة
cp web/server/.env.example web/server/.env
cp web/client/.env.example web/client/.env
```

**`.env` (البوت):**
```
BOT_TOKEN=<token from @BotFather>
BOT_NAME=your_bot
MAIN_ADMIN_ID=<telegram_id>
ADMIN_IDS=<id1,id2>
DATABASE_PATH=./bot.db
BINANCE_API_KEY=           # اختياري — للتحقق التلقائي من TXID
BINANCE_API_SECRET=        # اختياري
GITHUB_BACKUP_TOKEN=       # اختياري — للنسخ الاحتياطي
GITHUB_BACKUP_REPO=user/repo
```

**`web/server/.env`:**
```
BOT_TOKEN=<نفس token البوت>
BOT_NAME=your_bot
JWT_SECRET=<سلسلة عشوائية طويلة>
WEB_PORT=3001
CLIENT_ORIGIN=http://localhost:5173
MAIN_ADMIN_ID=<telegram_id>
```

**`web/client/.env`:**
```
VITE_BOT_NAME=your_bot
VITE_API_URL=http://localhost:3001/api
```

### 3. تشغيل في وضع التطوير

```bash
# Terminal 1 — Bot
node index.js

# Terminal 2 — Web Server
node web/server/index.js

# Terminal 3 — Web Client
cd web/client && npm run dev
```

### 4. بناء الكلاينت للإنتاج

```bash
cd web/client && npm run build
```

### 5. تشغيل بـ PM2 (إنتاج)

```bash
pm2 start ecosystem.config.cjs
pm2 logs
pm2 restart all
```

## هيكل المشروع

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

## تسجيل الدخول للويب

1. افتح الموقع → اضغط "افتح البوت وسجّل دخول"
2. افتح البوت في تيليجرام → `/start`
3. شارك رقم هاتفك (أول مرة فقط)
4. الموقع يكتشف التأكيد تلقائياً ويوجهك للداشبورد

لا حاجة لتسجيل دومين في BotFather.

## إعادة تعيين كاملة (تطوير فقط)

```bash
node reset_bot.js
```
