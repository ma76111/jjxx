#!/data/data/com.termux/files/usr/bin/bash

# ================================================================
# Telegram Bot Setup Script for Termux
# سكريبت تثبيت وتشغيل بوت التليجرام على تيرمكس
# ================================================================

set -e

echo "🚀 بدء إعداد البوت على Termux..."
echo "================================"

# ── التحقق من Termux ──
if [ ! -d "/data/data/com.termux" ]; then
    echo "❌ هذا السكريبت مصمم للعمل على Termux فقط!"
    exit 1
fi

# ── تثبيت الحزم المطلوبة ──
install_dependencies() {
    echo ""
    echo "📦 تثبيت الحزم المطلوبة..."
    
    # تحديث قوائم الحزم
    pkg update -y
    
    # تثبيت الحزم الأساسية
    pkg install -y nodejs git python build-essential sqlite
    
    # تثبيت PM2 عالمياً
    if ! command -v pm2 &> /dev/null; then
        echo "📦 تثبيت PM2..."
        npm install -g pm2
    else
        echo "✅ PM2 مثبت مسبقاً"
    fi
    
    echo "✅ تم تثبيت جميع الحزم"
}

# ── إعداد ملف .env ──
setup_env() {
    echo ""
    echo "⚙️ إعداد متغيرات البيئة..."
    
    if [ -f ".env" ]; then
        echo "⚠️  ملف .env موجود بالفعل"
        read -p "هل تريد إعادة إنشائه؟ (y/n): " recreate
        if [ "$recreate" != "y" ]; then
            return
        fi
    fi
    
    echo ""
    echo "📝 من فضلك أدخل المعلومات التالية:"
    echo ""
    
    # BOT_TOKEN
    read -p "🤖 أدخل Bot Token من @BotFather: " BOT_TOKEN
    
    # BOT_NAME
    read -p "📛 أدخل اسم البوت (بدون @): " BOT_NAME
    
    # ADMIN_IDS
    read -p "👤 أدخل Telegram ID للمشرف الرئيسي: " MAIN_ADMIN_ID
    
    read -p "👥 أدخل جميع IDs المشرفين (مفصولة بفاصلة): " ADMIN_IDS
    
    # Binance API (اختياري)
    echo ""
    echo "🔑 Binance API (اضغط Enter للتخطي):"
    read -p "Binance API Key: " BINANCE_API_KEY
    read -p "Binance API Secret: " BINANCE_API_SECRET
    
    # GitHub Backup (اختياري)
    echo ""
    echo "📂 GitHub Backup (اضغط Enter للتخطي):"
    read -p "GitHub Token: " GITHUB_TOKEN
    read -p "GitHub Repo (username/repo): " GITHUB_REPO
    
    # كتابة ملف .env
    cat > .env << EOF
# Telegram Bot Configuration
BOT_TOKEN=$BOT_TOKEN
BOT_NAME=$BOT_NAME
ADMIN_IDS=$ADMIN_IDS
MAIN_ADMIN_ID=$MAIN_ADMIN_ID
DATABASE_PATH=./bot.db

# Binance API
BINANCE_API_KEY=$BINANCE_API_KEY
BINANCE_API_SECRET=$BINANCE_API_SECRET

# GitHub Backup
GITHUB_BACKUP_TOKEN=$GITHUB_TOKEN
GITHUB_BACKUP_REPO=$GITHUB_REPO
EOF
    
    echo "✅ تم إنشاء ملف .env"
}

# ── إعداد ملف .env للويب كلاينت ──
setup_web_client_env() {
    echo ""
    echo "🌐 إعداد Web Client..."
    
    if [ -f "web/client/.env" ]; then
        echo "⚠️  ملف web/client/.env موجود بالفعل"
        read -p "هل تريد إعادة إنشائه؟ (y/n): " recreate
        if [ "$recreate" != "y" ]; then
            return
        fi
    fi
    
    # قراءة BOT_NAME من ملف .env الرئيسي
    source .env
    
    echo ""
    read -p "🌍 أدخل Domain المؤقت من LocalTunnel أو Serveo (مثال: https://xxx.loca.lt): " PUBLIC_DOMAIN
    
    cat > web/client/.env << EOF
# Web Client Configuration
VITE_BOT_NAME=$BOT_NAME
VITE_API_URL=${PUBLIC_DOMAIN}/api
EOF
    
    echo "✅ تم إنشاء ملف web/client/.env"
}

# ── تثبيت Dependencies ──
install_node_packages() {
    echo ""
    echo "📦 تثبيت حزم Node.js..."
    
    # Root packages
    echo "📦 تثبيت حزم المشروع الرئيسي..."
    npm install
    
    # Web server packages
    if [ -d "web/server" ]; then
        echo "📦 تثبيت حزم الخادم..."
        cd web/server
        npm install
        cd ../..
    fi
    
    # Web client packages
    if [ -d "web/client" ]; then
        echo "📦 تثبيت حزم الواجهة..."
        cd web/client
        npm install
        cd ../..
    fi
    
    echo "✅ تم تثبيت جميع الحزم"
}

# ── بناء Web Client ──
build_client() {
    echo ""
    echo "🔨 بناء واجهة الويب..."
    
    if [ -d "web/client" ]; then
        cd web/client
        npm run build
        cd ../..
        echo "✅ تم بناء الواجهة"
    fi
}

# ── إعداد قاعدة البيانات ──
setup_database() {
    echo ""
    echo "🗄️ إعداد قاعدة البيانات..."
    
    if [ -f "bot.db" ]; then
        echo "⚠️  قاعدة البيانات موجودة بالفعل"
    else
        echo "✅ سيتم إنشاء قاعدة البيانات عند التشغيل الأول"
    fi
}

# ── إنشاء ملف PM2 Ecosystem ──
create_pm2_config() {
    echo ""
    echo "⚙️ إنشاء ملف PM2 Config..."
    
    cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: 'telegram-bot',
      script: 'index.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'web-server',
      script: 'web/server/index.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
EOF
    
    echo "✅ تم إنشاء ملف PM2 Config"
}

# ── إنشاء مجلد اللوجات ──
create_logs_dir() {
    echo ""
    echo "📁 إنشاء مجلد اللوجات..."
    mkdir -p logs
    echo "✅ تم إنشاء مجلد اللوجات"
}

# ── تثبيت LocalTunnel ──
install_tunnel() {
    echo ""
    echo "🌐 تثبيت LocalTunnel للحصول على Domain مؤقت..."
    
    if ! command -v lt &> /dev/null; then
        npm install -g localtunnel
        echo "✅ تم تثبيت LocalTunnel"
    else
        echo "✅ LocalTunnel مثبت مسبقاً"
    fi
}

# ── بدء التشغيل ──
start_services() {
    echo ""
    echo "🚀 بدء تشغيل الخدمات..."
    
    # إيقاف أي عمليات قديمة
    pm2 delete all 2>/dev/null || true
    
    # بدء التشغيل
    pm2 start ecosystem.config.cjs
    
    # حفظ الإعدادات
    pm2 save
    
    # إعداد بدء التشغيل التلقائي
    pm2 startup
    
    echo ""
    echo "✅ تم بدء الخدمات بنجاح!"
    echo ""
    echo "📊 حالة الخدمات:"
    pm2 status
    
    echo ""
    echo "🌐 لفتح Web Dashboard على الإنترنت، قم بتشغيل:"
    echo "   lt --port 3001 --subdomain your-custom-name"
    echo ""
    echo "📝 أوامر مفيدة:"
    echo "   pm2 status          - عرض حالة الخدمات"
    echo "   pm2 logs            - عرض اللوجات"
    echo "   pm2 restart all     - إعادة تشغيل جميع الخدمات"
    echo "   pm2 stop all        - إيقاف جميع الخدمات"
    echo "   pm2 delete all      - حذف جميع الخدمات"
}

# ── القائمة الرئيسية ──
main_menu() {
    echo ""
    echo "================================"
    echo "   🤖 إعداد بوت التليجرام"
    echo "================================"
    echo ""
    echo "اختر أحد الخيارات:"
    echo "1. تثبيت كامل (جديد)"
    echo "2. تحديث الإعدادات فقط (.env)"
    echo "3. إعادة بناء الواجهة"
    echo "4. بدء الخدمات"
    echo "5. إيقاف الخدمات"
    echo "6. حالة الخدمات"
    echo "7. عرض اللوجات"
    echo "8. فتح نفق عام (LocalTunnel)"
    echo "0. خروج"
    echo ""
    read -p "اختيارك: " choice
    
    case $choice in
        1)
            install_dependencies
            setup_env
            install_node_packages
            setup_web_client_env
            build_client
            setup_database
            create_logs_dir
            create_pm2_config
            install_tunnel
            start_services
            ;;
        2)
            setup_env
            setup_web_client_env
            echo "✅ تم تحديث الإعدادات. أعد تشغيل الخدمات لتطبيق التغييرات."
            ;;
        3)
            build_client
            pm2 restart web-server
            ;;
        4)
            start_services
            ;;
        5)
            pm2 stop all
            echo "✅ تم إيقاف جميع الخدمات"
            ;;
        6)
            pm2 status
            ;;
        7)
            pm2 logs
            ;;
        8)
            echo ""
            read -p "أدخل اسم فرعي مخصص (أو اتركه فارغاً): " subdomain
            if [ -z "$subdomain" ]; then
                lt --port 3001
            else
                lt --port 3001 --subdomain "$subdomain"
            fi
            ;;
        0)
            echo "👋 إلى اللقاء!"
            exit 0
            ;;
        *)
            echo "❌ اختيار غير صحيح"
            main_menu
            ;;
    esac
}

# ── التشغيل ──
if [ "$1" == "--auto" ]; then
    # تثبيت تلقائي كامل
    install_dependencies
    setup_env
    install_node_packages
    setup_web_client_env
    build_client
    setup_database
    create_logs_dir
    create_pm2_config
    install_tunnel
    start_services
else
    # قائمة تفاعلية
    main_menu
fi

echo ""
echo "✅ تم الانتهاء!"
