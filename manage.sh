#!/data/data/com.termux/files/usr/bin/bash

# ================================================================
# Quick Management Script
# Quick bot management commands
# ================================================================

show_status() {
    echo "📊 Service Status:"
    echo "================================"
    pm2 status
    echo ""
    echo "💾 Memory Usage:"
    pm2 describe telegram-bot | grep "memory" || echo "N/A"
    pm2 describe web-server | grep "memory" || echo "N/A"
}

show_logs() {
    echo "Choose service:"
    echo "1. Telegram Bot"
    echo "2. Web Server"
    echo "3. All"
    read -p "Your choice: " choice
    
    case $choice in
        1) pm2 logs telegram-bot --lines 50 ;;
        2) pm2 logs web-server --lines 50 ;;
        3) pm2 logs --lines 50 ;;
        *) echo "❌ Invalid choice" ;;
    esac
}

restart_services() {
    echo "🔄 Restarting services..."
    pm2 restart all
    echo "✅ Services restarted"
    pm2 status
}

stop_services() {
    echo "⏸️  Stopping services..."
    pm2 stop all
    echo "✅ Services stopped"
}

start_services() {
    echo "▶️  Starting services..."
    pm2 start all
    echo "✅ Services started"
    pm2 status
}

backup_database() {
    echo "💾 Backing up database..."
    timestamp=$(date +%Y%m%d_%H%M%S)
    mkdir -p backups
    cp bot.db "backups/bot_${timestamp}.db"
    echo "✅ Backup saved: backups/bot_${timestamp}.db"
}

update_code() {
    echo "🔄 Updating code from GitHub..."
    
    if [ ! -d ".git" ]; then
        echo "❌ Not a Git repository"
        return
    fi
    
    git stash
    git pull origin main
    git stash pop
    
    echo "📦 Updating packages..."
    npm install
    
    if [ -d "web/server" ]; then
        cd web/server && npm install && cd ../..
    fi
    
    if [ -d "web/client" ]; then
        cd web/client && npm install && npm run build && cd../..
    fi
    
    echo "🔄 Restarting services..."
    pm2 restart all
    
    echo "✅ Update complete"
}

clean_logs() {
    echo "🧹 Cleaning log files..."
    pm2 flush
    rm -f logs/*.log
    echo "✅ Logs cleaned"
}

# Main Menu
echo ""
echo "================================"
echo "   🤖 Quick Bot Management"
echo "================================"
echo ""
echo "1. Service Status"
echo "2. View Logs"
echo "3. Restart Services"
echo "4. Stop Services"
echo "5. Start Services"
echo "6. Backup Database"
echo "7. Update Code"
echo "8. Clean Logs"
echo "9. Open Public Tunnel"
echo "0. Exit"
echo ""
read -p "Your choice: " choice

case $choice in
    1) show_status ;;
    2) show_logs ;;
    3) restart_services ;;
    4) stop_services ;;
    5) start_services ;;
    6) backup_database ;;
    7) update_code ;;
    8) clean_logs ;;
    9) bash start-tunnel.sh ;;
    0) echo "👋 Goodbye!" ;;
    *) echo "❌ Invalid choice" ;;
esac
