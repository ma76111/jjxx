# 📱 دليل تشغيل البوت على Termux

## المتطلبات الأساسية

```bash
# تحديث الباكجات
pkg update && pkg upgrade -y

# تثبيت المتطلبات
pkg install nodejs git -y

# تثبيت PM2
npm install -g pm2
```

## التشغيل

### 1️⃣ الطريقة السهلة (موصى بها)

```bash
bash start-termux.sh
```

### 2️⃣ الطريقة اليدوية

```bash
# إيقاف أي عمليات قديمة
pm2 delete all

# الحصول على IP
IP=$(ip addr show wlan0 | grep "inet " | awk '{print $2}' | cut -d/ -f1 | head -n1)
echo "IP الخاص بك: $IP"

# تحديث ملفات الإعدادات
echo "CLIENT_ORIGIN=http://${IP}:5173" >> web/server/.env
echo "VITE_API_URL=http://${IP}:3001/api" >> web/client/.env

# تثبيت المكتبات
npm install
cd web/server && npm install && cd ../..
cd web/client && npm install && cd ../..

# تشغيل البوت
pm2 start index.js --name bot

# تشغيل الخادم
pm2 start web/server/index.js --name server

# تشغيل واجهة المستخدم
cd web/client
pm2 start npm --name client -- run dev -- --host 0.0.0.0
cd ../..

# حفظ القائمة
pm2 save

# عرض الحالة
pm2 status
```

## 🔧 حل المشاكل الشائعة

### مشكلة ETIMEDOUT في Telegram API

إذا ظهرت لك رسالة خطأ `ETIMEDOUT` أو `EFATAL`:

**السبب:** ضعف الاتصال أو قيود الشبكة

**الحل:**

1. تأكد من اتصالك بالإنترنت:
```bash
curl https://api.telegram.org
```

2. إذا كان الاتصال يعمل ولكن البوت لا يزال يواجه مشاكل، الكود محدّث تلقائياً للتعامل مع هذه الأخطاء

3. البوت سيعيد الاتصال تلقائياً عند حدوث أخطاء polling

### مشكلة Babel في العميل

إذا واجهت أخطاء Babel:

```bash
# حذف node_modules وإعادة التثبيت
cd web/client
rm -rf node_modules package-lock.json
npm install
cd ../..

# إعادة تشغيل العميل
pm2 restart client
```

### البوت لا يستجيب

```bash
# عرض السجلات
pm2 logs bot

# إعادة تشغيل البوت
pm2 restart bot
```

### الخادم لا يعمل

```bash
# عرض السجلات
pm2 logs server

# إعادة تشغيل الخادم
pm2 restart server
```

## 📊 مراقبة العمليات

```bash
# عرض الحالة
pm2 status

# عرض السجلات (كل العمليات)
pm2 logs

# عرض سجلات عملية معينة
pm2 logs bot
pm2 logs server
pm2 logs client

# مراقبة لحظية
pm2 monit
```

## 🛑 إيقاف البوت

```bash
# إيقاف كل العمليات
pm2 stop all

# أو حذفها تماماً
pm2 delete all
```

## 🌐 الوصول للواجهة

بعد التشغيل، افتح المتصفح على:

```
http://[IP_الخاص_بك]:5173
```

يمكنك معرفة IP الخاص بك من:
```bash
ip addr show wlan0 | grep "inet "
```

## 💡 نصائح

1. **استخدم Termux:Wake Lock** لمنع توقف العمليات عند قفل الشاشة
2. **قم بحفظ جلسة PM2** بعد أي تغييرات: `pm2 save`
3. **راقب استهلاك الموارد** باستخدام: `pm2 monit`
4. **قم بعمل backup للقاعدة** بانتظام: `cp bot.db bot_backup.db`

## 🔄 التحديثات

```bash
# سحب آخر التحديثات
git pull

# إعادة تثبيت المكتبات إذا لزم الأمر
npm install
cd web/server && npm install && cd ../..
cd web/client && npm install && cd ../..

# إعادة تشغيل كل شيء
pm2 restart all
```
