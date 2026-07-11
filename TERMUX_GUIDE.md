# 📱 دليل تشغيل المشروع على Termux

## المتطلبات الأساسية

```bash
# تحديث الحزم
pkg update && pkg upgrade

# تثبيت المتطلبات
pkg install nodejs git python
npm install -g pm2
```

## التثبيت

```bash
# استنساخ المشروع
git clone <your-repo-url>
cd egypt-easy-cash-bot

# تثبيت التبعيات
npm install
cd web/server && npm install && cd ../..
cd web/client && npm install && cd ../..

# نسخ ملفات البيئة
cp .env.example .env
cp web/server/.env.example web/server/.env
cp web/client/.env.example web/client/.env

# تعديل ملف .env وإضافة BOT_TOKEN
nano .env
```

## إصلاح المشاكل الشائعة

إذا واجهت مشاكل، شغّل:

```bash
chmod +x fix-termux.sh
./fix-termux.sh
```

هذا السكريبت:
- ✅ يوقف جميع العمليات السابقة
- ✅ ينظف الملفات المؤقتة
- ✅ يحرر المنافذ المستخدمة
- ✅ يتحقق من التبعيات

## التشغيل

```bash
chmod +x start-termux.sh
./start-termux.sh
```

## المشاكل الشائعة وحلولها

### 1. خطأ ETIMEDOUT في البوت

**السبب:** مشكلة اتصال بـ Telegram API

**الحل:**
- تم إضافة إعادة اتصال تلقائية
- البوت سيحاول الاتصال مرة أخرى تلقائياً كل 5 ثواني

### 2. خطأ Babel في العميل

**السبب:** تعارض في إعدادات Babel مع Vite

**الحل:**
- تم تعطيل Fast Refresh المسبب للمشاكل
- تم إنشاء سكريبت مخصص `start-dev.sh` للعميل
- تم تحسين إعدادات Vite للعمل على Termux

### 3. المنافذ مشغولة

```bash
# تحقق من العمليات المشغلة للمنافذ
lsof -ti:3001
lsof -ti:5173

# أوقف العمليات
pm2 delete all
pm2 kill

# أو شغّل السكريبت
./fix-termux.sh
```

### 4. لا يمكن الوصول من الهاتف

تأكد من:
- الهاتف والتيرمكس على نفس الشبكة
- استخدم عنوان IP الصحيح (يظهر عند التشغيل)
- افتح: `http://[IP]:5173`

## أوامر PM2 المفيدة

```bash
# عرض حالة الخدمات
pm2 status

# عرض اللوجات
pm2 logs
pm2 logs bot
pm2 logs server
pm2 logs client

# إيقاف/إعادة تشغيل
pm2 restart all
pm2 restart bot
pm2 stop all

# حذف العمليات
pm2 delete all
pm2 kill
```

## معلومات الخدمات

| الخدمة | المنفذ | الوصف |
|--------|-------|-------|
| Bot | - | بوت التليجرام |
| Server | 3001 | API Backend |
| Client | 5173 | React Frontend |

## نصائح للأداء

1. **توفير البطارية:**
```bash
# إيقاف الخدمات غير المستخدمة
pm2 stop client  # إذا لا تحتاج الواجهة
```

2. **الحفاظ على الذاكرة:**
```bash
# مراقبة استخدام الذاكرة
pm2 monit
```

3. **تجنب النوم التلقائي:**
- اذهب لإعدادات Termux
- فعّل "Acquire wakelock"

## البناء للإنتاج (Production)

```bash
# بناء العميل
cd web/client
npm run build
cd ../..

# تشغيل بـ PM2 للإنتاج
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## الدعم

إذا استمرت المشاكل:
1. شغّل `./fix-termux.sh`
2. تحقق من اللوجات: `pm2 logs`
3. تحقق من ملف `.env`
4. تأكد من الاتصال بالإنترنت
