# 🚀 دليل النشر والرفع على GitHub

## 📋 قبل الرفع على GitHub

### 1️⃣ تأكد من `.gitignore`
```bash
# تأكد أن الملف موجود ويحتوي على:
cat .gitignore
```

يجب أن يحتوي على:
- `node_modules/`
- `.env`
- `*.db`
- `backups/`

### 2️⃣ نظف البيانات الحساسة من `.env`
```bash
# احذف قيم BOT_TOKEN و JWT_SECRET
# استخدم .env.example فقط
```

### 3️⃣ احذف قاعدة البيانات والنسخ الاحتياطية
```bash
rm -f bot.db bot.db-shm bot.db-wal
rm -rf backups/
```

---

## 🔐 رفع على GitHub

### طريقة 1: من الكمبيوتر

#### A. إذا لم تنشئ Repository بعد:

1. **إنشاء Repository على GitHub:**
   - اذهب إلى https://github.com/new
   - اسم Repository: `referral-bot` (أو أي اسم تريده)
   - اختر: Private (خاص) ← مهم جداً!
   - **لا تضف** README أو .gitignore (موجودين بالفعل)
   - اضغط "Create repository"

2. **ربط المشروع بـ GitHub:**
```bash
# تهيئة git
git init

# إضافة جميع الملفات
git add .

# أول commit
git commit -m "Initial commit: Referral & Tasks Bot"

# ربط بـ GitHub (غير username و repo-name)
git remote add origin https://github.com/username/repo-name.git

# رفع الملفات
git branch -M main
git push -u origin main
```

#### B. إذا كان Repository موجود بالفعل:

```bash
# إضافة الملفات الجديدة
git add .

# Commit
git commit -m "Update: Added features and fixes"

# رفع
git push
```

---

### طريقة 2: من Termux (Android)

```bash
# تثبيت git
pkg install git

# تكوين git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# تهيئة وربط
git init
git add .
git commit -m "Initial commit from Termux"
git remote add origin https://github.com/username/repo-name.git
git branch -M main
git push -u origin main
```

**ملاحظة:** سيطلب منك username و password:
- Username: اسم حسابك على GitHub
- Password: استخدم **Personal Access Token** (ليس كلمة المرور!)

#### إنشاء Token:
1. اذهب إلى: https://github.com/settings/tokens
2. Generate new token (classic)
3. اختر: `repo` permissions
4. احفظ الـ Token في مكان آمن

---

## 📦 تنزيل المشروع على جهاز آخر

### على Windows:
```bash
# تنزيل
git clone https://github.com/username/repo-name.git
cd repo-name

# نسخ ملفات .env
copy .env.example .env
copy web\server\.env.example web\server\.env
copy web\client\.env.example web\client\.env

# عدل ملفات .env بمعلوماتك

# تثبيت التبعيات
npm install
cd web/server && npm install && cd ../..
cd web/client && npm install && cd ../..

# تشغيل
start.bat
```

### على Termux:
```bash
# تنزيل
git clone https://github.com/username/repo-name.git
cd repo-name

# نسخ ملفات .env
cp .env.example .env
cp web/server/.env.example web/server/.env
cp web/client/.env.example web/client/.env

# عدل ملفات .env (استخدم nano أو vim)
nano .env
nano web/server/.env
nano web/client/.env

# إعطاء صلاحية
chmod +x start-termux.sh

# تشغيل
./start-termux.sh
```

---

## ⚠️ أمان مهم جداً!

### ✅ افعل:
- ✅ تأكد أن `.gitignore` يتضمن `.env`
- ✅ استخدم Repository **خاص** (Private)
- ✅ استخدم `.env.example` بدون قيم حقيقية
- ✅ غير `JWT_SECRET` بعد كل clone

### ❌ لا تفعل:
- ❌ **لا ترفع** ملفات `.env` على GitHub أبداً
- ❌ **لا ترفع** `BOT_TOKEN` الحقيقي
- ❌ **لا ترفع** قاعدة البيانات `bot.db`
- ❌ **لا تجعل** Repository عام (Public)

---

## 🔄 تحديث المشروع

### على الجهاز الأصلي:
```bash
git add .
git commit -m "وصف التعديلات"
git push
```

### على جهاز آخر:
```bash
git pull
npm install  # إذا تغيرت التبعيات
```

---

## 🆘 مشاكل شائعة

### مشكلة: "fatal: remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/username/repo-name.git
```

### مشكلة: "Authentication failed"
- تأكد من استخدام **Personal Access Token** وليس كلمة المرور

### مشكلة: رُفع ملف .env بالخطأ
```bash
# احذفه من Git (لكن يبقى على جهازك)
git rm --cached .env
git commit -m "Remove .env from tracking"
git push

# غير BOT_TOKEN فوراً من @BotFather!
```

---

## 📝 ملاحظات إضافية

- **النسخ الاحتياطية:** المجلد `backups/` لن يُرفع (في .gitignore)
- **السجلات:** المجلد `logs/` لن يُرفع
- **node_modules:** لن تُرفع (ضخمة جداً)
- **قاعدة البيانات:** لن تُرفع (بيانات حساسة)

---

**تم الإعداد! جاهز للرفع بأمان** 🔒✅
