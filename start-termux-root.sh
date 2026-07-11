#!/data/data/com.termux/files/usr/bin/bash

# ================================================
# Referral Bot - ROOT Startup Script
# For Termux running as root
# ================================================

echo "================================================"
echo "  Referral Bot - Starting (ROOT MODE)"
echo "================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "This script is for root only. Use ./start-termux.sh instead"
   exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── Check Node.js ─────────────────────────────────
echo -e "${YELLOW}[1/5] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js not found!${NC}"
    echo "Please install Node.js manually as root:"
    echo "  1. Download from nodejs.org"
    echo "  2. Or use: apt install nodejs (if available)"
    exit 1
fi
echo -e "${GREEN}✓ Node.js: $(node -v)${NC}"
echo ""

# ── Check PM2 ─────────────────────────────────────
echo -e "${YELLOW}[2/5] Checking PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2 globally..."
    npm install -g pm2 --unsafe-perm=true --allow-root
fi
echo -e "${GREEN}✓ PM2: $(pm2 -v)${NC}"
echo ""

# ── Install Dependencies ──────────────────────────
echo -e "${YELLOW}[3/5] Installing dependencies...${NC}"

# Bot dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing bot dependencies..."
    npm install --production --unsafe-perm=true --allow-root
fi

# Web server dependencies
if [ ! -d "web/server/node_modules" ]; then
    echo "Installing server dependencies..."
    cd web/server && npm install --production --unsafe-perm=true --allow-root && cd ../..
fi

# Web client dependencies
if [ ! -d "web/client/node_modules" ]; then
    echo "Installing client dependencies..."
    cd web/client && npm install --unsafe-perm=true --allow-root && cd ../..
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# ── Build Client ──────────────────────────────────
echo -e "${YELLOW}[4/5] Building web client...${NC}"
if [ ! -d "web/client/dist" ]; then
    echo "Building React app..."
    cd web/client && npm run build && cd ../..
    echo -e "${GREEN}✓ Client built${NC}"
else
    echo -e "${GREEN}✓ Client already built${NC}"
fi
echo ""

# ── Start with PM2 ────────────────────────────────
echo -e "${YELLOW}[5/5] Starting services with PM2...${NC}"

# Stop existing processes
pm2 delete all 2>/dev/null || true

# Start bot
echo "Starting Telegram bot..."
PM2_HOME=/root/.pm2 pm2 start index.js --name "referral-bot"

# Start web server
echo "Starting web server..."
PM2_HOME=/root/.pm2 pm2 start web/server/index.js --name "web-server"

# Check LocalTunnel
if ! command -v lt &> /dev/null; then
    echo "Installing LocalTunnel..."
    npm install -g localtunnel --unsafe-perm=true --allow-root
fi

# Start LocalTunnel (random subdomain to avoid conflicts)
echo "Starting LocalTunnel..."
PM2_HOME=/root/.pm2 pm2 start "lt --port 3001" --name "localtunnel"

echo ""
echo -e "${GREEN}✓ All services started!${NC}"
echo ""

# ── Save PM2 config ───────────────────────────────
PM2_HOME=/root/.pm2 pm2 save

# ── Show status ───────────────────────────────────
echo "================================================"
echo "  Services Status"
echo "================================================"
PM2_HOME=/root/.pm2 pm2 list
echo ""

# ── Show URLs ─────────────────────────────────────
echo "================================================"
echo "  Access URLs"
echo "================================================"
echo -e "${GREEN}Local API:${NC}    http://localhost:3001/health"
echo ""
echo -e "${YELLOW}Getting public URL...${NC}"
sleep 3
echo -e "${GREEN}Public URL:${NC}"
PM2_HOME=/root/.pm2 pm2 logs localtunnel --lines 10 --nostream | grep -o "https://.*\.loca\.lt" | head -1
echo ""
echo -e "${YELLOW}Note:${NC} First time you visit, click 'Click to Continue'"
echo -e "${YELLOW}Tip:${NC}  Run 'pm2 logs localtunnel' to see the full URL anytime"
echo "================================================"
echo ""

# ── Useful commands ───────────────────────────────
echo "Useful commands:"
echo "  pm2 list          - Show all processes"
echo "  pm2 logs          - Show logs"
echo "  pm2 restart all   - Restart all services"
echo "  pm2 stop all      - Stop all services"
echo "  pm2 delete all    - Delete all processes"
echo ""
echo "⚠️  Running as ROOT - be careful!"
echo ""
echo "Press Ctrl+C to exit (services will continue running)"
echo ""

# Keep script running to show logs
PM2_HOME=/root/.pm2 pm2 logs
