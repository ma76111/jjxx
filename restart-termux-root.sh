#!/data/data/com.termux/files/usr/bin/bash

# ================================================
# Restart all services (ROOT MODE)
# ================================================

echo "================================================"
echo "  Restarting Referral Bot (ROOT MODE)"
echo "================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "This script is for root only"
   exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "[ERROR] PM2 not found. Run ./setup-termux-root.sh first"
    exit 1
fi

# Restart all PM2 processes
echo "Restarting all services..."
PM2_HOME=/root/.pm2 pm2 restart all

echo ""
echo "================================================"
echo "  Services restarted"
echo "================================================"
echo ""

PM2_HOME=/root/.pm2 pm2 list

echo ""
echo "View logs: pm2 logs"
echo ""
