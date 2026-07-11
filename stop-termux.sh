#!/data/data/com.termux/files/usr/bin/bash

# ================================================
# Stop all Referral Bot services
# ================================================

echo "================================================"
echo "  Stopping Referral Bot Services"
echo "================================================"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "[ERROR] PM2 not found. Nothing to stop."
    exit 1
fi

# Stop all PM2 processes
echo "Stopping all PM2 processes..."
pm2 stop all

# Show status
echo ""
echo "Current status:"
pm2 list

echo ""
echo "================================================"
echo "  All services stopped"
echo "================================================"
echo ""
echo "To start again: ./start-termux.sh"
echo "To delete processes: pm2 delete all"
echo ""
