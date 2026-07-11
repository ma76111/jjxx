#!/data/data/com.termux/files/usr/bin/bash

# ================================================================
# Telegram Bot Setup Script for Termux
# Complete automated setup for Telegram bot on Termux
# ================================================================

set -e

echo "🚀 Starting Termux Bot Setup..."
echo "================================"

# ── Verify Termux Environment ──
if [ ! -d "/data/data/com.termux" ]; then
    echo "❌ This script is designed for Termux only!"
    exit 1
fi

# ── Install Required Packages ──
install_dependencies() {
    echo ""
    echo "📦 Installing required packages..."
    
    apt update -y
    apt install -y nodejs git python build-essential sqlite
    
    if ! command -v pm2 &> /dev/null; then
        echo "📦 Installing PM2..."
        npm install -g pm2
    else
        echo "✅ PM2 already installed"
    fi
    
    echo "✅ All packages installed"
}

# ── Setup .env File ──
setup_env() {
    echo ""
    echo "⚙️ Setting up environment variables..."
    
    if [ -f ".env" ]; then
        echo "⚠️  .env file already exists"
        read -p "Do you want to recreate it? (y/n): " recreate
        if [ "$recreate" != "y" ]; then
            return
        fi
    fi
    
    echo ""
    echo "📝 Please enter the following information:"
    echo ""
    
    read -p "🤖 Enter Bot Token from @BotFather: " BOT_TOKEN
    read -p "📛 Enter Bot Name (without @): " BOT_NAME
    read -p "👤 Enter Main Admin Telegram ID: " MAIN_ADMIN_ID
    read -p "👥 Enter All Admin IDs (comma-separated): " ADMIN_IDS
    
    echo ""
    echo "🔑 Binance API (press Enter to skip):"
    read -p "Binance API Key: " BINANCE_API_KEY
    read -p "Binance API Secret: " BINANCE_API_SECRET
    
    echo ""
    echo "📂 GitHub Backup (press Enter to skip):"
    read -p "GitHub Token: " GITHUB_TOKEN
    read -p "GitHub Repo (username/repo): " GITHUB_REPO
    
    cat > .env << EOF
# Telegram Bot Configuration
BOT_TOKEN=$BOT_TOKEN
BOT_NAME=$BOT_NAME
ADMIN_IDS=$ADMIN_IDS
MAIN_ADMIN_ID=$MAIN_ADMIN_ID
DATABASE_PATH=./bot.db

# Binance API
BINANCE_API_KEY=$BINANCE_API_KEY
BINANCE_API_SECRET=$BINANCE_API_SECRET

# GitHub Backup
GITHUB_BACKUP_TOKEN=$GITHUB_TOKEN
GITHUB_BACKUP_REPO=$GITHUB_REPO
EOF
    
    echo "✅ .env file created"
}

# ── Setup Web Client .env ──
setup_web_client_env() {
    echo ""
    echo "🌐 Setting up Web Client..."
    
    if [ -f "web/client/.env" ]; then
        echo "⚠️  web/client/.env already exists"
        read -p "Do you want to recreate it? (y/n): " recreate
        if [ "$recreate" != "y" ]; then
            return
        fi
    fi
    
    source .env
    
    echo ""
    read -p "🌍 Enter public domain from LocalTunnel or Serveo (e.g., https://xxx.loca.lt): " PUBLIC_DOMAIN
    
    cat > web/client/.env << EOF
# Web Client Configuration
VITE_BOT_NAME=$BOT_NAME
VITE_API_URL=${PUBLIC_DOMAIN}/api
EOF
    
    echo "✅ web/client/.env created"
}

# ── Install Node Dependencies ──
install_node_packages() {
    echo ""
    echo "📦 Installing Node.js packages..."
    
    echo "📦 Installing root packages..."
    npm install
    
    if [ -d "web/server" ]; then
        echo "📦 Installing server packages..."
        cd web/server && npm install && cd ../..
    fi
    
    if [ -d "web/client" ]; then
        echo "📦 Installing client packages..."
        cd web/client && npm install && cd ../..
    fi
    
    echo "✅ All packages installed"
}

# ── Build Web Client ──
build_client() {
    echo ""
    echo "🔨 Building web client..."
    
    if [ -d "web/client" ]; then
        cd web/client
        npm run build
        cd ../..
        echo "✅ Client built successfully"
    fi
}

# ── Setup Database ──
setup_database() {
    echo ""
    echo "🗄️ Setting up database..."
    
    if [ -f "bot.db" ]; then
        echo "⚠️  Database already exists"
    else
        echo "✅ Database will be created on first run"
    fi
}

# ── Create PM2 Ecosystem File ──
create_pm2_config() {
    echo ""
    echo "⚙️ Creating PM2 config..."
    
    cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: 'telegram-bot',
      script: 'index.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'web-server',
      script: 'web/server/index.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
EOF
    
    echo "✅ PM2 config created"
}

# ── Create Logs Directory ──
create_logs_dir() {
    echo ""
    echo "📁 Creating logs directory..."
    mkdir -p logs
    echo "✅ Logs directory created"
}

# ── Install LocalTunnel ──
install_tunnel() {
    echo ""
    echo "🌐 Installing LocalTunnel for public domain..."
    
    if ! command -v lt &> /dev/null; then
        npm install -g localtunnel
        echo "✅ LocalTunnel installed"
    else
        echo "✅ LocalTunnel already installed"
    fi
}

# ── Start Services ──
start_services() {
    echo ""
    echo "🚀 Starting services..."
    
    pm2 delete all 2>/dev/null || true
    pm2 start ecosystem.config.cjs
    pm2 save
    pm2 startup
    
    echo ""
    echo "✅ Services started successfully!"
    echo ""
    echo "📊 Service Status:"
    pm2 status
    
    echo ""
    echo "🌐 To open Web Dashboard publicly, run:"
    echo "   lt --port 3001 --subdomain your-custom-name"
    echo ""
    echo "📝 Useful Commands:"
    echo "   pm2 status          - Show service status"
    echo "   pm2 logs            - Show logs"
    echo "   pm2 restart all     - Restart services"
    echo "   pm2 stop all        - Stop services"
    echo "   pm2 delete all      - Remove services"
}

# ── Main Menu ──
main_menu() {
    echo ""
    echo "================================"
    echo "   🤖 Telegram Bot Setup"
    echo "================================"
    echo ""
    echo "Choose an option:"
    echo "1. Full installation (new setup)"
    echo "2. Update configuration only (.env)"
    echo "3. Rebuild web client"
    echo "4. Start services"
    echo "5. Stop services"
    echo "6. Show service status"
    echo "7. Show logs"
    echo "8. Open public tunnel (LocalTunnel)"
    echo "0. Exit"
    echo ""
    read -p "Your choice: " choice
    
    case $choice in
        1)
            install_dependencies
            setup_env
            install_node_packages
            setup_web_client_env
            build_client
            setup_database
            create_logs_dir
            create_pm2_config
            install_tunnel
            start_services
            ;;
        2)
            setup_env
            setup_web_client_env
            echo "✅ Configuration updated. Restart services to apply changes."
            ;;
        3)
            build_client
            pm2 restart web-server
            ;;
        4)
            start_services
            ;;
        5)
            pm2 stop all
            echo "✅ All services stopped"
            ;;
        6)
            pm2 status
            ;;
        7)
            pm2 logs
            ;;
        8)
            echo ""
            read -p "Enter custom subdomain (or leave empty): " subdomain
            if [ -z "$subdomain" ]; then
                lt --port 3001
            else
                lt --port 3001 --subdomain "$subdomain"
            fi
            ;;
        0)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice"
            main_menu
            ;;
    esac
}

# ── Execute ──
if [ "$1" == "--auto" ]; then
    install_dependencies
    setup_env
    install_node_packages
    setup_web_client_env
    build_client
    setup_database
    create_logs_dir
    create_pm2_config
    install_tunnel
    start_services
else
    main_menu
fi

echo ""
echo "✅ Done!"
