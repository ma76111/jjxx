#!/data/data/com.termux/files/usr/bin/bash

# ================================================
# Restart all Referral Bot services
# ================================================

echo "================================================"
echo "  Restarting Referral Bot Services"
echo "================================================"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "[ERROR] PM2 not found. Run ./start-termux.sh first"
    exit 1
fi

# Restart all PM2 processes
echo "Restarting all services..."
pm2 restart all

echo ""
echo "================================================"
echo "  Services restarted"
echo "================================================"
echo ""

pm2 list

echo ""
echo "View logs: pm2 logs"
echo ""
