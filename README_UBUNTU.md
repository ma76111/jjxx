# 🚀 دليل التشغيل على Ubuntu/Linux

## 📋 **المتطلبات:**
- Ubuntu 20.04+ / Debian 10+ / أي Linux
- صلاحيات sudo

---

## ⚡ **التشغيل السريع (خطوة واحدة):**

### 1️⃣ **التثبيت الأول:**
```bash
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh
```

### 2️⃣ **التشغيل على الإنترنت:**
```bash
./deploy-ubuntu.sh
```

**خلاص! هيطلع لك الرابط العام** 🎉

---

## 🛠️ **السكريبتات المتاحة:**

### `setup-ubuntu.sh` - التثبيت
- يثبت Node.js (لو مش موجود)
- يثبت LocalTunnel
- ينزل كل node_modules (bot + server + client)
- يجهز كل حاجة

**الاستخدام:**
```bash
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh
```

---

### `deploy-ubuntu.sh` - التشغيل على الإنترنت
- يشغل البوت
- يشغل Web Server
- يشغل Web Client
- ينشئ tunnel ويطلع لك رابط عام

**الاستخدام:**
```bash
./deploy-ubuntu.sh
```

**النتيجة:**
```
📡 Public URL: https://mybot-XXXX.loca.lt
💻 Local URL:  http://localhost:5173
```

---

### `start-local-ubuntu.sh` - التشغيل المحلي
- يشغل كل حاجة محلياً (بدون tunnel)
- للتطوير والاختبار

**الاستخدام:**
```bash
./start-local-ubuntu.sh
```

---

### `stop-ubuntu.sh` - إيقاف كل شيء
- يوقف كل الخدمات
- ينظف الـ ports
- يمسح الـ logs

**الاستخدام:**
```bash
./stop-ubuntu.sh
```

---

## 📊 **عرض الـ Logs:**

```bash
# Bot logs
tail -f /tmp/bot.log

# Server logs
tail -f /tmp/server.log

# Client logs
tail -f /tmp/client.log

# Tunnel logs
tail -f /tmp/tunnel.log

# كل الـ logs مع بعض
tail -f /tmp/*.log
```

---

## 🔧 **استكشاف الأخطاء:**

### المشكلة: "Permission denied"
**الحل:**
```bash
chmod +x *.sh
```

### المشكلة: "Port already in use"
**الحل:**
```bash
./stop-ubuntu.sh
# ثم شغل تاني
./deploy-ubuntu.sh
```

### المشكلة: "Node.js not found"
**الحل:**
```bash
# التثبيت اليدوي
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### المشكلة: "npm: command not found"
**الحل:**
```bash
sudo apt-get install -y npm
```

---

## 🎯 **الملخص السريع:**

```bash
# تثبيت لأول مرة
./setup-ubuntu.sh

# تشغيل على الإنترنت
./deploy-ubuntu.sh

# تشغيل محلي
./start-local-ubuntu.sh

# إيقاف
./stop-ubuntu.sh
```

---

## 📱 **مشاركة الموقع:**

بعد تشغيل `deploy-ubuntu.sh` هيطلع لك:
```
https://mybot-XXXX.loca.lt
```

**شير الرابط ده مع أي حد! 🎉**

---

## 💡 **نصائح:**

1. **للتطوير:** استخدم `start-local-ubuntu.sh`
2. **للإنتاج:** استخدم `deploy-ubuntu.sh`
3. **الـ Logs:** موجودة في `/tmp/`
4. **الإيقاف:** دايماً استخدم `stop-ubuntu.sh`

---

## 🔐 **ملاحظات أمنية:**

- غيّر `JWT_SECRET` في `web/server/.env`
- غيّر `BOT_TOKEN` لو كان مكشوف
- املأ `ADMIN_IDS` في `.env`
- لا ترفع `.env` files على Git

---

## 🚀 **استمتع!**

الموقع شغال على Linux بكفاءة عالية! 🐧
