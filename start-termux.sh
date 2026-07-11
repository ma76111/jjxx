#!/data/data/com.termux/files/usr/bin/bash

# ================================================
# Referral Bot - Termux Startup Script
# For Android/Termux with PM2 and LocalTunnel
# ================================================

echo "================================================"
echo "  Referral Bot - Starting on Termux"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ── Check Node.js ─────────────────────────────────
echo -e "${YELLOW}[1/5] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js not found. Installing...${NC}"
    apt install nodejs -y
fi
echo -e "${GREEN}✓ Node.js: $(node -v)${NC}"
echo ""

# ── Check PM2 ─────────────────────────────────────
echo -e "${YELLOW}[2/5] Checking PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 not found. Installing...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}✓ PM2: $(pm2 -v)${NC}"
echo ""

# ── Install Dependencies ──────────────────────────
echo -e "${YELLOW}[3/5] Installing dependencies...${NC}"

# Bot dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing bot dependencies..."
    npm install --production
fi

# Web server dependencies
if [ ! -d "web/server/node_modules" ]; then
    echo "Installing server dependencies..."
    cd web/server && npm install --production && cd ../..
fi

# Web client dependencies (if building)
if [ ! -d "web/client/node_modules" ]; then
    echo "Installing client dependencies..."
    cd web/client && npm install && cd ../..
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# ── Build Client (if not built) ───────────────────
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
pm2 start index.js --name "referral-bot"

# Start web server
echo "Starting web server..."
pm2 start web/server/index.js --name "web-server"

# Start LocalTunnel for web access
echo "Starting LocalTunnel..."
if ! command -v lt &> /dev/null; then
    echo "Installing localtunnel..."
    npm install -g localtunnel
fi

# Start LocalTunnel with your subdomain
pm2 start "lt --port 3001 --subdomain vLa69OimVSeyqfnhYcW5zPsU2T7ENjGtg" --name "localtunnel"

echo ""
echo -e "${GREEN}✓ All services started!${NC}"
echo ""

# ── Save PM2 config ───────────────────────────────
pm2 save

# ── Show status ───────────────────────────────────
echo "================================================"
echo "  Services Status"
echo "================================================"
pm2 list
echo ""

# ── Show URLs ─────────────────────────────────────
echo "================================================"
echo "  Access URLs"
echo "================================================"
echo -e "${GREEN}Local API:${NC}    http://localhost:3001/health"
echo -e "${GREEN}Public URL:${NC}   https://vLa69OimVSeyqfnhYcW5zPsU2T7ENjGtg.loca.lt"
echo ""
echo -e "${YELLOW}Note:${NC} First time you visit, click 'Click to Continue'"
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
echo "Press Ctrl+C to exit (services will continue running)"
echo ""

# Keep script running to show logs
pm2 logs
