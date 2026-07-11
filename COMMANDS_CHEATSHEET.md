# 📋 ورقة غش الأوامر السريعة

## 🚀 التثبيت على Termux

```bash
# تثبيت سريع - أمر واحد
pkg update -y && pkg install -y git nodejs && git clone https://github.com/ma76111/jjxx.git && cd jjxx && bash setup-termux.sh
```

---

## 🎯 أوامر PM2 الأساسية

### الحالة والمراقبة
```bash
pm2 status              # عرض حالة جميع العمليات
pm2 list                # نفس الأمر أعلاه
pm2 monit               # واجهة مراقبة تفاعلية
pm2 describe bot-name   # تفاصيل عملية محددة
```

### اللوجات
```bash
pm2 logs                      # كل اللوجات (مباشر)
pm2 logs telegram-bot         # البوت فقط
pm2 logs web-server           # الخادم فقط
pm2 logs --lines 100          # آخر 100 سطر
pm2 logs --err                # الأخطاء فقط
pm2 flush                     # مسح كل اللوجات
```

### التحكم
```bash
pm2 start ecosystem.config.cjs    # تشغيل من ملف config
pm2 start all                     # تشغيل الكل
pm2 restart all                   # إعادة تشغيل الكل
pm2 reload all                    # إعادة تحميل بدون توقف
pm2 stop all                      # إيقاف الكل
pm2 delete all                    # حذف الكل من PM2
```

### عمليات محددة
```bash
pm2 restart telegram-bot    # إعادة تشغيل البوت
pm2 stop telegram-bot       # إيقاف البوت
pm2 start telegram-bot      # تشغيل البوت
pm2 delete telegram-bot     # حذف البوت
```

### الحفظ والاستعادة
```bash
pm2 save                # حفظ قائمة العمليات
pm2 resurrect           # استعادة العمليات المحفوظة
pm2 startup             # إعداد بدء تلقائي عند التشغيل
pm2 unstartup           # إزالة بدء تلقائي
```

---

## 🌐 فتح نفق عام

### LocalTunnel (الأسهل)
```bash
# تثبيت
npm install -g localtunnel

# تشغيل
lt --port 3001                           # عشوائي
lt --port 3001 --subdomain mybot         # مخصص
```

### Serveo (SSH)
```bash
ssh -R 80:localhost:3001 serveo.net           # عشوائي
ssh -R mybot:80:localhost:3001 serveo.net     # مخصص
```

### Ngrok
```bash
# تثبيت من ngrok.com
ngrok config add-authtoken YOUR_TOKEN
ngrok http 3001
```

---

## 📦 إدارة الحزم

### تثبيت/تحديث
```bash
# Root packages
npm install
npm update

# Web Server
cd web/server && npm install && cd ../..

# Web Client
cd web/client && npm install && cd ../..
```

### بناء الواجهة
```bash
cd web/client
npm run build           # بناء للإنتاج
npm run dev             # تشغيل dev server
cd ../..
```

---

## 🗄️ إدارة قاعدة البيانات

### النسخ الاحتياطي
```bash
# يدوي
cp bot.db backups/bot_$(date +%Y%m%d_%H%M%S).db

# باستخدام السكريبت
bash manage.sh  # اختر 6
```

### استعادة
```bash
pm2 stop all
cp backups/bot_XXXXXX.db bot.db
pm2 start all
```

### إعادة تعيين (⚠️ حذف كل البيانات)
```bash
pm2 stop all
rm bot.db bot.db-shm bot.db-wal
node index.js  # سيعيد إنشاء القاعدة
# أو
pm2 start all
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

### باستخدام السكريبت
```bash
bash manage.sh  # اختر 7
```

---

## 🧹 التنظيف

### مسح اللوجات
```bash
pm2 flush               # PM2 logs
rm -f logs/*.log        # ملفات اللوج
bash manage.sh          # اختر 8
```

### مسح node_modules
```bash
rm -rf node_modules
rm -rf web/server/node_modules
rm -rf web/client/node_modules
npm install
cd web/server && npm install && cd ../..
cd web/client && npm install && cd ../..
```

### مسح dist
```bash
rm -rf web/client/dist
cd web/client && npm run build && cd ../..
```

---

## 🛠️ سكريبتات المشروع

### setup-termux.sh
```bash
bash setup-termux.sh        # قائمة تفاعلية
bash setup-termux.sh --auto # تثبيت تلقائي كامل
```

### start-tunnel.sh
```bash
bash start-tunnel.sh
# اختر:
# 1 - LocalTunnel
# 2 - Serveo
# 3 - Ngrok
```

### manage.sh
```bash
bash manage.sh
# الخيارات:
# 1 - حالة الخدمات
# 2 - عرض اللوجات
# 3 - إعادة تشغيل
# 4 - إيقاف الخدمات
# 5 - تشغيل الخدمات
# 6 - نسخ احتياطي
# 7 - تحديث الكود
# 8 - تنظيف اللوجات
# 9 - فتح نفق عام
```

---

## 🐛 حل المشاكل السريع

### البوت لا يعمل
```bash
pm2 logs telegram-bot          # شاهد الأخطاء
pm2 restart telegram-bot       # إعادة تشغيل
cat .env                       # تحقق من BOT_TOKEN
```

### الويب لا يعمل
```bash
pm2 logs web-server            # شاهد الأخطاء
pm2 restart web-server         # إعادة تشغيل
cat web/client/.env            # تحقق من VITE_API_URL
```

### "Module not found"
```bash
npm install
cd web/server && npm install && cd ../..
cd web/client && npm install && cd ../..
pm2 restart all
```

### قاعدة البيانات تالفة
```bash
pm2 stop all
# استعد من نسخة احتياطية
cp backups/bot_latest.db bot.db
pm2 start all
```

### Port already in use
```bash
# ابحث عن العملية
lsof -i :3001
# أو
netstat -tlnp | grep 3001

# اقتل العملية
kill -9 PID
```

---

## 📱 أوامر Termux مفيدة

### إدارة الطاقة
```bash
termux-wake-lock        # منع النوم
termux-wake-unlock      # السماح بالنوم
```

### الوصول للتخزين
```bash
termux-setup-storage    # منح صلاحية الوصول للملفات
```

### تحديث Termux
```bash
pkg update && pkg upgrade
```

### تنظيف Termux
```bash
pkg clean
apt autoremove
```

---

## 🔑 متغيرات البيئة المهمة

### .env (البوت)
```bash
BOT_TOKEN=              # من @BotFather
BOT_NAME=               # اسم البوت
MAIN_ADMIN_ID=          # Telegram ID
ADMIN_IDS=              # IDs مفصولة بفاصلة
```

### web/server/.env
```bash
BOT_TOKEN=              # نفس token البوت
JWT_SECRET=             # مفتاح عشوائي طويل
WEB_PORT=3001           # منفذ الخادم
```

### web/client/.env
```bash
VITE_BOT_NAME=          # اسم البوت
VITE_API_URL=           # عنوان API
```

---

## 📊 مراقبة الأداء

### استخدام الذاكرة
```bash
pm2 list                # الذاكرة لكل عملية
pm2 monit               # واجهة مراقبة مباشرة
```

### استخدام المعالج
```bash
top                     # كل العمليات
htop                    # إذا كان مثبتاً
```

### مساحة القرص
```bash
df -h                   # المساحة العامة
du -sh .                # حجم المشروع
du -sh backups/         # حجم النسخ الاحتياطية
```

---

## 🎯 اختصارات مفيدة

### إعادة تشغيل سريعة
```bash
pm2 restart all && pm2 logs
```

### تحديث كامل
```bash
git pull && npm install && cd web/server && npm install && cd ../client && npm install && npm run build && cd ../.. && pm2 restart all
```

### نسخ احتياطي سريع
```bash
cp bot.db backups/bot_backup_$(date +%Y%m%d_%H%M%S).db && echo "✅ تم النسخ"
```

### عرض آخر 50 سطر من اللوج
```bash
pm2 logs --lines 50 --nostream
```

---

## 🆘 طلب المساعدة

إذا واجهت مشكلة:

1. **تحقق من اللوجات:**
   ```bash
   pm2 logs
   ```

2. **تحقق من الحالة:**
   ```bash
   pm2 status
   ```

3. **أعد التشغيل:**
   ```bash
   pm2 restart all
   ```

4. **اقرأ التوثيق:**
   - [QUICKSTART_TERMUX.md](./QUICKSTART_TERMUX.md)
   - [TERMUX_SETUP.md](./TERMUX_SETUP.md)
   - [FEATURES_AR.md](./FEATURES_AR.md)

---

**💡 نصيحة:** احفظ هذا الملف في المفضلة للرجوع إليه سريعاً!
