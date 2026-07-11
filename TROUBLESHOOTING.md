# 🔧 حل المشاكل السريع (Troubleshooting)

## المشاكل التي تم إصلاحها

### ✅ 1. ETIMEDOUT Error في البوت

**الأعراض:**
```
Polling error: RequestError: Error: ETIMEDOUT
code: 'EFATAL'
```

**الحل المطبق:**
- إضافة timeout أطول (30 ثانية)
- إعادة اتصال تلقائية كل 5 ثواني
- معالجة أفضل للأخطاء

**لن تحتاج لفعل شيء - البوت يصلح نفسه تلقائياً!**

---

### ✅ 2. Babel Error في React Client

**الأعراض:**
```
at normalizeFile
at transform
ReferenceError: [BABEL] ... .tsx: Unknown option...
```

**الحل المطبق:**
- تعطيل Babel config في Vite
- إنشاء سكريبت مخصص `start-dev.sh`
- تحسين إعدادات Vite للعمل على Termux

---

## إذا استمرت المشاكل

### الطريقة السريعة:

```bash
chmod +x fix-termux.sh
./fix-termux.sh
./start-termux.sh
```

### الطريقة اليدوية:

```bash
# 1. إيقاف كل شيء
pm2 delete all
pm2 kill

# 2. تحرير المنافذ
kill -9 $(lsof -ti:3001) 2>/dev/null
kill -9 $(lsof -ti:5173) 2>/dev/null

# 3. تنظيف
rm -rf web/client/node_modules/.vite
rm -rf web/client/dist

# 4. إعادة التشغيل
./start-termux.sh
```

---

## فحص اللوجات

```bash
# كل اللوجات
pm2 logs

# البوت فقط
pm2 logs bot --lines 50

# الخادم فقط  
pm2 logs server --lines 50

# العميل فقط
pm2 logs client --lines 50
```

---

## الأخطاء الشائعة الأخرى

### "Cannot find module"
```bash
npm install
cd web/server && npm install && cd ../..
cd web/client && npm install && cd ../..
```

### "Permission denied"
```bash
chmod +x start-termux.sh
chmod +x fix-termux.sh
chmod +x web/client/start-dev.sh
```

### "Port already in use"
```bash
./fix-termux.sh
```

### "BOT_TOKEN is not set"
```bash
nano .env
# أضف: BOT_TOKEN=your_token_here
```

---

## التحقق من الحالة

```bash
# حالة الخدمات
pm2 status

# استخدام الذاكرة
pm2 monit

# معلومات النظام
pm2 info bot
```

---

## إعادة التشغيل الكاملة

```bash
pm2 restart all
```

أو لخدمة محددة:
```bash
pm2 restart bot
pm2 restart server
pm2 restart client
```

---

## الحصول على المساعدة

1. شغّل `pm2 logs` وانسخ الخطأ
2. تحقق من ملف `.env`
3. تأكد من الاتصال بالإنترنت
4. جرب `./fix-termux.sh`
