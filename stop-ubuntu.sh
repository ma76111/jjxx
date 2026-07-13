#!/bin/bash

# ════════════════════════════════════════
#   🛑 Stop Script for Ubuntu/Linux
# ════════════════════════════════════════

echo ""
echo "════════════════════════════════════════"
echo "   🛑 Stopping All Services"
echo "════════════════════════════════════════"
echo ""

# Stop processes by PID
if [ -f /tmp/bot.pid ]; then
    BOT_PID=$(cat /tmp/bot.pid)
    kill -9 $BOT_PID 2>/dev/null && echo "✅ Bot stopped (PID: $BOT_PID)" || echo "⚠️  Bot not running"
    rm /tmp/bot.pid
fi

if [ -f /tmp/server.pid ]; then
    SERVER_PID=$(cat /tmp/server.pid)
    kill -9 $SERVER_PID 2>/dev/null && echo "✅ Server stopped (PID: $SERVER_PID)" || echo "⚠️  Server not running"
    rm /tmp/server.pid
fi

if [ -f /tmp/client.pid ]; then
    CLIENT_PID=$(cat /tmp/client.pid)
    kill -9 $CLIENT_PID 2>/dev/null && echo "✅ Client stopped (PID: $CLIENT_PID)" || echo "⚠️  Client not running"
    rm /tmp/client.pid
fi

if [ -f /tmp/tunnel.pid ]; then
    TUNNEL_PID=$(cat /tmp/tunnel.pid)
    kill -9 $TUNNEL_PID 2>/dev/null && echo "✅ Tunnel stopped (PID: $TUNNEL_PID)" || echo "⚠️  Tunnel not running"
    rm /tmp/tunnel.pid
fi

# Kill any remaining processes on ports
echo ""
echo "Cleaning up ports..."
lsof -ti:3001 | xargs kill -9 2>/dev/null && echo "✅ Port 3001 cleaned" || true
lsof -ti:5173 | xargs kill -9 2>/dev/null && echo "✅ Port 5173 cleaned" || true

# Clean up logs
rm -f /tmp/bot.log /tmp/server.log /tmp/client.log /tmp/tunnel.log

echo ""
echo "════════════════════════════════════════"
echo "   ✅ All Services Stopped"
echo "════════════════════════════════════════"
echo ""
