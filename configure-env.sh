#!/data/data/com.termux/files/usr/bin/bash

# ================================================
# Interactive Environment Configuration
# This script will ask you for all .env values
# and configure all 3 .env files automatically
# ================================================

echo "================================================"
echo "  Referral Bot - Environment Configuration"
echo "================================================"
echo ""
echo "This will configure all .env files interactively"
echo "Press Ctrl+C to cancel anytime"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── 1. Bot Configuration ──────────────────────────
echo -e "${CYAN}=== Bot Configuration ===${NC}"
echo ""

read -p "Enter BOT_TOKEN (from @BotFather): " BOT_TOKEN
if [ -z "$BOT_TOKEN" ]; then
    echo "Error: BOT_TOKEN is required"
    exit 1
fi

read -p "Enter BOT_NAME (e.g., my_bot): " BOT_NAME
if [ -z "$BOT_NAME" ]; then
    echo "Error: BOT_NAME is required"
    exit 1
fi

read -p "Enter MAIN_ADMIN_ID (your Telegram ID): " MAIN_ADMIN_ID
if [ -z "$MAIN_ADMIN_ID" ]; then
    echo "Error: MAIN_ADMIN_ID is required"
    exit 1
fi

read -p "Enter ADMIN_IDS (comma-separated, optional): " ADMIN_IDS

echo ""
echo -e "${CYAN}=== Security Configuration ===${NC}"
echo ""

echo "Generating random JWT_SECRET..."
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
echo -e "${GREEN}Generated: ${JWT_SECRET}${NC}"

echo ""
read -p "Use this JWT_SECRET? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter custom JWT_SECRET (min 32 chars): " JWT_SECRET
    if [ ${#JWT_SECRET} -lt 32 ]; then
        echo "Warning: JWT_SECRET should be at least 32 characters"
    fi
fi

echo ""
echo -e "${CYAN}=== Optional Services ===${NC}"
echo ""

read -p "Enter BINANCE_API_KEY (optional, press Enter to skip): " BINANCE_API_KEY
read -p "Enter BINANCE_API_SECRET (optional, press Enter to skip): " BINANCE_API_SECRET
read -p "Enter GITHUB_BACKUP_TOKEN (optional, press Enter to skip): " GITHUB_BACKUP_TOKEN
read -p "Enter GITHUB_BACKUP_REPO (e.g., user/repo, optional): " GITHUB_BACKUP_REPO

echo ""
echo -e "${CYAN}=== Web Server Configuration ===${NC}"
echo ""

read -p "Enter WEB_PORT [3001]: " WEB_PORT
WEB_PORT=${WEB_PORT:-3001}

read -p "Enter CLIENT_ORIGIN [http://localhost:5173]: " CLIENT_ORIGIN
CLIENT_ORIGIN=${CLIENT_ORIGIN:-http://localhost:5173}

echo ""
echo -e "${CYAN}=== Confirmation ===${NC}"
echo ""
echo "Bot Configuration:"
echo "  BOT_TOKEN: ${BOT_TOKEN:0:10}..."
echo "  BOT_NAME: $BOT_NAME"
echo "  MAIN_ADMIN_ID: $MAIN_ADMIN_ID"
echo "  ADMIN_IDS: ${ADMIN_IDS:-<none>}"
echo ""
echo "Security:"
echo "  JWT_SECRET: ${JWT_SECRET:0:10}..."
echo ""
echo "Web Server:"
echo "  WEB_PORT: $WEB_PORT"
echo "  CLIENT_ORIGIN: $CLIENT_ORIGIN"
echo ""
read -p "Proceed with these settings? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Configuration cancelled"
    exit 0
fi

# ── 2. Create/Update .env files ───────────────────
echo ""
echo "Creating .env files..."

# Main bot .env
echo "Creating .env (bot)..."
cat > .env << EOF
BOT_TOKEN=$BOT_TOKEN
BOT_NAME=$BOT_NAME
ADMIN_IDS=$ADMIN_IDS
MAIN_ADMIN_ID=$MAIN_ADMIN_ID
DATABASE_PATH=./bot.db
BINANCE_API_KEY=$BINANCE_API_KEY
BINANCE_API_SECRET=$BINANCE_API_SECRET
GITHUB_BACKUP_TOKEN=$GITHUB_BACKUP_TOKEN
GITHUB_BACKUP_REPO=$GITHUB_BACKUP_REPO
EOF

# Web server .env
echo "Creating web/server/.env..."
mkdir -p web/server
cat > web/server/.env << EOF
BOT_TOKEN=$BOT_TOKEN
BOT_NAME=$BOT_NAME
JWT_SECRET=$JWT_SECRET
WEB_PORT=$WEB_PORT
CLIENT_ORIGIN=$CLIENT_ORIGIN
MAIN_ADMIN_ID=$MAIN_ADMIN_ID
EOF

# Web client .env
echo "Creating web/client/.env..."
mkdir -p web/client
cat > web/client/.env << EOF
VITE_BOT_NAME=$BOT_NAME
VITE_API_URL=http://localhost:$WEB_PORT/api
EOF

echo ""
echo -e "${GREEN}✓ All .env files created successfully!${NC}"
echo ""
echo "Files created:"
echo "  - .env (bot)"
echo "  - web/server/.env (API server)"
echo "  - web/client/.env (React app)"
echo ""
echo -e "${YELLOW}SECURITY WARNING:${NC}"
echo "  - Never commit .env files to Git!"
echo "  - Keep your BOT_TOKEN and JWT_SECRET safe"
echo "  - Change JWT_SECRET in production"
echo ""
echo "Next step: Run setup script"
echo "  Regular user: ./setup-termux.sh"
echo "  Root user:    ./setup-termux-root.sh"
echo ""
