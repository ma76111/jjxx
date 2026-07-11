# 🚀 دليل تشغيل البوت على Termux

## 📋 المتطلبات
- هاتف Android مع تطبيق Termux مثبت
- مساحة تخزين 500MB على الأقل
- اتصال إنترنت مستقر

## ⚡ التثبيت السريع (طريقة واحدة)

### 1️⃣ افتح Termux وقم بتشغيل:

```bash
# تحديث Termux
pkg update -y && pkg upgrade -y

# تثبيت Git
pkg install -y git

# استنساخ المشروع
git clone https://github.com/ma76111/jjxx.git
cd jjxx

# تشغيل سكريبت الإعداد
bash setup-termux.sh
```

### 2️⃣ اتبع التعليمات على الشاشة:
السكريبت سيطلب منك:
- 🤖 **Bot Token** من @BotFather
- 📛 **اسم البوت** (بدون @)
- 👤 **Telegram ID** للمشرف الرئيسي
- 👥 **IDs المشرفين** (مفصولة بفاصلة)
- 🔑 **Binance API** (اختياري - اضغط Enter للتخطي)
- 📂 **GitHub Token** (اختياري - للنسخ الاحتياطي)
- 🌍 **Domain المؤقت** للوصول للويب

### 3️⃣ الانتظار حتى اكتمال التثبيت
السكريبت سيقوم بـ:
- ✅ تثبيت Node.js و SQLite
- ✅ تثبيت PM2 لإدارة العمليات
- ✅ تثبيت جميع حزم المشروع
- ✅ بناء واجهة الويب
- ✅ إعداد قاعدة البيانات
- ✅ تشغيل البوت والخادم تلقائياً

---

## 🎯 طرق التشغيل

### الطريقة 1: التثبيت الكامل التلقائي
```bash
bash setup-termux.sh --auto
```

### الطريقة 2: القائمة التفاعلية
```bash
bash setup-termux.sh
```
ثم اختر:
- `1` للتثبيت الكامل (أول مرة)
- `2` لتحديث الإعدادات فقط
- `4` لبدء الخدمات

---

## 🌐 فتح الويب للعموم

### باستخدام LocalTunnel (الأسهل)
```bash
bash start-tunnel.sh
```
اختر الخيار `1` وأدخل اسم فرعي مخصص

### يدوياً:
```bash
# تثبيت LocalTunnel
npm install -g localtunnel

# فتح نفق على المنفذ 3001
lt --port 3001 --subdomain your-custom-name
```

سيعطيك رابط مثل:
```
https://your-custom-name.loca.lt
```

### ⚠️ مهم: تحديث ملف .env للويب
بعد الحصول على الرابط، قم بتحديث:
```bash
nano web/client/.env
```
غير `VITE_API_URL` إلى الرابط الخاص بك:
```
VITE_API_URL=https://your-custom-name.loca.lt/api
```

ثم أعد بناء الواجهة:
```bash
cd web/client
npm run build
cd ../..
pm2 restart web-server
```

---

## 🛠️ إدارة البوت

### استخدام سكريبت الإدارة السريع
```bash
bash manage.sh
```

### أوامر PM2 المباشرة

#### عرض حالة الخدمات
```bash
pm2 status
```

#### عرض اللوجات المباشرة
```bash
pm2 logs                    # كل الخدمات
pm2 logs telegram-bot       # البوت فقط
pm2 logs web-server        # الخادم فقط
```

#### إعادة تشغيل
```bash
pm2 restart all            # كل الخدمات
pm2 restart telegram-bot   # البوت فقط
pm2 restart web-server     # الخادم فقط
```

#### إيقاف الخدمات
```bash
pm2 stop all               # إيقاف الكل
pm2 stop telegram-bot      # إيقاف البوت
```

#### بدء الخدمات
```bash
pm2 start all              # تشغيل الكل
pm2 start telegram-bot     # تشغيل البوت
```

#### حذف الخدمات من PM2
```bash
pm2 delete all             # حذف الكل
```

#### مسح اللوجات
```bash
pm2 flush                  # مسح كل اللوجات
```

---

## 🔄 تحديث الكود

### من GitHub
```bash
git pull origin main
npm install
cd web/server && npm install && cd ../..
cd web/client && npm install && npm run build && cd ../..
pm2 restart all
```

### باستخدام سكريبت الإدارة
```bash
bash manage.sh
# اختر 7 (تحديث الكود)
```

---

## 💾 النسخ الاحتياطي

### نسخ احتياطي يدوي
```bash
timestamp=$(date +%Y%m%d_%H%M%S)
mkdir -p backups
cp bot.db "backups/bot_${timestamp}.db"
```

### باستخدام سكريبت الإدارة
```bash
bash manage.sh
# اختر 6 (نسخ احتياطي)
```

### النسخ الاحتياطي التلقائي
البوت يقوم بـ:
- ✅ نسخ محلي كل 30 دقيقة
- ✅ رفع إلى GitHub كل يوم (إذا تم إعداده)

---

## 🐛 حل المشاكل

### البوت لا يستجيب
```bash
pm2 logs telegram-bot
```
تحقق من:
- ✅ Bot Token صحيح
- ✅ الاتصال بالإنترنت
- ✅ لا توجد أخطاء في اللوج

### الويب لا يعمل
```bash
pm2 logs web-server
```
تحقق من:
- ✅ المنفذ 3001 متاح
- ✅ تم بناء الواجهة `npm run build`
- ✅ ملف .env موجود في web/client

### "Cannot find module"
```bash
npm install
cd web/server && npm install && cd ../..
cd web/client && npm install && cd ../..
pm2 restart all
```

### قاعدة البيانات تالفة
```bash
pm2 stop all
rm bot.db bot.db-shm bot.db-wal
pm2 start all
# سيتم إنشاء قاعدة بيانات جديدة
```

### إعادة التثبيت الكامل
```bash
pm2 delete all
rm -rf node_modules web/server/node_modules web/client/node_modules
rm -rf web/client/dist
bash setup-termux.sh
```

---

## 📱 نصائح لـ Termux

### منع Termux من النوم
1. افتح إعدادات Android
2. البطارية → تحسين استخدام البطارية
3. ابحث عن Termux وأوقف التحسين

### الحصول على Wake Lock
```bash
termux-wake-lock
```

### إزالة Wake Lock
```bash
termux-wake-unlock
```

### تشغيل Termux في الخلفية
استخدم PM2 - سيعمل البوت حتى لو أغلقت Termux

### الوصول للملفات من مدير الملفات
```bash
termux-setup-storage
```

---

## 🌟 مميزات السكريبتات

### `setup-termux.sh`
- ✅ تثبيت تلقائي كامل
- ✅ إعداد تفاعلي للإعدادات
- ✅ قائمة متعددة الخيارات
- ✅ بناء واجهة الويب
- ✅ إنشاء ملف PM2 config
- ✅ تثبيت LocalTunnel

### `start-tunnel.sh`
- ✅ 3 خيارات للنفق العام
- ✅ LocalTunnel (سهل ومجاني)
- ✅ Serveo (SSH tunnel)
- ✅ Ngrok (احترافي)

### `manage.sh`
- ✅ إدارة سريعة
- ✅ عرض الحالة والذاكرة
- ✅ إدارة اللوجات
- ✅ نسخ احتياطي سريع
- ✅ تحديث تلقائي من GitHub

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من اللوجات: `pm2 logs`
2. راجع قسم حل المشاكل أعلاه
3. تأكد من صحة ملف `.env`
4. أعد التثبيت إذا لزم الأمر

---

## 🎉 الخلاصة

بعد التثبيت، سيكون لديك:
- ✅ بوت تليجرام يعمل 24/7
- ✅ لوحة تحكم ويب
- ✅ إدارة سهلة عبر PM2
- ✅ نسخ احتياطي تلقائي
- ✅ لوجات منظمة
- ✅ إمكانية الوصول العام للويب

---

**ملاحظة:** لا تنسَ الحفاظ على شحن هاتفك واتصاله بالإنترنت لضمان عمل البوت بشكل مستمر! 📱⚡
