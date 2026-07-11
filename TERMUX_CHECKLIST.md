# ✅ Termux Setup Checklist

## قبل البدء على Termux

### 1️⃣ نقل التعديلات من Windows لـ Git

على Windows/PC (الآن):
```bash
git status
git add .
git commit -m "Fix Termux ETIMEDOUT and Babel errors"
git push origin main
```

**الملفات المُعدلة:**
- ✅ `index.js` - إعادة اتصال تلقائية
- ✅ `web/client/vite.config.ts` - إعدادات محسنة
- ✅ `start-termux.sh` - تشغيل محسّن
- ✅ `README.md` - إضافة قسم Termux

**الملفات الجديدة:**
- ✅ `fix-termux.sh` - سكريبت الإصلاح
- ✅ `web/client/start-dev.sh` - سكريبت العميل
- ✅ `TERMUX_GUIDE.md` - الدليل الكامل
- ✅ `TROUBLESHOOTING.md` - حل المشاكل
- ✅ `QUICK_FIX_AR.md` - خطوات سريعة
- ✅ `FIXES_SUMMARY.md` - ملخص الإصلاحات
- ✅ `TERMUX_CHECKLIST.md` - هذا الملف

---

## على Termux

### 2️⃣ التحضير الأولي

```bash
# تحديث الحزم
pkg update && pkg upgrade -y

# تثبيت المتطلبات
pkg install nodejs-lts git python -y

# تثبيت PM2
npm install -g pm2

# التحقق من الإصدارات
node --version   # يجب أن يكون 18+
npm --version    # يجب أن يكون 9+
pm2 --version    # يجب أن يظهر الإصدار
```

### 3️⃣ استنساخ/تحديث المشروع

**إذا كان المشروع موجود بالفعل:**
```bash
cd ~/egypt-easy-cash-bot
git pull origin main
```

**إذا كان مشروع جديد:**
```bash
cd ~
git clone <your-repo-url> egypt-easy-cash-bot
cd egypt-easy-cash-bot
```

### 4️⃣ تثبيت التبعيات

```bash
# التبعيات الرئيسية
npm install

# تبعيات الخادم
cd web/server && npm install && cd ../..

# تبعيات العميل
cd web/client && npm install && cd ../..
```

### 5️⃣ إعداد البيئة

```bash
# نسخ ملفات البيئة إذا لم تكن موجودة
[ ! -f .env ] && cp .env.example .env
[ ! -f web/server/.env ] && cp web/server/.env.example web/server/.env
[ ! -f web/client/.env ] && cp web/client/.env.example web/client/.env

# تعديل الملف الرئيسي
nano .env
```

**أضف على الأقل:**
```
BOT_TOKEN=your_bot_token_from_botfather
MAIN_ADMIN_ID=your_telegram_id
```

### 6️⃣ تعيين الأذونات

```bash
chmod +x fix-termux.sh
chmod +x start-termux.sh
chmod +x web/client/start-dev.sh
```

### 7️⃣ تشغيل الإصلاح

```bash
./fix-termux.sh
```

**يجب أن ترى:**
- ✅ "إيقاف العمليات السابقة..."
- ✅ "تنظيف الملفات المؤقتة..."
- ✅ "التحقق من المنافذ..."
- ✅ "تعيين الأذونات..."
- ✅ "تم الإصلاح!"

### 8️⃣ تشغيل المشروع

```bash
./start-termux.sh
```

**يجب أن ترى:**
- ✅ IP address (مثل: 192.168.1.x)
- ✅ "تشغيل البوت..."
- ✅ "تشغيل الخادم..."
- ✅ "تشغيل العميل..."
- ✅ PM2 status table

### 9️⃣ التحقق من النجاح

```bash
pm2 status
```

**يجب أن تكون جميع الخدمات `online`:**
```
┌─────┬──────────┬─────────┬─────────┐
│ id  │ name     │ mode    │ status  │
├─────┼──────────┼─────────┼─────────┤
│ 0   │ bot      │ fork    │ online  │
│ 1   │ server   │ fork    │ online  │
│ 2   │ client   │ fork    │ online  │
└─────┴──────────┴─────────┴─────────┘
```

```bash
pm2 logs --lines 20
```

**يجب أن ترى:**
- ✅ Bot: "Bot is running"
- ✅ Server: "Server listening on port 3001"
- ✅ Client: "VITE v5.x ready in..."

**يجب ألا ترى:**
- ❌ ETIMEDOUT (أو إذا ظهر، يجب أن يُتبع بـ "Polling restarted")
- ❌ ReferenceError: [BABEL]
- ❌ normalizeFile errors

### 🔟 اختبار الوصول

```bash
# اطبع الـ IP
ip addr show wlan0 | grep "inet " | awk '{print $2}' | cut -d/ -f1
```

**من هاتف آخر على نفس الشبكة:**
- افتح: `http://[IP]:5173`

**يجب أن ترى صفحة تسجيل الدخول!** ✅

---

## إذا حدثت مشاكل

### المشكلة: خطأ ETIMEDOUT لا يزال يظهر

```bash
pm2 logs bot --lines 30
```

**إذا رأيت:** `Polling restarted successfully` → **هذا طبيعي!** ✅  
البوت يُصلح نفسه تلقائياً.

**إذا لم يُعد الاتصال:**
```bash
pm2 restart bot
pm2 logs bot
```

### المشكلة: خطأ Babel في Client

```bash
pm2 logs client --lines 30
```

**إذا رأيت أخطاء Babel:**
```bash
./fix-termux.sh
./start-termux.sh
```

### المشكلة: المنافذ مشغولة

```bash
./fix-termux.sh  # يحرر المنافذ تلقائياً
```

أو يدوياً:
```bash
kill -9 $(lsof -ti:3001,5173) 2>/dev/null
pm2 delete all
./start-termux.sh
```

### المشكلة: Cannot find module

```bash
npm install
cd web/server && npm install && cd ../..
cd web/client && npm install && cd ../..
```

### المشكلة: Permission denied

```bash
chmod +x fix-termux.sh start-termux.sh web/client/start-dev.sh
```

---

## نصائح مهمة

### 🔋 توفير البطارية

```bash
# في إعدادات Termux
Settings → Acquire wakelock [✓]

# إيقاف الواجهة إذا لم تكن مطلوبة
pm2 stop client
```

### 💾 الحفاظ على الذاكرة

```bash
pm2 monit  # مراقبة استخدام الموارد
```

### 📊 أوامر PM2 مفيدة

```bash
pm2 status              # حالة الخدمات
pm2 logs                # كل اللوجات
pm2 logs bot            # لوجات البوت فقط
pm2 restart all         # إعادة تشغيل الكل
pm2 restart bot         # إعادة تشغيل البوت فقط
pm2 stop all            # إيقاف مؤقت
pm2 delete all          # حذف الكل
pm2 save                # حفظ القائمة الحالية
pm2 monit               # مراقبة حية
```

### 🔄 تحديث الكود

```bash
pm2 stop all
git pull
npm install
cd web/server && npm install && cd ../..
cd web/client && npm install && cd ../..
./start-termux.sh
```

---

## ✅ Checklist النهائي

قبل أن تقول "تمام":

- [ ] تم push الكود من Windows
- [ ] تم pull الكود في Termux
- [ ] تم تثبيت كل التبعيات
- [ ] ملف `.env` يحتوي على `BOT_TOKEN`
- [ ] تم `chmod +x` للسكريبتات
- [ ] تم تشغيل `./fix-termux.sh`
- [ ] تم تشغيل `./start-termux.sh`
- [ ] `pm2 status` يُظهر كل الخدمات `online`
- [ ] `pm2 logs` لا يُظهر أخطاء Babel
- [ ] البوت يرد على `/start` في Telegram
- [ ] يمكن فتح الواجهة من `http://[IP]:5173`

**إذا كل النقاط صح → تمام! 🎉**

---

## 📚 مراجع إضافية

- **الدليل الكامل:** [`TERMUX_GUIDE.md`](TERMUX_GUIDE.md)
- **حل المشاكل:** [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md)
- **ملخص الإصلاحات:** [`FIXES_SUMMARY.md`](FIXES_SUMMARY.md)
- **الخطوات السريعة:** [`QUICK_FIX_AR.md`](QUICK_FIX_AR.md)
