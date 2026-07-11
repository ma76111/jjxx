#!/data/data/com.termux/files/usr/bin/bash

# ================================================
# Stop all services (ROOT MODE)
# ================================================

echo "================================================"
echo "  Stopping Referral Bot (ROOT MODE)"
echo "================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "This script is for root only"
   exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "[ERROR] PM2 not found. Nothing to stop."
    exit 1
fi

# Stop all PM2 processes
echo "Stopping all PM2 processes..."
PM2_HOME=/root/.pm2 pm2 stop all

# Show status
echo ""
echo "Current status:"
PM2_HOME=/root/.pm2 pm2 list

echo ""
echo "================================================"
echo "  All services stopped"
echo "================================================"
echo ""
echo "To start again: ./start-termux-root.sh"
echo "To delete processes: pm2 delete all"
echo ""
