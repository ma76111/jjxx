#!/bin/bash

# ════════════════════════════════════════
#   ⚙️  Configuration Script
# ════════════════════════════════════════

set -e

clear
echo ""
echo "════════════════════════════════════════"
echo "   ⚙️  Environment Configuration"
echo "════════════════════════════════════════"
echo ""
echo "This script will help you configure the"
echo "required .env files for the project."
echo ""

# ═══════════════════════════════════════
# Root .env
# ═══════════════════════════════════════

echo "════════════════════════════════════════"
echo "   📝 Bot Configuration (.env)"
echo "════════════════════════════════════════"
echo ""

read -p "Enter your BOT_TOKEN (from @BotFather): " BOT_TOKEN
echo ""

read -p "Enter your BOT_NAME (e.g., mybot_bot): " BOT_NAME
echo ""

read -p "Enter ADMIN_IDS (comma-separated Telegram IDs): " ADMIN_IDS
echo ""

read -p "Enter MAIN_ADMIN_ID (your main Telegram ID): " MAIN_ADMIN_ID
echo ""

read -p "Enter BINANCE_API_KEY (optional, press Enter to skip): " BINANCE_API_KEY
echo ""

if [ -n "$BINANCE_API_KEY" ]; then
    read -p "Enter BINANCE_API_SECRET: " BINANCE_API_SECRET
    echo ""
fi

cat > .env << EOF
BOT_TOKEN=$BOT_TOKEN
BOT_NAME=$BOT_NAME
ADMIN_IDS=$ADMIN_IDS
MAIN_ADMIN_ID=$MAIN_ADMIN_ID
DATABASE_PATH=./bot.db
BINANCE_API_KEY=$BINANCE_API_KEY
BINANCE_API_SECRET=$BINANCE_API_SECRET
GITHUB_BACKUP_TOKEN=
GITHUB_BACKUP_REPO=
EOF

echo "✅ Root .env configured"
echo ""

# ═══════════════════════════════════════
# Web Server .env
# ═══════════════════════════════════════

echo "════════════════════════════════════════"
echo "   📝 Web Server Configuration"
echo "════════════════════════════════════════"
echo ""

# Generate random JWT secret
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)

cat > web/server/.env << EOF
BOT_TOKEN=$BOT_TOKEN
BOT_NAME=$BOT_NAME
JWT_SECRET=$JWT_SECRET
WEB_PORT=3001
CLIENT_ORIGIN=http://localhost:5173
MAIN_ADMIN_ID=$MAIN_ADMIN_ID
EOF

echo "✅ Web Server .env configured"
echo "   JWT_SECRET generated: ${JWT_SECRET:0:10}..."
echo ""

# ═══════════════════════════════════════
# Web Client .env
# ═══════════════════════════════════════

echo "════════════════════════════════════════"
echo "   📝 Web Client Configuration"
echo "════════════════════════════════════════"
echo ""

cat > web/client/.env << EOF
VITE_BOT_NAME=$BOT_NAME
VITE_API_URL=http://localhost:3001/api
EOF

echo "✅ Web Client .env configured"
echo ""

# ═══════════════════════════════════════
# Summary
# ═══════════════════════════════════════

echo "════════════════════════════════════════"
echo "   ✅ Configuration Complete!"
echo "════════════════════════════════════════"
echo ""
echo "📋 Files created:"
echo "   • .env"
echo "   • web/server/.env"
echo "   • web/client/.env"
echo ""
echo "🔒 Security note:"
echo "   Never commit .env files to Git!"
echo ""
echo "🚀 You can now start the project:"
echo "   ./deploy-ubuntu.sh"
echo ""
