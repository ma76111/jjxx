#!/bin/bash

# ================================================================
# Referral Bot - Interactive Setup Script
# سكريبت إعداد تفاعلي يطلب جميع المعلومات المطلوبة
# ================================================================

clear
echo "╔════════════════════════════════════════════════╗"
echo "║     🤖 Referral Bot - Setup Wizard            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# ── التحقق من Node.js ──────────────────────────────────
if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت!"
    echo ""
    echo "للتثبيت:"
    echo "  • Windows: https://nodejs.org"
    echo "  • Termux: pkg install nodejs"
    echo "  • Linux: sudo apt install nodejs npm"
    exit 1
fi

echo "✅ Node.js: $(node -v)"
echo ""

# ── دالة للقراءة مع قيمة افتراضية ──────────────────────
read_with_default() {
    local prompt="$1"
    local default="$2"
    local value
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " value
        echo "${value:-$default}"
    else
        read -p "$prompt: " value
        echo "$value"
    fi
}

# ── دالة لتوليد JWT Secret عشوائي ──────────────────────
generate_jwt_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 32
    else
        # Fallback: استخدام /dev/urandom
        cat /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 43
    fi
}

echo "════════════════════════════════════════════════"
echo "  📋 معلومات البوت الأساسية"
echo "════════════════════════════════════════════════"
echo ""

# ── BOT_TOKEN ───────────────────────────────────────────
echo "🔑 1. Bot Token"
echo "   احصل عليه من: @BotFather على Telegram"
echo "   /newbot → اتبع الخطوات"
echo ""
BOT_TOKEN=$(read_with_default "أدخل BOT_TOKEN" "")

while [ -z "$BOT_TOKEN" ]; do
    echo "❌ BOT_TOKEN مطلوب!"
    BOT_TOKEN=$(read_with_default "أدخل BOT_TOKEN" "")
done

# ── BOT_NAME ────────────────────────────────────────────
echo ""
echo "📛 2. Bot Username (بدون @)"
echo "   مثال: my_referral_bot"
echo ""
BOT_NAME=$(read_with_default "أدخل BOT_NAME" "")

while [ -z "$BOT_NAME" ]; do
    echo "❌ BOT_NAME مطلوب!"
    BOT_NAME=$(read_with_default "أدخل BOT_NAME" "")
done

# ── MAIN_ADMIN_ID ───────────────────────────────────────
echo ""
echo "👤 3. Your Telegram User ID (الأدمن الرئيسي)"
echo "   احصل عليه من: @userinfobot"
echo "   أرسل /start وسيعطيك الـ ID"
echo ""
MAIN_ADMIN_ID=$(read_with_default "أدخل MAIN_ADMIN_ID" "")

while [ -z "$MAIN_ADMIN_ID" ]; do
    echo "❌ MAIN_ADMIN_ID مطلوب!"
    MAIN_ADMIN_ID=$(read_with_default "أدخل MAIN_ADMIN_ID" "")
done

# ── ADMIN_IDS (Optional) ────────────────────────────────
echo ""
echo "👥 4. Admin IDs إضافيين (اختياري)"
echo "   افصل بفاصلة: 123456,789012"
echo ""
ADMIN_IDS=$(read_with_default "أدخل ADMIN_IDS" "")

# ── JWT_SECRET ──────────────────────────────────────────
echo ""
echo "🔐 5. JWT Secret"
echo "   سيتم توليد سلسلة عشوائية آمنة..."
JWT_SECRET=$(generate_jwt_secret)
echo "   ✅ تم التوليد: ${JWT_SECRET:0:20}..."

# ── Optional: Binance API ───────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
echo "  💰 Binance API (اختياري - للتحقق التلقائي)"
echo "════════════════════════════════════════════════"
echo ""
echo "هل تريد إضافة Binance API Keys؟ (y/n)"
read -p "الاختيار [n]: " use_binance
use_binance=${use_binance:-n}

if [[ "$use_binance" =~ ^[Yy]$ ]]; then
    BINANCE_API_KEY=$(read_with_default "Binance API Key" "")
    BINANCE_API_SECRET=$(read_with_default "Binance API Secret" "")
else
    BINANCE_API_KEY=""
    BINANCE_API_SECRET=""
fi

# ── Optional: GitHub Backup ─────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
echo "  💾 GitHub Backup (اختياري)"
echo "════════════════════════════════════════════════"
echo ""
echo "هل تريد تفعيل النسخ الاحتياطي على GitHub؟ (y/n)"
read -p "الاختيار [n]: " use_github
use_github=${use_github:-n}

if [[ "$use_github" =~ ^[Yy]$ ]]; then
    GITHUB_BACKUP_TOKEN=$(read_with_default "GitHub Personal Access Token" "")
    GITHUB_BACKUP_REPO=$(read_with_default "GitHub Repo (username/repo)" "")
else
    GITHUB_BACKUP_TOKEN=""
    GITHUB_BACKUP_REPO=""
fi

# ── Network Settings ────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
echo "  🌐 إعدادات الشبكة"
echo "════════════════════════════════════════════════"
echo ""

# تحديد إذا كان Termux أو لا
if [ -d "/data/data/com.termux" ]; then
    echo "📱 تم اكتشاف Termux"
    # الحصول على IP التلقائي
    LOCAL_IP=$(ip addr show wlan0 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d/ -f1 | head -n1)
    [ -z "$LOCAL_IP" ] && LOCAL_IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}')
    [ -z "$LOCAL_IP" ] && LOCAL_IP="127.0.0.1"
    
    echo "   IP المحلي: $LOCAL_IP"
    WEB_PORT="3001"
    CLIENT_PORT="5173"
    CLIENT_ORIGIN="http://${LOCAL_IP}:${CLIENT_PORT}"
    API_URL="http://${LOCAL_IP}:${WEB_PORT}/api"
else
    echo "💻 تم اكتشاف Desktop/Server"
    WEB_PORT=$(read_with_default "Web Server Port" "3001")
    CLIENT_PORT=$(read_with_default "Client Port" "5173")
    CLIENT_ORIGIN="http://localhost:${CLIENT_PORT}"
    API_URL="http://localhost:${WEB_PORT}/api"
fi

# ── إنشاء ملفات .env ────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
echo "  📝 إنشاء ملفات الإعدادات..."
echo "════════════════════════════════════════════════"
echo ""

# 1. Root .env
echo "📄 1/3 إنشاء .env..."
cat > .env << EOF
# Telegram Bot Configuration
BOT_TOKEN=$BOT_TOKEN
BOT_NAME=$BOT_NAME

# Admin Configuration
ADMIN_IDS=$ADMIN_IDS
MAIN_ADMIN_ID=$MAIN_ADMIN_ID

# Database
DATABASE_PATH=./bot.db

# Binance API (Optional)
BINANCE_API_KEY=$BINANCE_API_KEY
BINANCE_API_SECRET=$BINANCE_API_SECRET

# GitHub Backup (Optional)
GITHUB_BACKUP_TOKEN=$GITHUB_BACKUP_TOKEN
GITHUB_BACKUP_REPO=$GITHUB_BACKUP_REPO
EOF

# 2. Web Server .env
echo "📄 2/3 إنشاء web/server/.env..."
cat > web/server/.env << EOF
# Telegram Bot
BOT_TOKEN=$BOT_TOKEN
BOT_NAME=$BOT_NAME

# JWT Secret
JWT_SECRET=$JWT_SECRET

# Server Configuration
WEB_PORT=$WEB_PORT
CLIENT_ORIGIN=$CLIENT_ORIGIN

# Admin
MAIN_ADMIN_ID=$MAIN_ADMIN_ID
EOF

# 3. Web Client .env
echo "📄 3/3 إنشاء web/client/.env..."
cat > web/client/.env << EOF
# Bot Name
VITE_BOT_NAME=$BOT_NAME

# API URL
VITE_API_URL=$API_URL
EOF

echo ""
echo "✅ تم إنشاء جميع ملفات الإعدادات!"
echo ""

# ── تثبيت التبعيات ──────────────────────────────────────
echo "════════════════════════════════════════════════"
echo "  📦 تثبيت التبعيات..."
echo "════════════════════════════════════════════════"
echo ""

install_deps() {
    local dir=$1
    local name=$2
    
    if [ ! -d "$dir/node_modules" ]; then
        echo "📦 تثبيت $name..."
        cd "$dir"
        npm install --silent 2>&1 | grep -E "(error|warn)" || echo "   ✅ تم التثبيت"
        cd - > /dev/null
    else
        echo "✅ $name - التبعيات مثبتة مسبقاً"
    fi
}

install_deps "." "البوت الرئيسي"
install_deps "web/server" "الخادم"
install_deps "web/client" "العميل"

# ── إنشاء مجلدات ─────────────────────────────────────────
echo ""
echo "📁 إنشاء المجلدات المطلوبة..."
mkdir -p logs
mkdir -p backups
echo "   ✅ تم"

# ── الملخص النهائي ──────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
echo "  ✅ اكتمل الإعداد بنجاح!"
echo "════════════════════════════════════════════════"
echo ""
echo "📋 ملخص الإعدادات:"
echo "   • Bot: @$BOT_NAME"
echo "   • Admin ID: $MAIN_ADMIN_ID"
echo "   • Web Server: Port $WEB_PORT"
echo "   • Client: Port $CLIENT_PORT"
if [ -d "/data/data/com.termux" ]; then
    echo "   • Dashboard: http://$LOCAL_IP:$CLIENT_PORT"
else
    echo "   • Dashboard: http://localhost:$CLIENT_PORT"
fi
echo ""
echo "════════════════════════════════════════════════"
echo "  🚀 خطوات التشغيل:"
echo "════════════════════════════════════════════════"
echo ""

if [ -d "/data/data/com.termux" ]; then
    echo "على Termux:"
    echo "  chmod +x start-termux.sh"
    echo "  ./start-termux.sh"
else
    echo "على Windows:"
    echo "  start.bat"
    echo ""
    echo "على Linux/Mac:"
    echo "  pm2 start ecosystem.config.cjs"
fi

echo ""
echo "════════════════════════════════════════════════"
echo ""
