#!/bin/bash

# ════════════════════════════════════════
#   🚀 Deploy Script for Ubuntu/Linux
# ════════════════════════════════════════

set -e  # Exit on error

clear
echo ""
echo "════════════════════════════════════════"
echo "   🚀 Starting Online Deployment"
echo "════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════
# Configure .env files if not configured
# ═══════════════════════════════════════

configure_env() {
    echo "════════════════════════════════════════"
    echo "   ⚙️  Configuration Setup"
    echo "════════════════════════════════════════"
    echo ""
    
    # Check if .env exists and has BOT_TOKEN
    if [ ! -f ".env" ] || ! grep -q "BOT_TOKEN=.*[^=]" .env; then
        echo "📝 Root .env configuration needed"
        echo ""
        
        read -p "Enter your BOT_TOKEN (from @BotFather): " BOT_TOKEN
        read -p "Enter your BOT_NAME (e.g., mybot_bot): " BOT_NAME
        read -p "Enter ADMIN_IDS (comma-separated Telegram IDs): " ADMIN_IDS
        read -p "Enter MAIN_ADMIN_ID (your Telegram ID): " MAIN_ADMIN_ID
        
        cat > .env << EOF
BOT_TOKEN=$BOT_TOKEN
BOT_NAME=$BOT_NAME
ADMIN_IDS=$ADMIN_IDS
MAIN_ADMIN_ID=$MAIN_ADMIN_ID
DATABASE_PATH=./bot.db
BINANCE_API_KEY=
BINANCE_API_SECRET=
GITHUB_BACKUP_TOKEN=
GITHUB_BACKUP_REPO=
EOF
        echo "✅ Root .env configured"
        echo ""
    else
        echo "✅ Root .env already configured"
        echo ""
    fi
    
    # Configure web/server/.env
    if [ ! -f "web/server/.env" ] || ! grep -q "BOT_TOKEN=.*[^=]" web/server/.env; then
        echo "📝 Web Server .env configuration needed"
        echo ""
        
        # Read from root .env or ask again
        if [ -f ".env" ]; then
            source .env
        fi
        
        if [ -z "$BOT_TOKEN" ]; then
            read -p "Enter your BOT_TOKEN: " BOT_TOKEN
        fi
        if [ -z "$BOT_NAME" ]; then
            read -p "Enter your BOT_NAME: " BOT_NAME
        fi
        if [ -z "$MAIN_ADMIN_ID" ]; then
            read -p "Enter MAIN_ADMIN_ID: " MAIN_ADMIN_ID
        fi
        
        # Generate random JWT secret if not provided
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
    else
        echo "✅ Web Server .env already configured"
        echo ""
    fi
    
    # Configure web/client/.env
    if [ ! -f "web/client/.env" ] || ! grep -q "VITE_BOT_NAME=.*[^=]" web/client/.env; then
        echo "📝 Web Client .env configuration needed"
        echo ""
        
        # Read BOT_NAME from root .env
        if [ -f ".env" ]; then
            source .env
        fi
        
        if [ -z "$BOT_NAME" ]; then
            read -p "Enter your BOT_NAME: " BOT_NAME
        fi
        
        cat > web/client/.env << EOF
VITE_BOT_NAME=$BOT_NAME
VITE_API_URL=http://localhost:3001/api
EOF
        echo "✅ Web Client .env configured"
        echo ""
    else
        echo "✅ Web Client .env already configured"
        echo ""
    fi
    
    echo "════════════════════════════════════════"
    echo ""
    sleep 2
}

# Run configuration
configure_env

# ═══════════════════════════════════════
# Check dependencies
# ═══════════════════════════════════════

# Check if localtunnel is installed
if ! command -v lt &> /dev/null; then
    echo "[!] Installing LocalTunnel..."
    sudo npm install -g localtunnel
fi

# Kill any existing processes on ports
echo "[1/5] Cleaning up old processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 2

# Start Bot
echo "[2/5] Starting Bot..."
npm start > /tmp/bot.log 2>&1 &
BOT_PID=$!
echo "   Bot PID: $BOT_PID"
sleep 3

# Start Web Server
echo "[3/5] Starting Web Server..."
cd web/server
npm start > /tmp/server.log 2>&1 &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"
cd ../..
sleep 5

# Start Web Client
echo "[4/5] Starting Web Client..."
cd web/client
npm run dev -- --host 0.0.0.0 > /tmp/client.log 2>&1 &
CLIENT_PID=$!
echo "   Client PID: $CLIENT_PID"
cd ../..
sleep 10

# Create Tunnel
echo "[5/5] Creating public tunnel..."
echo ""
read -p "Enter subdomain name (or press Enter for random): " SUBDOMAIN

if [ -z "$SUBDOMAIN" ]; then
    SUBDOMAIN="mybot-$RANDOM"
    echo "Using random subdomain: $SUBDOMAIN"
fi

echo ""
echo "Creating tunnel..."
sleep 2

# Start tunnel in background
lt --port 5173 --subdomain $SUBDOMAIN > /tmp/tunnel.log 2>&1 &
TUNNEL_PID=$!

sleep 5

# Get the URL from tunnel log
TUNNEL_URL=$(grep -oP 'https://[^\s]+' /tmp/tunnel.log | head -1)

clear
echo ""
echo "════════════════════════════════════════"
echo "   ✅ Deployment Successful!"
echo "════════════════════════════════════════"
echo ""
echo "📡 Public URL:"
echo "   $TUNNEL_URL"
echo ""
echo "💻 Local URL:"
echo "   http://localhost:5173"
echo ""
echo "📋 Process IDs:"
echo "   Bot:    $BOT_PID"
echo "   Server: $SERVER_PID"
echo "   Client: $CLIENT_PID"
echo "   Tunnel: $TUNNEL_PID"
echo ""
echo "⚠️  Notes:"
echo "   • First visit: click 'Continue'"
echo "   • Keep terminal open"
echo ""
echo "🔴 To stop all services:"
echo "   ./stop-ubuntu.sh"
echo ""
echo "📊 To view logs:"
echo "   tail -f /tmp/bot.log"
echo "   tail -f /tmp/server.log"
echo "   tail -f /tmp/client.log"
echo "   tail -f /tmp/tunnel.log"
echo ""

# Save PIDs to file for cleanup
echo "$BOT_PID" > /tmp/bot.pid
echo "$SERVER_PID" > /tmp/server.pid
echo "$CLIENT_PID" > /tmp/client.pid
echo "$TUNNEL_PID" > /tmp/tunnel.pid

# Wait for user input
read -p "Press Enter to exit (services will continue running)..."
