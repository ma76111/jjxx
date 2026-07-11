#!/bin/bash

# ================================================
# Referral Bot Launcher (Local Development)
# For Linux/Mac/WSL
# ================================================

echo "================================================"
echo "  Referral Bot - Starting all services"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js not found. Install from https://nodejs.org${NC}"
    exit 1
fi

# Install dependencies if missing
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[1/3] Installing bot dependencies...${NC}"
    npm install --silent
fi

if [ ! -d "web/server/node_modules" ]; then
    echo -e "${YELLOW}[2/3] Installing server dependencies...${NC}"
    cd web/server && npm install --silent && cd ../..
fi

if [ ! -d "web/client/node_modules" ]; then
    echo -e "${YELLOW}[3/3] Installing client dependencies...${NC}"
    cd web/client && npm install --silent && cd ../..
fi

echo ""
echo -e "${BLUE}[BOT]${NC}    Starting Telegram bot..."
node index.js &
BOT_PID=$!

sleep 2

echo -e "${YELLOW}[SERVER]${NC} Starting Web server on port 3001..."
node web/server/index.js &
SERVER_PID=$!

sleep 2

echo -e "${GREEN}[CLIENT]${NC} Starting React dev server on port 5173..."
cd web/client && npm run dev &
CLIENT_PID=$!
cd ../..

echo ""
echo "================================================"
echo "  All services started!"
echo ""
echo "  Bot:    PID $BOT_PID"
echo "  API:    http://localhost:3001/health (PID $SERVER_PID)"
echo "  Web:    http://localhost:5173 (PID $CLIENT_PID)"
echo "================================================"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Trap Ctrl+C and kill all processes
trap "echo ''; echo 'Stopping all services...'; kill $BOT_PID $SERVER_PID $CLIENT_PID 2>/dev/null; exit" INT

# Wait for all background jobs
wait
