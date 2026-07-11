#!/data/data/com.termux/files/usr/bin/bash

# ================================================================
# Public Tunnel Manager for Web Dashboard
# Manage public tunnel for web control panel access
# ================================================================

set -e

echo "🌐 Public Tunnel Manager"
echo "================================"
echo ""

# Check if localtunnel is installed
if ! command -v lt &> /dev/null; then
    echo "❌ LocalTunnel not installed!"
    echo "📦 Installing..."
    npm install -g localtunnel
    echo "✅ Installed"
fi

# Check if web server is running
if ! pm2 list | grep -q "web-server.*online"; then
    echo "⚠️  Web Server is not running!"
    read -p "Do you want to start it now? (y/n): " start_server
    if [ "$start_server" == "y" ]; then
        pm2 start web-server
        sleep 3
    else
        echo "❌ Web Server must be running first"
        exit 1
    fi
fi

echo "Choose connection method:"
echo "1. LocalTunnel (free)"
echo "2. Serveo (free)"
echo "3. Ngrok (requires account)"
echo ""
read -p "Your choice: " tunnel_choice

case $tunnel_choice in
    1)
        echo ""
        echo "📝 LocalTunnel - Temporary Domain"
        read -p "Enter custom subdomain (leave empty for random): " subdomain
        
        if [ -z "$subdomain" ]; then
            echo "🚀 Opening tunnel..."
            lt --port 3001
        else
            echo "🚀 Opening tunnel..."
            lt --port 3001 --subdomain "$subdomain"
        fi
        ;;
    
    2)
        echo ""
        echo "📝 Serveo - SSH Tunnel"
        read -p "Enter custom subdomain (leave empty for random): " subdomain
        
        if [ -z "$subdomain" ]; then
            echo "🚀 Opening tunnel..."
            ssh -R 80:localhost:3001 serveo.net
        else
            echo "🚀 Opening tunnel..."
            ssh -R ${subdomain}:80:localhost:3001 serveo.net
        fi
        ;;
    
    3)
        echo ""
        echo "📝 Ngrok"
        
        if ! command -v ngrok &> /dev/null; then
            echo "❌ Ngrok not installed!"
            echo "📥 Download from: https://ngrok.com/download"
            exit 1
        fi
        
        read -p "Enter Auth Token (from ngrok.com): " ngrok_token
        
        if [ ! -z "$ngrok_token" ]; then
            ngrok config add-authtoken "$ngrok_token"
        fi
        
        echo "🚀 Opening tunnel..."
        ngrok http 3001
        ;;
    
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
