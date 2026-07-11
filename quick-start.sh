#!/data/data/com.termux/files/usr/bin/bash

# ================================================
# Referral Bot - Quick Start (All-in-One)
# Configure + Build + Start with ngrok
# ================================================

clear
echo "================================================"
echo "  Referral Bot - Quick Start Setup"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ════════════════════════════════════════════════
# STEP 1: COLLECT CONFIGURATION
# ════════════════════════════════════════════════
echo -e "${BLUE}[STEP 1/6] Configuration${NC}"
echo ""

# Bot Token
echo -n "Enter your Telegram BOT_TOKEN: "
read BOT_TOKEN

# Bot Name
echo -n "Enter BOT_NAME (e.g., MyReferralBot): "
read BOT_NAME

# Main Admin ID
echo -n "Enter MAIN_ADMIN_ID (your Telegram user ID): "
read MAIN_ADMIN_ID

# Additional Admin IDs
echo -n "Enter ADMIN_IDS (comma-separated, optional): "
read ADMIN_IDS_INPUT
if [ -z "$ADMIN_IDS_INPUT" ]; then
  ADMIN_IDS="$MAIN_ADMIN_ID"
else
  ADMIN_IDS="$MAIN_ADMIN_ID,$ADMIN_IDS_INPUT"
fi

# JWT Secret
echo ""
echo "JWT_SECRET options:"
echo "  1. Auto-generate strong secret (recommended)"
echo "  2. Enter custom secret"
echo -n "Choose [1/2]: "
read JWT_CHOICE

if [ "$JWT_CHOICE" = "2" ]; then
  echo -n "Enter JWT_SECRET: "
  read JWT_SECRET
else
  JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
  echo -e "${GREEN}✓ Generated JWT_SECRET${NC}"
fi

# Binance API (optional)
echo ""
echo -n "Do you have Binance API credentials? [y/N]: "
read HAS_BINANCE
if [[ "$HAS_BINANCE" =~ ^[Yy]$ ]]; then
  echo -n "Enter BINANCE_API_KEY: "
  read BINANCE_API_KEY
  echo -n "Enter BINANCE_API_SECRET: "
  read BINANCE_API_SECRET
else
  BINANCE_API_KEY=""
  BINANCE_API_SECRET=""
fi

# GitHub Backup (optional)
echo ""
echo -n "Enable GitHub backup? [y/N]: "
read ENABLE_GITHUB
if [[ "$ENABLE_GITHUB" =~ ^[Yy]$ ]]; then
  echo -n "Enter GITHUB_TOKEN: "
  read GITHUB_TOKEN
  echo -n "Enter GITHUB_REPO (user/repo): "
  read GITHUB_REPO
else
  GITHUB_TOKEN=""
  GITHUB_REPO=""
fi

# Web Server Port
echo ""
echo -n "Enter WEB_PORT [3001]: "
read WEB_PORT_INPUT
WEB_PORT=${WEB_PORT_INPUT:-3001}

# ngrok Auth Token
echo ""
echo -n "Enter your NGROK_AUTH_TOKEN: "
read NGROK_AUTH_TOKEN

echo ""
echo -e "${GREEN}✓ Configuration collected${NC}"
echo ""

# ════════════════════════════════════════════════
# STEP 2: CREATE .env FILES
# ════════════════════════════════════════════════
echo -e "${BLUE}[STEP 2/6] Creating configuration files${NC}"

# Main bot .env
cat > .env << EOF
# Bot Configuration
BOT_TOKEN=$BOT_TOKEN
BOT_NAME=$BOT_NAME

# Admin Configuration
MAIN_ADMIN_ID=$MAIN_ADMIN_ID
ADMIN_IDS=$ADMIN_IDS

# Security
JWT_SECRET=$JWT_SECRET

# Binance API (optional)
BINANCE_API_KEY=$BINANCE_API_KEY
BINANCE_API_SECRET=$BINANCE_API_SECRET

# GitHub Backup (optional)
GITHUB_TOKEN=$GITHUB_TOKEN
GITHUB_REPO=$GITHUB_REPO
EOF

echo -e "${GREEN}✓ Created .env${NC}"

# Web server .env
mkdir -p web/server
cat > web/server/.env << EOF
PORT=$WEB_PORT
BOT_TOKEN=$BOT_TOKEN
JWT_SECRET=$JWT_SECRET
CLIENT_ORIGIN=http://localhost:5173
EOF

echo -e "${GREEN}✓ Created web/server/.env${NC}"

# Web client .env
mkdir -p web/client
cat > web/client/.env << EOF
VITE_API_URL=http://localhost:$WEB_PORT
EOF

echo -e "${GREEN}✓ Created web/client/.env${NC}"
echo ""

# ════════════════════════════════════════════════
# STEP 3: INSTALL DEPENDENCIES
# ════════════════════════════════════════════════
echo -e "${BLUE}[STEP 3/6] Installing dependencies${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Installing Node.js...${NC}"
    apt update && apt install nodejs -y
fi
echo -e "${GREEN}✓ Node.js: $(node -v)${NC}"

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Installing PM2...${NC}"
    npm install -g pm2 --unsafe-perm=true --allow-root
fi
echo -e "${GREEN}✓ PM2: $(pm2 -v)${NC}"

# Check ngrok
if ! command -v ngrok &> /dev/null; then
    echo -e "${YELLOW}Installing ngrok...${NC}"
    npm install -g ngrok --unsafe-perm=true --allow-root
fi
echo -e "${GREEN}✓ ngrok installed${NC}"

# Install bot dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing bot dependencies..."
    npm install --production --unsafe-perm=true --allow-root
fi

# Install server dependencies
if [ ! -d "web/server/node_modules" ]; then
    echo "Installing server dependencies..."
    cd web/server && npm install --production --unsafe-perm=true --allow-root && cd ../..
fi

# Install client dependencies
if [ ! -d "web/client/node_modules" ]; then
    echo "Installing client dependencies..."
    cd web/client && npm install --unsafe-perm=true --allow-root && cd ../..
fi

echo -e "${GREEN}✓ All dependencies installed${NC}"
echo ""

# ════════════════════════════════════════════════
# STEP 4: BUILD CLIENT
# ════════════════════════════════════════════════
echo -e "${BLUE}[STEP 4/6] Building web client${NC}"

# Clean cache
rm -rf web/client/dist
rm -rf web/client/node_modules/.vite
rm -rf web/client/node_modules/.cache

cd web/client && npm run build && cd ../..
echo -e "${GREEN}✓ Client built successfully${NC}"
echo ""

# ════════════════════════════════════════════════
# STEP 5: CONFIGURE NGROK
# ════════════════════════════════════════════════
echo -e "${BLUE}[STEP 5/6] Configuring ngrok${NC}"

ngrok config add-authtoken $NGROK_AUTH_TOKEN
echo -e "${GREEN}✓ ngrok configured${NC}"
echo ""

# ════════════════════════════════════════════════
# STEP 6: START SERVICES
# ════════════════════════════════════════════════
echo -e "${BLUE}[STEP 6/6] Starting services${NC}"

# Stop existing processes
pm2 delete all 2>/dev/null || true

# Start bot
echo "Starting Telegram bot..."
PM2_HOME=/root/.pm2 pm2 start index.js --name "referral-bot"

# Start web server
echo "Starting web server..."
PM2_HOME=/root/.pm2 pm2 start web/server/index.js --name "web-server"

# Start ngrok
echo "Starting ngrok tunnel..."
PM2_HOME=/root/.pm2 pm2 start "ngrok http $WEB_PORT" --name "ngrok-tunnel"

# Save PM2 config
PM2_HOME=/root/.pm2 pm2 save

echo ""
echo -e "${GREEN}✓ All services started!${NC}"
echo ""

# ════════════════════════════════════════════════
# SHOW STATUS & URLs
# ════════════════════════════════════════════════
echo "================================================"
echo "  Services Status"
echo "================================================"
PM2_HOME=/root/.pm2 pm2 list
echo ""

sleep 5

echo "================================================"
echo "  Access URLs"
echo "================================================"
echo -e "${GREEN}Local API:${NC}    http://localhost:$WEB_PORT/health"
echo ""
echo -e "${YELLOW}Getting ngrok URL...${NC}"
sleep 2
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)
if [ -z "$NGROK_URL" ]; then
  echo -e "${YELLOW}Run 'pm2 logs ngrok-tunnel' to see the ngrok URL${NC}"
else
  echo -e "${GREEN}Public URL:${NC}   $NGROK_URL"
fi
echo "================================================"
echo ""

# ════════════════════════════════════════════════
# USEFUL COMMANDS
# ════════════════════════════════════════════════
echo "Useful commands:"
echo "  pm2 list                    - Show all processes"
echo "  pm2 logs                    - Show all logs"
echo "  pm2 logs ngrok-tunnel       - See ngrok URL"
echo "  pm2 restart all             - Restart services"
echo "  pm2 stop all                - Stop services"
echo "  pm2 delete all              - Delete processes"
echo "  curl http://localhost:4040/api/tunnels | grep public_url  - Get ngrok URL"
echo ""
echo -e "${GREEN}✓ Setup complete! Your bot is running!${NC}"
echo ""
echo "Press Ctrl+C to exit (services will continue running)"
echo ""

# Keep showing logs
PM2_HOME=/root/.pm2 pm2 logs
