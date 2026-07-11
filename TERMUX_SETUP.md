# 📱 تشغيل البوت على Termux (Android)

## 📋 المتطلبات

1. **Termux** - [تحميل من F-Droid](https://f-droid.org/en/packages/com.termux/)
   - ⚠️ **مهم**: لا تستخدم نسخة Google Play (قديمة ومعطلة)
   - استخدم نسخة F-Droid فقط

2. **مساحة تخزين**: حوالي 500MB
3. **RAM**: 2GB على الأقل

---

## 🚀 الإعداد الأولي (مرة واحدة)

### 1. افتح Termux وشغل:

```bash
# منح صلاحية الوصول للملفات
termux-setup-storage

# تحديث الباكجات
pkg update -y && pkg upgrade -y

# تثبيت Node.js و Git
pkg install nodejs git -y

# تثبيت PM2
npm install -g pm2

# تثبيت LocalTunnel
npm install -g localtunnel
```

### 2. انتقل لمجلد المشروع:

```bash
# إذا المشروع في التخزين الداخلي
cd ~/storage/shared/your-project-folder

# أو clone من GitHub
git clone <your-repo-url>
cd referral-bot
```

### 3. اجعل السكريبتات قابلة للتنفيذ:

```bash
chmod +x setup-termux.sh
chmod +x start-termux.sh
chmod +x stop-termux.sh
chmod +x restart-termux.sh
```

### 4. شغل الإعداد:

```bash
./setup-termux.sh
```

---

## ▶️ تشغيل البوت

### الطريقة البسيطة:

```bash
./start-termux.sh
```

هذا السكريبت يقوم بـ:
- ✅ التحقق من Node.js و PM2
- ✅ تثبيت التبعيات
- ✅ بناء الموقع
- ✅ تشغيل البوت
- ✅ تشغيل خادم الويب
- ✅ تشغيل LocalTunnel
- ✅ حفظ التكوين

### الوصول للموقع:

#### محلياً:
```
http://localhost:3001
```

#### عبر الإنترنت:
```
https://vLa69OimVSeyqfnhYcW5zPsU2T7ENjGtg.loca.lt
```

⚠️ **أول مرة**: اضغط "Click to Continue" في صفحة LocalTunnel

---

## 🎛️ إدارة الخدمات

### عرض الحالة:
```bash
pm2 list
```

### عرض اللوجات:
```bash
pm2 logs

# أو لخدمة معينة
pm2 logs referral-bot
pm2 logs web-server
pm2 logs localtunnel
```

### إعادة التشغيل:
```bash
# كل الخدمات
./restart-termux.sh

# أو يدوياً
pm2 restart all
pm2 restart referral-bot
```

### إيقاف الخدمات:
```bash
./stop-termux.sh

# أو يدوياً
pm2 stop all
```

### حذف جميع العمليات:
```bash
pm2 delete all
```

---

## 🔧 حل المشاكل

### المشكلة: LocalTunnel لا يعمل

```bash
# حذف وإعادة تثبيت
npm uninstall -g localtunnel
npm install -g localtunnel

# إعادة تشغيل
pm2 restart localtunnel
```

### المشكلة: "Permission denied"

```bash
# اجعل السكريبتات قابلة للتنفيذ
chmod +x *.sh
```

### المشكلة: نفد الرام

```bash
# أوقف العمليات غير المستخدمة
pm2 stop localtunnel  # إذا لا تحتاج الوصول العام

# أو استخدم mode production
export NODE_ENV=production
```

### المشكلة: البوت لا يرد

```bash
# افحص اللوجات
pm2 logs referral-bot --lines 50

# تأكد من BOT_TOKEN في .env
cat .env | grep BOT_TOKEN
```

### المشكلة: قاعدة البيانات مقفلة

```bash
# أوقف كل العمليات
pm2 stop all

# احذف ملفات القفل
rm -f bot.db-shm bot.db-wal

# أعد التشغيل
./start-termux.sh
```

---

## 🔄 التحديثات

```bash
# إيقاف الخدمات
./stop-termux.sh

# سحب آخر تحديثات (إذا من Git)
git pull

# تحديث التبعيات
npm install
cd web/server && npm install && cd ../..
cd web/client && npm install && cd ../..

# إعادة بناء الموقع
cd web/client && npm run build && cd ../..

# إعادة التشغيل
./start-termux.sh
```

---

## 💾 النسخ الاحتياطي

### نسخ احتياطي يدوي:

```bash
# نسخ قاعدة البيانات
cp bot.db ~/storage/shared/bot-backup-$(date +%Y%m%d).db

# أو استخدم السكريبت الموجود
node backup_to_github.js
```

---

## 🌐 استخدام نطاق مخصص (اختياري)

بدلاً من LocalTunnel، يمكنك استخدام:

### 1. Ngrok:
```bash
# تثبيت
npm install -g ngrok

# تشغيل
ngrok http 3001
```

### 2. Serveo:
```bash
# لا يحتاج تثبيت
ssh -R 80:localhost:3001 serveo.net
```

### 3. Cloudflare Tunnel:
```bash
# تثبيت
pkg install cloudflared

# تشغيل
cloudflared tunnel --url http://localhost:3001
```

---

## ⚡ نصائح للأداء

### 1. تقليل استهلاك RAM:

```bash
# في .env
NODE_ENV=production
```

### 2. منع Termux من النوم:

- اذهب لإعدادات الجهاز
- Battery → App Battery Usage
- Termux → Don't optimize

### 3. استخدام Termux:Boot:

تطبيق يشغل البوت تلقائياً عند إعادة تشغيل الجهاز:

```bash
# تثبيت Termux:Boot من F-Droid
# ثم انشئ:
mkdir -p ~/.termux/boot
nano ~/.termux/boot/start-bot.sh
```

محتوى الملف:
```bash
#!/data/data/com.termux/files/usr/bin/bash
cd ~/your-project-path
./start-termux.sh
```

---

## 📊 مراقبة الأداء

```bash
# عرض استهلاك الموارد
pm2 monit

# أو باستخدام top
top

# حجم قاعدة البيانات
du -h bot.db
```

---

## 🛡️ الأمان

### 1. تأمين LocalTunnel:

LocalTunnel عام بالكامل! لذلك:
- ✅ استخدم JWT_SECRET قوي
- ✅ فعّل rate limiting
- ✅ لا تشارك الرابط علناً

### 2. جدار ناري:

```bash
# Termux لا يحتاج جدار ناري (محمي بواسطة Android)
# لكن تأكد من تحديث الباكجات
pkg upgrade
```

---

## 📝 أوامر سريعة

```bash
# تشغيل
./start-termux.sh

# إيقاف
./stop-termux.sh

# إعادة تشغيل
./restart-termux.sh

# حالة الخدمات
pm2 list

# اللوجات المباشرة
pm2 logs

# حذف الكل
pm2 delete all
```

---

## 🆘 الدعم

إذا واجهت مشاكل:

1. افحص اللوجات: `pm2 logs`
2. افحص حالة الخدمات: `pm2 list`
3. أعد تشغيل الخدمات: `./restart-termux.sh`
4. تأكد من ملفات .env صحيحة

---

## ✅ Checklist قبل التشغيل

- [ ] تثبيت Termux من F-Droid
- [ ] تشغيل `termux-setup-storage`
- [ ] تثبيت Node.js: `pkg install nodejs`
- [ ] تثبيت PM2: `npm install -g pm2`
- [ ] تثبيت LocalTunnel: `npm install -g localtunnel`
- [ ] إعداد ملفات `.env` (البوت والخادم والعميل)
- [ ] تشغيل: `./start-termux.sh`
- [ ] فتح الرابط: `https://vLa69OimVSeyqfnhYcW5zPsU2T7ENjGtg.loca.lt`

---

**تم بواسطة: Kiro AI** 📱
