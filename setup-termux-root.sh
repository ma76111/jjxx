#!/data/data/com.termux/files/usr/bin/bash

# ================================================
# First-time setup for Termux (ROOT MODE)
# Run this once as root to install everything
# ================================================

echo "================================================"
echo "  Referral Bot - Termux Setup (ROOT)"
echo "================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "This script must be run as root"
   exit 1
fi

echo "⚠️  WARNING: Running as ROOT"
echo "It's recommended to run without root privileges"
echo ""
read -p "Continue anyway? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo ""
echo "[1/4] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "Node.js not found!"
    echo "Please install Node.js manually:"
    echo "  1. apt install nodejs (if available)"
    echo "  2. Or download from https://nodejs.org"
    exit 1
else
    echo "✓ Node.js: $(node -v)"
fi

echo ""
echo "[2/4] Checking Git..."
if ! command -v git &> /dev/null; then
    echo "Git not found. Install manually if needed."
else
    echo "✓ Git: $(git --version)"
fi

echo ""
echo "[3/4] Installing PM2..."
npm install -g pm2 --unsafe-perm=true --allow-root

echo ""
echo "[4/4] Installing LocalTunnel..."
npm install -g localtunnel --unsafe-perm=true --allow-root

# Make scripts executable
echo ""
echo "Making scripts executable..."
chmod +x start-termux-root.sh
chmod +x stop-termux-root.sh
chmod +x restart-termux-root.sh

echo ""
echo "================================================"
echo "  Setup Complete! (ROOT MODE)"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Configure .env files"
echo "2. Run: ./start-termux-root.sh"
echo ""
echo "⚠️  Remember: Running as root is not recommended"
echo "   Consider using regular Termux user"
echo ""
