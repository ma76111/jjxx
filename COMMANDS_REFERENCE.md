# 🔧 مرجع الأوامر السريع

## أوامر تيرمكس الأساسية

### التثبيت الأولي
```bash
pkg update && pkg upgrade
pkg install nodejs git python
npm install -g pm2
```

### إدارة المشروع

#### التشغيل
```bash
./start-termux.sh                    # تشغيل كل الخدمات
```

#### الإصلاح
```bash
./fix-termux.sh                      # إصلاح المشاكل الشائعة
```

#### التحديث
```bash
pm2 stop all                         # إيقاف مؤقت
git pull                             # سحب آخر تحديثات
npm install                          # تحديث التبعيات
./start-termux.sh                    # إعادة التشغيل
```

---

## أوامر PM2

### الحالة والمراقبة
```bash
pm2 status                           # عرض حالة الخدمات
pm2 monit                            # مراقبة حية للموارد
pm2 logs                             # كل اللوجات مباشرة
pm2 logs bot                         # لوجات البوت فقط
pm2 logs server                      # لوجات الخادم فقط
pm2 logs client                      # لوجات العميل فقط
pm2 logs --lines 50                  # آخر 50 سطر
pm2 flush                            # مسح كل اللوجات
```

### التحكم
```bash
pm2 restart all                      # إعادة تشغيل الكل
pm2 restart bot                      # إعادة تشغيل البوت فقط
pm2 stop all                         # إيقاف مؤقت للكل
pm2 stop bot                         # إيقاف البوت فقط
pm2 delete all                       # حذف كل الخدمات
pm2 kill                             # إيقاف PM2 نفسه
```

### الحفظ والاستعادة
```bash
pm2 save                             # حفظ القائمة الحالية
pm2 resurrect                        # استعادة آخر قائمة محفوظة
pm2 startup                          # تشغيل تلقائي عند الإقلاع
```

### معلومات تفصيلية
```bash
pm2 info bot                         # معلومات البوت
pm2 describe bot                     # وصف مفصل
pm2 show bot                         # نفس describe
```

---

## أوامر Git

### التحديث
```bash
git status                           # حالة الملفات
git pull                             # سحب آخر تحديثات
git pull origin main                 # سحب من main محدد
```

### الحفظ والرفع (من Windows)
```bash
git add .                            # إضافة كل التغييرات
git commit -m "message"              # حفظ مع رسالة
git push                             # رفع للريبو
git push origin main                 # رفع لـ main محدد
```

### التحقق
```bash
git log --oneline -5                 # آخر 5 commits
git diff                             # الفروقات الحالية
git branch                           # عرض الفروع
```

---

## أوامر تنظيف Termux

### تحرير المنافذ
```bash
# فحص المنافذ المستخدمة
lsof -ti:3001                        # منفذ الخادم
lsof -ti:5173                        # منفذ العميل

# قتل العمليات على المنافذ
kill -9 $(lsof -ti:3001)
kill -9 $(lsof -ti:5173)

# قتل كليهما
kill -9 $(lsof -ti:3001,5173) 2>/dev/null
```

### تنظيف الملفات المؤقتة
```bash
# حذف cache الـ Vite
rm -rf web/client/node_modules/.vite

# حذف build السابق
rm -rf web/client/dist

# حذف كل node_modules (إذا لزم الأمر)
rm -rf node_modules
rm -rf web/server/node_modules
rm -rf web/client/node_modules
```

### إعادة تثبيت التبعيات
```bash
npm install
cd web/server && npm install && cd ../..
cd web/client && npm install && cd ../..
```

---

## أوامر فحص النظام

### معلومات الشبكة
```bash
# عرض IP
ip addr show wlan0 | grep "inet "
ip route get 1 | awk '{print $7; exit}'

# فحص الاتصال
ping -c 3 google.com
curl -I https://api.telegram.org
```

### معلومات النظام
```bash
# الذاكرة
free -h

# المساحة
df -h

# المعالج
top -n 1

# الإصدارات
node --version
npm --version
pm2 --version
git --version
```

---

## أوامر NPM

### إدارة الحزم
```bash
npm install                          # تثبيت من package.json
npm install <package>                # تثبيت حزمة معينة
npm install -g <package>             # تثبيت عام (global)
npm update                           # تحديث الحزم
npm outdated                         # الحزم القديمة
```

### تنظيف
```bash
npm cache clean --force              # مسح الكاش
npm cache verify                     # التحقق من الكاش
```

---

## أوامر قواعد البيانات

### SQLite (البوت)
```bash
# فتح قاعدة البيانات
sqlite3 bot.db

# في SQLite shell
.tables                              # عرض الجداول
SELECT * FROM users LIMIT 5;         # عرض 5 مستخدمين
.quit                                # الخروج
```

### النسخ الاحتياطي
```bash
# نسخ قاعدة البيانات
cp bot.db bot_backup_$(date +%Y%m%d).db

# عرض النسخ الاحتياطية
ls -lh backups/
```

---

## أوامر الأذونات

```bash
# تعيين أذونات التنفيذ
chmod +x file.sh

# تعيين أذونات القراءة والكتابة
chmod 644 file.txt

# تعيين أذونات كاملة
chmod 755 script.sh

# تعيين متكرر (للمجلد وما بداخله)
chmod -R 755 folder/
```

---

## سكريبتات المشروع الجاهزة

```bash
./start-termux.sh                    # تشغيل كامل المشروع
./fix-termux.sh                      # إصلاح المشاكل
./setup.sh                           # إعداد أولي (Linux)
./start.bat                          # تشغيل على Windows
node reset_bot.js                    # إعادة تعيين قاعدة البيانات
node backup_to_github.js             # نسخ احتياطي لـ GitHub
```

---

## أوامر Termux خاصة

### إدارة الحزم
```bash
pkg search <package>                 # البحث عن حزمة
pkg show <package>                   # معلومات الحزمة
pkg list-installed                   # الحزم المثبتة
pkg upgrade                          # تحديث الكل
```

### الوصول للتخزين
```bash
termux-setup-storage                 # طلب أذونات التخزين
cd ~/storage/shared                  # المجلد المشترك
cd ~/storage/downloads               # التحميلات
```

---

## اختصارات مفيدة

```bash
# الانتقال السريع
cd ~                                 # المجلد الرئيسي
cd -                                 # المجلد السابق
cd ../..                             # صعود مستويين

# عرض الملفات
ls -la                               # كل الملفات مع التفاصيل
tree -L 2                            # شجرة بعمق 2
du -sh *                             # حجم المجلدات

# البحث
find . -name "*.js"                  # بحث عن ملفات JS
grep -r "text" .                     # بحث في محتوى الملفات

# العمليات
ps aux | grep node                   # عمليات Node
killall node                         # قتل كل Node
```

---

## حل المشاكل السريع

### مشكلة: البوت لا يستجيب
```bash
pm2 restart bot
pm2 logs bot --lines 30
```

### مشكلة: العميل لا يعمل
```bash
pm2 restart client
pm2 logs client --lines 30
```

### مشكلة: كل شيء معطل
```bash
./fix-termux.sh && ./start-termux.sh
```

### مشكلة: out of memory
```bash
pm2 stop client                      # أوقف العميل مؤقتاً
pm2 restart bot server               # شغل البوت والخادم فقط
```

---

## 🆘 في حالة الطوارئ

```bash
# الحل النووي - إيقاف كل شيء
pm2 kill
killall node
kill -9 $(lsof -ti:3001,5173) 2>/dev/null

# ثم
./fix-termux.sh
./start-termux.sh
```

---

## 📚 مراجع سريعة

- **PM2 Docs:** https://pm2.keymetrics.io/docs/usage/quick-start/
- **Git Basics:** https://git-scm.com/docs
- **Termux Wiki:** https://wiki.termux.com/
- **Node.js Docs:** https://nodejs.org/docs/
