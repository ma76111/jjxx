#!/data/data/com.termux/files/usr/bin/bash

# ================================================
# First-time setup for Termux
# Run this once to install everything needed
# ================================================

echo "================================================"
echo "  Referral Bot - Termux Setup"
echo "================================================"
echo ""

# Update packages
echo "[1/4] Updating Termux packages..."
apt update -y && apt upgrade -y

# Install Node.js
echo ""
echo "[2/4] Installing Node.js..."
apt install nodejs -y

# Install Git (if needed)
echo ""
echo "[3/4] Installing Git..."
apt install git -y

# Install PM2 globally
echo ""
echo "[4/4] Installing PM2..."
npm install -g pm2

# Make scripts executable
echo ""
echo "Making scripts executable..."
chmod +x start-termux.sh
chmod +x stop-termux.sh
chmod +x restart-termux.sh

echo ""
echo "================================================"
echo "  Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Make sure your .env files are configured"
echo "2. Run: ./start-termux.sh"
echo ""
