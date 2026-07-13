#!/bin/bash

# ════════════════════════════════════════
#   💻 Local Start Script (No Tunnel)
# ════════════════════════════════════════

set -e

clear
echo ""
echo "════════════════════════════════════════"
echo "   💻 Starting Locally"
echo "════════════════════════════════════════"
echo ""

# Kill any existing processes
echo "[1/3] Cleaning up..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 2

# Start Bot
echo "[2/3] Starting Bot & Server..."
npm start > /tmp/bot.log 2>&1 &
sleep 2

cd web/server
npm start > /tmp/server.log 2>&1 &
cd ../..
sleep 5

# Start Client
echo "[3/3] Starting Web Client..."
cd web/client
npm run dev -- --host 0.0.0.0 > /tmp/client.log 2>&1 &
cd ../..
sleep 8

clear
echo ""
echo "════════════════════════════════════════"
echo "   ✅ Running Locally!"
echo "════════════════════════════════════════"
echo ""
echo "💻 Open in browser:"
echo "   http://localhost:5173"
echo ""
echo "📊 View logs:"
echo "   tail -f /tmp/bot.log"
echo "   tail -f /tmp/server.log"
echo "   tail -f /tmp/client.log"
echo ""
echo "🔴 To stop:"
echo "   ./stop-ubuntu.sh"
echo ""

read -p "Press Enter to exit (services will continue running)..."
