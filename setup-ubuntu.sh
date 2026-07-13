#!/bin/bash

# ════════════════════════════════════════
#   🚀 Setup Script for Ubuntu/Linux
# ════════════════════════════════════════

set -e  # Exit on error

echo ""
echo "════════════════════════════════════════"
echo "   📦 Installing Dependencies"
echo "════════════════════════════════════════"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found!"
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js found: $(node -v)"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found!"
    exit 1
else
    echo "✅ npm found: $(npm -v)"
fi

# Install localtunnel globally
echo ""
echo "[1/4] Installing LocalTunnel..."
if ! command -v lt &> /dev/null; then
    sudo npm install -g localtunnel
    echo "✅ LocalTunnel installed"
else
    echo "✅ LocalTunnel already installed"
fi

# Install root dependencies
echo ""
echo "[2/4] Installing Bot dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Bot dependencies installed"
else
    echo "✅ Bot dependencies already installed"
fi

# Install web server dependencies
echo ""
echo "[3/4] Installing Web Server dependencies..."
cd web/server
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Web Server dependencies installed"
else
    echo "✅ Web Server dependencies already installed"
fi
cd ../..

# Install web client dependencies
echo ""
echo "[4/4] Installing Web Client dependencies..."
cd web/client
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Web Client dependencies installed"
else
    echo "✅ Web Client dependencies already installed"
fi
cd ../..

# Make deploy script executable
chmod +x deploy-ubuntu.sh

echo ""
echo "════════════════════════════════════════"
echo "   ✅ Setup Complete!"
echo "════════════════════════════════════════"
echo ""
echo "To start the project:"
echo "  ./deploy-ubuntu.sh"
echo ""
