# ⚡ البدء السريع - Termux

## نسخ واحد - تشغيل كامل! 🚀

افتح **Termux** وانسخ هذه الأوامر:

```bash
pkg update -y && pkg install -y git nodejs
git clone https://github.com/ma76111/jjxx.git
cd jjxx
bash setup-termux.sh
```

**فقط!** السكريبت سيتولى كل شيء ✨

---

## ما سيحدث؟

السكريبت سيسألك عن:
1. **Bot Token** - احصل عليه من [@BotFather](https://t.me/BotFather)
2. **اسم البوت** - بدون @ مثل: `MyAwesomeBot`
3. **Telegram ID** - رقم حسابك [@userinfobot](https://t.me/userinfobot)
4. **Domain للويب** - اتركه فارغاً الآن، يمكن إضافته لاحقاً

بعدها سيبدأ التشغيل تلقائياً! 🎉

---

## بعد التشغيل

### ✅ التحقق من حالة البوت
```bash
pm2 status
```

### 📊 عرض اللوجات
```bash
pm2 logs
```

### 🌐 فتح الويب للعموم
```bash
bash start-tunnel.sh
```

### 🛠️ إدارة سريعة
```bash
bash manage.sh
```

---

## 🎯 أوامر سريعة

```bash
pm2 restart all    # إعادة تشغيل
pm2 stop all       # إيقاف
pm2 start all      # تشغيل
pm2 logs           # اللوجات
```

---

**📖 دليل كامل:** راجع `TERMUX_SETUP.md`

**🐛 مشاكل؟** شغل `pm2 logs` لرؤية الأخطاء
