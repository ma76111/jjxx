#!/bin/bash

# ================================================================
# Referral Bot - Interactive Setup Script
# ================================================================

clear
echo "╔════════════════════════════════════════════════╗"
echo "║     🤖 Referral Bot - Setup Wizard            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "To install:"
    echo "  • Windows: https://nodejs.org"
    echo "  • Termux: pkg install nodejs"
    echo "  • Linux: sudo apt install nodejs npm"
    exit 1
fi

echo "✅ Node.js: $(node -v)"
echo ""

# Read input with default value
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

# Generate random JWT Secret
generate_jwt_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 32
    else
        # Fallback: use /dev/urandom
        cat /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 43
    fi
}

echo "════════════════════════════════════════════════"
echo "  📋 Bot Configuration"
echo "════════════════════════════════════════════════"
echo ""

# BOT_TOKEN
echo "🔑 1. Bot Token"
echo "   Get it from: @BotFather on Telegram"
echo "   /newbot → Follow the steps"
echo ""
BOT_TOKEN=$(read_with_default "Enter BOT_TOKEN" "")

while [ -z "$BOT_TOKEN" ]; do
    echo "❌ BOT_TOKEN is required!"
    BOT_TOKEN=$(read_with_default "Enter BOT_TOKEN" "")
done

# BOT_NAME
echo ""
echo "📛 2. Bot Username (without @)"
echo "   Example: my_referral_bot"
echo ""
BOT_NAME=$(read_with_default "Enter BOT_NAME" "")

while [ -z "$BOT_NAME" ]; do
    echo "❌ BOT_NAME is required!"
    BOT_NAME=$(read_with_default "Enter BOT_NAME" "")
done

# MAIN_ADMIN_ID
echo ""
echo "👤 3. Your Telegram User ID (Main Admin)"
echo "   Get it from: @userinfobot"
echo "   Send /start and it will give you the ID"
echo ""
MAIN_ADMIN_ID=$(read_with_default "Enter MAIN_ADMIN_ID" "")

while [ -z "$MAIN_ADMIN_ID" ]; do
    echo "❌ MAIN_ADMIN_ID is required!"
    MAIN_ADMIN_ID=$(read_with_default "Enter MAIN_ADMIN_ID" "")
done

# ADMIN_IDS (Optional)
echo ""
echo "👥 4. Additional Admin IDs (Optional)"
echo "   Separate with comma: 123456,789012"
echo ""
ADMIN_IDS=$(read_with_default "Enter ADMIN_IDS" "")

# JWT_SECRET
echo ""
echo "🔐 5. JWT Secret"
echo "   Generating a secure random string..."
JWT_SECRET=$(generate_jwt_secret)
echo "   ✅ Generated: ${JWT_SECRET:0:20}..."

# Optional: Binance API
echo ""
echo "════════════════════════════════════════════════"
echo "  💰 Binance API (Optional - Auto verification)"
echo "════════════════════════════════════════════════"
echo ""
echo "Do you want to add Binance API Keys? (y/n)"
read -p "Choice [n]: " use_binance
use_binance=${use_binance:-n}

if [[ "$use_binance" =~ ^[Yy]$ ]]; then
    BINANCE_API_KEY=$(read_with_default "Binance API Key" "")
    BINANCE_API_SECRET=$(read_with_default "Binance API Secret" "")
else
    BINANCE_API_KEY=""
    BINANCE_API_SECRET=""
fi

# Optional: GitHub Backup
echo ""
echo "════════════════════════════════════════════════"
echo "  💾 GitHub Backup (Optional)"
echo "════════════════════════════════════════════════"
echo ""
echo "Do you want to enable GitHub backup? (y/n)"
read -p "Choice [n]: " use_github
use_github=${use_github:-n}

if [[ "$use_github" =~ ^[Yy]$ ]]; then
    GITHUB_BACKUP_TOKEN=$(read_with_default "GitHub Personal Access Token" "")
    GITHUB_BACKUP_REPO=$(read_with_default "GitHub Repo (username/repo)" "")
else
    GITHUB_BACKUP_TOKEN=""
    GITHUB_BACKUP_REPO=""
fi

# Network Settings
echo ""
echo "════════════════════════════════════════════════"
echo "  🌐 Network Settings"
echo "════════════════════════════════════════════════"
echo ""

# Detect Termux
if [ -d "/data/data/com.termux" ]; then
    echo "📱 Termux detected"
    # Get local IP automatically
    LOCAL_IP=$(ip addr show wlan0 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d/ -f1 | head -n1)
    [ -z "$LOCAL_IP" ] && LOCAL_IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}')
    [ -z "$LOCAL_IP" ] && LOCAL_IP="127.0.0.1"
    
    echo "   Local IP: $LOCAL_IP"
    WEB_PORT="3001"
    CLIENT_PORT="5173"
    CLIENT_ORIGIN="http://${LOCAL_IP}:${CLIENT_PORT}"
    API_URL="http://${LOCAL_IP}:${WEB_PORT}/api"
else
    echo "💻 Desktop/Server detected"
    WEB_PORT=$(read_with_default "Web Server Port" "3001")
    CLIENT_PORT=$(read_with_default "Client Port" "5173")
    CLIENT_ORIGIN="http://localhost:${CLIENT_PORT}"
    API_URL="http://localhost:${WEB_PORT}/api"
fi

# Create .env files
echo ""
echo "════════════════════════════════════════════════"
echo "  📝 Creating configuration files..."
echo "════════════════════════════════════════════════"
echo ""

# 1. Root .env
echo "📄 1/3 Creating .env..."
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
echo "📄 2/3 Creating web/server/.env..."
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
echo "📄 3/3 Creating web/client/.env..."
cat > web/client/.env << EOF
# Bot Name
VITE_BOT_NAME=$BOT_NAME

# API URL
VITE_API_URL=$API_URL
EOF

echo ""
echo "✅ All configuration files created!"
echo ""

# Install dependencies
echo "════════════════════════════════════════════════"
echo "  📦 Installing dependencies..."
echo "════════════════════════════════════════════════"
echo ""

install_deps() {
    local dir=$1
    local name=$2
    
    if [ ! -d "$dir/node_modules" ]; then
        echo "📦 Installing $name..."
        cd "$dir"
        npm install --silent 2>&1 | grep -E "(error|warn)" || echo "   ✅ Installed"
        cd - > /dev/null
    else
        echo "✅ $name - dependencies already installed"
    fi
}

install_deps "." "Main Bot"
install_deps "web/server" "Web Server"
install_deps "web/client" "Web Client"

# Create directories
echo ""
echo "📁 Creating required directories..."
mkdir -p logs
mkdir -p backups
echo "   ✅ Done"

# Final Summary
echo ""
echo "════════════════════════════════════════════════"
echo "  ✅ Setup completed successfully!"
echo "════════════════════════════════════════════════"
echo ""
echo "📋 Configuration Summary:"
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
echo "  🚀 How to start:"
echo "════════════════════════════════════════════════"
echo ""

if [ -d "/data/data/com.termux" ]; then
    echo "On Termux:"
    echo "  chmod +x start-termux.sh"
    echo "  ./start-termux.sh"
else
    echo "On Windows:"
    echo "  start.bat"
    echo ""
    echo "On Linux/Mac:"
    echo "  pm2 start ecosystem.config.cjs"
fi

echo ""
echo "════════════════════════════════════════════════"
echo ""
