# 🚀 البدء السريع (Quick Start)

## 📥 بعد تنزيل المشروع

### 1️⃣ تنزيل المشروع
```bash
git clone https://github.com/ma76111/jjxx.git
cd jjxx
```

### 2️⃣ تشغيل سكريبت الإعداد

#### على Windows:
```bash
bash setup.sh
```

#### على Termux:
```bash
chmod +x setup.sh
./setup.sh
```

#### على Linux/Mac:
```bash
chmod +x setup.sh
./setup.sh
```

---

## 🤖 ما سيطلبه السكريبت منك:

### 1. **BOT_TOKEN** (مطلوب)
- افتح: [@BotFather](https://t.me/BotFather)
- أرسل: `/newbot`
- اتبع التعليمات
- انسخ الـ Token

### 2. **BOT_NAME** (مطلوب)
- username البوت (بدون @)
- مثال: `my_referral_bot`

### 3. **MAIN_ADMIN_ID** (مطلوب)
- Telegram User ID الخاص بك
- احصل عليه من: [@userinfobot](https://t.me/userinfobot)
- أرسل `/start` وسيعطيك ID

### 4. **ADMIN_IDS** (اختياري)
- IDs للأدمنز الإضافيين
- افصل بفاصلة: `123456,789012`

### 5. **JWT_SECRET**
- سيتم توليده تلقائياً ✅

### 6. **Binance API** (اختياري)
- للتحقق التلقائي من الإيداعات
- يمكنك تخطيه الآن

### 7. **GitHub Backup** (اختياري)
- للنسخ الاحتياطي التلقائي
- يمكنك تخطيه الآن

---

## ✅ بعد انتهاء الإعداد

### تشغيل المشروع:

#### Windows:
```bash
start.bat
```

#### Termux:
```bash
chmod +x start-termux.sh
./start-termux.sh
```

#### Linux/Mac (PM2):
```bash
pm2 start ecosystem.config.cjs
pm2 logs
```

---

## 🌐 الوصول للوحة التحكم

### من نفس الجهاز:
```
http://localhost:5173
```

### من جهاز آخر (Termux):
```
http://YOUR_LOCAL_IP:5173
```
السكريبت سيعطيك الـ IP التلقائي

---

## 🆘 مشاكل شائعة

### المشكلة: "command not found: bash"
**على Termux:**
```bash
pkg install bash
```

### المشكلة: "Node.js not found"
**على Termux:**
```bash
pkg install nodejs
```

**على Ubuntu/Debian:**
```bash
sudo apt install nodejs npm
```

### المشكلة: "Permission denied"
```bash
chmod +x setup.sh
chmod +x start-termux.sh
```

---

## 📝 ملاحظات

- ✅ ملفات `.env` ستُنشأ تلقائياً
- ✅ التبعيات ستُثبت تلقائياً
- ✅ قاعدة البيانات ستُنشأ عند أول تشغيل
- ✅ الإعدادات يمكن تعديلها لاحقاً في ملفات `.env`

---

## 🔄 إعادة الإعداد

إذا أردت تغيير الإعدادات:

```bash
# امسح ملفات .env القديمة
rm .env web/server/.env web/client/.env

# شغل setup مرة أخرى
./setup.sh
```

---

**جاهز للتشغيل! 🚀**
