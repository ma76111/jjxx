#!/bin/bash

# ============================================================
#  Referral Bot + Web Dashboard  -  Linux/Ubuntu Launcher
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

mkdir -p "$SCRIPT_DIR/logs"

# ============================================================
#  HELPERS
# ============================================================

check_node() {
    if ! command -v node &>/dev/null; then
        echo -e "${RED}ERROR: Node.js is not installed.${NC}"
        echo ""
        echo "Install with:"
        echo "  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
        echo "  sudo apt-get install -y nodejs"
        echo ""
        return 1
    fi
    echo -e "${GREEN}[OK] Node.js $(node -v) found${NC}"
    return 0
}

check_localtunnel() {
    if ! command -v lt &>/dev/null; then
        echo "LocalTunnel not found. Installing globally..."
        npm install -g localtunnel
        if [ $? -ne 0 ]; then
            echo -e "${RED}ERROR: Failed to install LocalTunnel.${NC}"
            echo "Try manually: npm install -g localtunnel"
            return 1
        fi
        echo -e "${GREEN}[OK] LocalTunnel installed${NC}"
    else
        echo -e "${GREEN}[OK] LocalTunnel found${NC}"
    fi
    return 0
}

install_deps() {
    echo "Checking dependencies..."

    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        echo "Installing bot dependencies..."
        (cd "$SCRIPT_DIR" && npm install)
        if [ $? -ne 0 ]; then
            echo -e "${RED}ERROR: Failed to install bot dependencies.${NC}"
            return 1
        fi
        echo -e "${GREEN}[OK] Bot dependencies installed${NC}"
    else
        echo -e "${GREEN}[OK] Bot dependencies ready${NC}"
    fi

    if [ ! -d "$SCRIPT_DIR/web/server/node_modules" ]; then
        echo "Installing server dependencies..."
        (cd "$SCRIPT_DIR/web/server" && npm install)
        if [ $? -ne 0 ]; then
            echo -e "${RED}ERROR: Failed to install server dependencies.${NC}"
            return 1
        fi
        echo -e "${GREEN}[OK] Server dependencies installed${NC}"
    else
        echo -e "${GREEN}[OK] Server dependencies ready${NC}"
    fi

    if [ ! -d "$SCRIPT_DIR/web/client/node_modules" ]; then
        echo "Installing client dependencies..."
        (cd "$SCRIPT_DIR/web/client" && npm install)
        if [ $? -ne 0 ]; then
            echo -e "${RED}ERROR: Failed to install client dependencies.${NC}"
            return 1
        fi
        echo -e "${GREEN}[OK] Client dependencies installed${NC}"
    else
        echo -e "${GREEN}[OK] Client dependencies ready${NC}"
    fi

    return 0
}

stop_all() {
    echo ""
    echo " ============================================================"
    echo "  STOPPING ALL SERVICES"
    echo " ============================================================"
    echo ""

    for PORT in 3001 5173; do
        PIDS=$(lsof -ti tcp:$PORT 2>/dev/null)
        if [ -n "$PIDS" ]; then
            echo "Killing processes on port $PORT..."
            echo "$PIDS" | xargs kill -9 2>/dev/null || true
        fi
    done

    for PIDFILE in /tmp/refbot_bot.pid /tmp/refbot_server.pid /tmp/refbot_client.pid /tmp/refbot_tunnel.pid; do
        if [ -f "$PIDFILE" ]; then
            PID=$(cat "$PIDFILE")
            kill -9 "$PID" 2>/dev/null || true
            rm -f "$PIDFILE"
            echo "Stopped PID $PID"
        fi
    done

    echo ""
    echo -e "${GREEN}Done. All services stopped.${NC}"
    echo ""
}

# ============================================================
#  SETUP: ask for config if .env missing or forced
# ============================================================

setup_env() {
    local FORCE="${1:-}"

    # Read existing values
    local CUR_BOT_TOKEN="" CUR_BOT_NAME="" CUR_ADMIN_ID=""
    local CUR_JWT_SECRET="" CUR_DB_PATH="./bot.db"
    local CUR_BINANCE_KEY="" CUR_BINANCE_SECRET=""
    local CUR_GH_TOKEN="" CUR_GH_REPO=""

    if [ -f "$SCRIPT_DIR/.env" ]; then
        CUR_BOT_TOKEN=$(grep  "^BOT_TOKEN="     "$SCRIPT_DIR/.env" | cut -d= -f2-)
        CUR_BOT_NAME=$(grep   "^BOT_NAME="      "$SCRIPT_DIR/.env" | cut -d= -f2-)
        CUR_ADMIN_ID=$(grep   "^MAIN_ADMIN_ID=" "$SCRIPT_DIR/.env" | cut -d= -f2-)
        CUR_DB_PATH=$(grep    "^DATABASE_PATH=" "$SCRIPT_DIR/.env" | cut -d= -f2-)
        CUR_BINANCE_KEY=$(grep "^BINANCE_API_KEY=" "$SCRIPT_DIR/.env" | cut -d= -f2-)
        CUR_BINANCE_SECRET=$(grep "^BINANCE_API_SECRET=" "$SCRIPT_DIR/.env" | cut -d= -f2-)
        CUR_GH_TOKEN=$(grep   "^GITHUB_BACKUP_TOKEN=" "$SCRIPT_DIR/.env" | cut -d= -f2-)
        CUR_GH_REPO=$(grep    "^GITHUB_BACKUP_REPO="  "$SCRIPT_DIR/.env" | cut -d= -f2-)
    fi
    if [ -f "$SCRIPT_DIR/web/server/.env" ]; then
        CUR_JWT_SECRET=$(grep "^JWT_SECRET=" "$SCRIPT_DIR/web/server/.env" | cut -d= -f2-)
    fi

    # Skip if all required values exist and not forced
    if [ -z "$FORCE" ] && [ -n "$CUR_BOT_TOKEN" ] && [ -n "$CUR_BOT_NAME" ] && \
       [ -n "$CUR_ADMIN_ID" ] && [ -n "$CUR_JWT_SECRET" ]; then
        echo -e "${GREEN}[OK] Configuration found${NC}"
        return 0
    fi

    clear
    echo ""
    echo " ============================================================"
    echo "  FIRST TIME SETUP  -  Configure your bot"
    echo " ============================================================"
    echo ""
    echo "  You need the following from @BotFather on Telegram:"
    echo "    - Bot Token"
    echo "    - Bot Username (without @)"
    echo "  And your Telegram user ID (get it from @userinfobot)"
    echo ""
    echo "  Press Enter to keep the current value shown in [brackets]."
    echo ""

    # BOT TOKEN
    echo " ------------------------------------------------------------"
    if [ -n "$CUR_BOT_TOKEN" ]; then
        read -p "  Bot Token [$CUR_BOT_TOKEN]: " INPUT
    else
        read -p "  Bot Token (from @BotFather): " INPUT
    fi
    [ -n "$INPUT" ] && CUR_BOT_TOKEN="$INPUT"
    if [ -z "$CUR_BOT_TOKEN" ]; then
        echo -e "${RED}ERROR: Bot token is required.${NC}"
        return 1
    fi

    # BOT NAME
    echo ""
    echo " ------------------------------------------------------------"
    if [ -n "$CUR_BOT_NAME" ]; then
        read -p "  Bot Username without @ [$CUR_BOT_NAME]: " INPUT
    else
        read -p "  Bot Username without @ (e.g. mybot_bot): " INPUT
    fi
    [ -n "$INPUT" ] && CUR_BOT_NAME="$INPUT"
    if [ -z "$CUR_BOT_NAME" ]; then
        echo -e "${RED}ERROR: Bot username is required.${NC}"
        return 1
    fi

    # ADMIN ID
    echo ""
    echo " ------------------------------------------------------------"
    if [ -n "$CUR_ADMIN_ID" ]; then
        read -p "  Your Telegram User ID [$CUR_ADMIN_ID]: " INPUT
    else
        read -p "  Your Telegram User ID (get from @userinfobot): " INPUT
    fi
    [ -n "$INPUT" ] && CUR_ADMIN_ID="$INPUT"
    if [ -z "$CUR_ADMIN_ID" ]; then
        echo -e "${RED}ERROR: Admin ID is required.${NC}"
        return 1
    fi

    # JWT SECRET
    echo ""
    echo " ------------------------------------------------------------"
    if [ -n "$CUR_JWT_SECRET" ]; then
        read -p "  JWT Secret [$CUR_JWT_SECRET]: " INPUT
    else
        read -p "  JWT Secret (min 32 chars, or Enter to auto-generate): " INPUT
    fi
    [ -n "$INPUT" ] && CUR_JWT_SECRET="$INPUT"
    if [ -z "$CUR_JWT_SECRET" ]; then
        CUR_JWT_SECRET="jwt_$(openssl rand -hex 16 2>/dev/null || echo ${RANDOM}${RANDOM}${RANDOM})_secret"
        echo -e "${GREEN}[OK] Auto-generated JWT secret${NC}"
    fi

    # BINANCE (optional)
    echo ""
    echo " ------------------------------------------------------------"
    echo "  Binance API Key (optional, for auto TXID verify - Enter to skip):"
    read -p "  > " INPUT
    [ -n "$INPUT" ] && CUR_BINANCE_KEY="$INPUT"

    if [ -n "$CUR_BINANCE_KEY" ]; then
        echo "  Binance API Secret:"
        read -p "  > " INPUT
        [ -n "$INPUT" ] && CUR_BINANCE_SECRET="$INPUT"
    fi

    # GITHUB BACKUP (optional)
    echo ""
    echo " ------------------------------------------------------------"
    echo "  GitHub Backup Token (optional, for DB backups - Enter to skip):"
    read -p "  > " INPUT
    [ -n "$INPUT" ] && CUR_GH_TOKEN="$INPUT"

    if [ -n "$CUR_GH_TOKEN" ]; then
        echo "  GitHub Repo (e.g. username/repo):"
        read -p "  > " INPUT
        [ -n "$INPUT" ] && CUR_GH_REPO="$INPUT"
    fi

    # Write root .env
    echo ""
    echo "Writing configuration files..."

    cat > "$SCRIPT_DIR/.env" <<EOF
BOT_TOKEN=${CUR_BOT_TOKEN}
BOT_NAME=${CUR_BOT_NAME}
ADMIN_IDS=${CUR_ADMIN_ID}
MAIN_ADMIN_ID=${CUR_ADMIN_ID}
DATABASE_PATH=${CUR_DB_PATH:-./bot.db}
BINANCE_API_KEY=${CUR_BINANCE_KEY}
BINANCE_API_SECRET=${CUR_BINANCE_SECRET}
GITHUB_BACKUP_TOKEN=${CUR_GH_TOKEN}
GITHUB_BACKUP_REPO=${CUR_GH_REPO}
EOF
    echo -e "${GREEN}[OK] .env written${NC}"

    # Write web/server/.env
    mkdir -p "$SCRIPT_DIR/web/server"
    cat > "$SCRIPT_DIR/web/server/.env" <<EOF
BOT_TOKEN=${CUR_BOT_TOKEN}
BOT_NAME=${CUR_BOT_NAME}
JWT_SECRET=${CUR_JWT_SECRET}
WEB_PORT=3001
CLIENT_ORIGIN=http://localhost:5173
MAIN_ADMIN_ID=${CUR_ADMIN_ID}
EOF
    echo -e "${GREEN}[OK] web/server/.env written${NC}"

    # Write web/client/.env
    mkdir -p "$SCRIPT_DIR/web/client"
    cat > "$SCRIPT_DIR/web/client/.env" <<EOF
VITE_BOT_NAME=${CUR_BOT_NAME}
VITE_API_URL=/api
EOF
    echo -e "${GREEN}[OK] web/client/.env written${NC}"

    echo ""
    echo " ============================================================"
    echo -e "  ${GREEN}Configuration saved!${NC}"
    echo ""
    echo "  Bot Token : ${CUR_BOT_TOKEN}"
    echo "  Bot Name  : ${CUR_BOT_NAME}"
    echo "  Admin ID  : ${CUR_ADMIN_ID}"
    echo " ============================================================"
    echo ""
    read -p "  Press Enter to continue..."
    return 0
}

# ============================================================
#  LOCAL MODE
# ============================================================

local_mode() {
    clear
    echo ""
    echo " ============================================================"
    echo "  LOCAL DEV MODE"
    echo " ============================================================"
    echo ""

    check_node || return
    install_deps || return

    echo ""
    echo "Starting services..."
    echo ""

    echo "[1/3] Telegram Bot..."
    node "$SCRIPT_DIR/index.js" >> "$SCRIPT_DIR/logs/bot.log" 2>&1 &
    echo $! > /tmp/refbot_bot.pid
    sleep 2
    echo -e "${GREEN}[OK] Bot running (PID $(cat /tmp/refbot_bot.pid))${NC}"

    echo "[2/3] Web Server (port 3001)..."
    (cd "$SCRIPT_DIR/web/server" && node index.js >> "$SCRIPT_DIR/logs/server.log" 2>&1) &
    echo $! > /tmp/refbot_server.pid
    sleep 3
    echo -e "${GREEN}[OK] Server running (PID $(cat /tmp/refbot_server.pid))${NC}"

    echo "[3/3] React Dev Server (port 5173)..."
    (cd "$SCRIPT_DIR/web/client" && npm run dev >> "$SCRIPT_DIR/logs/client.log" 2>&1) &
    echo $! > /tmp/refbot_client.pid
    sleep 6
    echo -e "${GREEN}[OK] Client running (PID $(cat /tmp/refbot_client.pid))${NC}"

    echo ""
    echo " ============================================================"
    echo -e "  ${GREEN}All services started!${NC}"
    echo ""
    echo "  Dashboard : http://localhost:5173"
    echo "  API       : http://localhost:3001"
    echo "  Health    : http://localhost:3001/health"
    echo ""
    echo -e "  ${CYAN}Live logs:${NC}"
    echo "    tail -f $SCRIPT_DIR/logs/bot.log"
    echo "    tail -f $SCRIPT_DIR/logs/server.log"
    echo "    tail -f $SCRIPT_DIR/logs/client.log"
    echo " ============================================================"
    echo ""
    read -p "  Open Dashboard in browser? (y/N): " OPEN
    [[ "$OPEN" =~ ^[Yy]$ ]] && xdg-open "http://localhost:5173" &>/dev/null || true
}

# ============================================================
#  PUBLIC MODE
# ============================================================

public_mode() {
    clear
    echo ""
    echo " ============================================================"
    echo "  PUBLIC MODE  (build + serve + tunnel on port 3001)"
    echo " ============================================================"
    echo ""

    check_node   || return
    check_localtunnel || return
    install_deps || return

    echo ""
    echo "Building React app for production..."
    echo "(This takes ~30-60 seconds the first time)"
    echo ""
    (cd "$SCRIPT_DIR/web/client" && npm run build)
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: React build failed. Check errors above.${NC}"
        return
    fi
    echo -e "${GREEN}[OK] React build complete${NC}"
    echo ""

    echo "Starting services..."
    echo ""

    echo "[1/2] Telegram Bot..."
    node "$SCRIPT_DIR/index.js" >> "$SCRIPT_DIR/logs/bot.log" 2>&1 &
    echo $! > /tmp/refbot_bot.pid
    sleep 2
    echo -e "${GREEN}[OK] Bot running (PID $(cat /tmp/refbot_bot.pid))${NC}"

    echo "[2/2] Web Server + Dashboard (port 3001)..."
    (cd "$SCRIPT_DIR/web/server" && node index.js >> "$SCRIPT_DIR/logs/server.log" 2>&1) &
    echo $! > /tmp/refbot_server.pid
    sleep 4
    echo -e "${GREEN}[OK] Server running (PID $(cat /tmp/refbot_server.pid))${NC}"

    echo ""
    echo "Enter a subdomain name for your public URL."
    echo "Example: mybot  =>  https://mybot.loca.lt"
    echo "(Leave blank for a random name)"
    echo ""
    read -p "  Subdomain: " SUBDOMAIN
    [ -z "$SUBDOMAIN" ] && SUBDOMAIN="refbot-$RANDOM"

    echo ""
    echo "Creating public tunnel for: $SUBDOMAIN"
    sleep 1

    lt --port 3001 --subdomain "$SUBDOMAIN" >> "$SCRIPT_DIR/logs/tunnel.log" 2>&1 &
    echo $! > /tmp/refbot_tunnel.pid
    sleep 5

    clear
    echo ""
    echo " ============================================================"
    echo -e "  ${GREEN}All services started!${NC}"
    echo ""
    echo -e "  ${CYAN}Public URL${NC} : https://$SUBDOMAIN.loca.lt"
    echo "  Local URL  : http://localhost:3001"
    echo "  Health     : http://localhost:3001/health"
    echo ""
    echo "  NOTE: On first visit click 'Continue'"
    echo "  Keep this terminal open while using the bot"
    echo ""
    echo -e "  ${CYAN}Live logs:${NC}"
    echo "    tail -f $SCRIPT_DIR/logs/server.log"
    echo "    tail -f $SCRIPT_DIR/logs/tunnel.log"
    echo " ============================================================"
    echo ""
    read -p "  Open public URL in browser? (y/N): " OPEN
    [[ "$OPEN" =~ ^[Yy]$ ]] && xdg-open "https://$SUBDOMAIN.loca.lt" &>/dev/null || true
}

# ============================================================
#  PRINT MENU
# ============================================================

print_menu() {
    clear
    echo ""
    echo " ============================================================"
    echo "  Referral Bot + Web Dashboard  -  Launcher"
    echo " ============================================================"
    echo ""
    echo " ------------------------------------------------------------"
    echo ""
    echo "  [1]  Local Dev       - Bot + API + React dev server (localhost)"
    echo "  [2]  Local + Public  - Bot + API + built app + public tunnel"
    echo "  [3]  Stop All        - Stop all running services"
    echo "  [4]  Reconfigure     - Edit bot token / admin ID / etc."
    echo "  [5]  Exit"
    echo ""
    echo " ------------------------------------------------------------"
    echo ""
}

# ============================================================
#  MAIN
# ============================================================

# Run setup on first launch (skipped if config already exists)
setup_env

# Main loop
while true; do
    print_menu
    read -p "  Choose (1-5): " CHOICE
    echo ""
    case "$CHOICE" in
        1) local_mode ;;
        2) public_mode ;;
        3) stop_all ;;
        4) setup_env "force" ;;
        5)
            clear
            echo ""
            echo "  Goodbye!"
            echo ""
            exit 0
            ;;
        *)
            echo "  Invalid choice. Try again."
            sleep 1
            ;;
    esac
    echo ""
    read -p "  Press Enter to return to menu..."
done
