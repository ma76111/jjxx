@echo off
setlocal enabledelayedexpansion
title Referral Bot Launcher
color 0A
cd /d "%~dp0"

cls
echo.
echo  ============================================================
echo   Referral Bot + Web Dashboard  -  Launcher
echo  ============================================================
echo.

REM ============================================================
REM  First run: setup .env files if missing or incomplete
REM ============================================================
call :SETUP_ENV
if errorlevel 1 goto EXIT_CLEAN

:MENU
cls
echo.
echo  ============================================================
echo   Referral Bot + Web Dashboard  -  Launcher
echo  ============================================================
echo.
echo  ------------------------------------------------------------
echo.
echo   [1]  Local Dev       - Bot + API + React dev server (localhost)
echo   [2]  Local + Public  - Bot + API + built app + public tunnel
echo   [3]  Stop All        - Stop all running services
echo   [4]  Reconfigure     - Edit .env settings
echo   [5]  Exit
echo.
echo  ------------------------------------------------------------
echo.
set "CHOICE="
set /p CHOICE="  Choose (1-5): "

if "%CHOICE%"=="1" goto LOCAL
if "%CHOICE%"=="2" goto PUBLIC
if "%CHOICE%"=="3" goto STOP
if "%CHOICE%"=="4" goto RECONFIGURE
if "%CHOICE%"=="5" goto EXIT_CLEAN
echo.
echo   Invalid choice. Try again.
timeout /t 2 /nobreak >nul
goto MENU

REM ============================================================
:LOCAL
REM ============================================================
cls
echo.
echo  ============================================================
echo   LOCAL DEV MODE
echo  ============================================================
echo.

call :CHECK_NODE
if errorlevel 1 goto MENU

call :INSTALL_DEPS
if errorlevel 1 goto MENU

echo.
echo  Starting services...
echo.

echo  [1/3] Telegram Bot...
start "BOT - Telegram" cmd /k "cd /d "%~dp0" && title BOT - Telegram && color 0B && node index.js"
timeout /t 3 /nobreak >nul
echo  [OK] Bot window opened

echo  [2/3] Web Server (port 3001)...
start "SERVER - API" cmd /k "cd /d "%~dp0web\server" && title SERVER - API && color 0E && node index.js"
timeout /t 4 /nobreak >nul
echo  [OK] Server window opened

echo  [3/3] React Dev Server (port 5173)...
start "CLIENT - Dashboard" cmd /k "cd /d "%~dp0web\client" && title CLIENT - Dashboard && color 0D && npm run dev"
timeout /t 8 /nobreak >nul
echo  [OK] Client window opened

echo.
echo  ============================================================
echo   All services started!
echo.
echo   Dashboard : http://localhost:5173
echo   API       : http://localhost:3001
echo   Health    : http://localhost:3001/health
echo  ============================================================
echo.
set "OPEN="
set /p OPEN="  Open Dashboard in browser? (Y/N): "
if /i "%OPEN%"=="Y" start "" "http://localhost:5173"
echo.
echo  Press any key to return to menu...
pause >nul
goto MENU

REM ============================================================
:PUBLIC
REM ============================================================
cls
echo.
echo  ============================================================
echo   PUBLIC MODE  (build + serve + tunnel on port 3001)
echo  ============================================================
echo.

call :CHECK_NODE
if errorlevel 1 goto MENU

call :CHECK_LOCALTUNNEL
if errorlevel 1 goto MENU

call :INSTALL_DEPS
if errorlevel 1 goto MENU

echo.
echo  Building React app for production...
echo  (This takes ~30-60 seconds the first time)
echo.
cd /d "%~dp0web\client"
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: React build failed. Check errors above.
    cd /d "%~dp0"
    pause
    goto MENU
)
cd /d "%~dp0"
echo.
echo  [OK] React build complete
echo.

echo  Starting services...
echo.

echo  [1/2] Telegram Bot...
start "BOT - Telegram" cmd /k "cd /d "%~dp0" && title BOT - Telegram && color 0B && node index.js"
timeout /t 3 /nobreak >nul
echo  [OK] Bot window opened

echo  [2/2] Web Server + Dashboard (port 3001)...
start "SERVER - All" cmd /k "cd /d "%~dp0web\server" && title SERVER - All && color 0E && node index.js"
timeout /t 5 /nobreak >nul
echo  [OK] Server window opened

echo.
echo  Enter a subdomain name for your public URL.
echo  Example: mybot  =>  https://mybot.loca.lt
echo  (Leave blank for a random name)
echo.
set "SUBDOMAIN="
set /p SUBDOMAIN="  Subdomain: "
if "%SUBDOMAIN%"=="" set "SUBDOMAIN=refbot-%RANDOM%"

echo.
echo  Creating public tunnel for: %SUBDOMAIN%
timeout /t 2 /nobreak >nul

start "TUNNEL - Public" cmd /k "title TUNNEL - Public && color 0A && echo. && echo  Public URL: https://%SUBDOMAIN%.loca.lt && echo. && echo  NOTE: On first visit click Continue && echo  Do NOT close this window! && echo. && lt --port 3001 --subdomain %SUBDOMAIN%"
timeout /t 6 /nobreak >nul

cls
echo.
echo  ============================================================
echo   All services started!
echo.
echo   Public URL : https://%SUBDOMAIN%.loca.lt
echo   Local URL  : http://localhost:3001
echo   Health     : http://localhost:3001/health
echo.
echo   NOTE: On first visit to the public URL click "Continue"
echo   Keep all windows open while using the bot
echo  ============================================================
echo.
set "OPEN="
set /p OPEN="  Open public URL in browser? (Y/N): "
if /i "%OPEN%"=="Y" start "" "https://%SUBDOMAIN%.loca.lt"
echo.
echo  Press any key to return to menu...
pause >nul
goto MENU

REM ============================================================
:STOP
REM ============================================================
cls
echo.
echo  ============================================================
echo   STOPPING ALL SERVICES
echo  ============================================================
echo.

echo  Killing processes on port 3001...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo  Killing processes on port 5173...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo  Closing service windows...
taskkill /FI "WINDOWTITLE eq BOT - Telegram" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq SERVER - API" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq SERVER - All" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq CLIENT - Dashboard" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq TUNNEL - Public" /F >nul 2>&1

echo.
echo  Done. All services stopped.
echo.
echo  Press any key to return to menu...
pause >nul
goto MENU

REM ============================================================
:RECONFIGURE
REM ============================================================
cls
echo.
echo  ============================================================
echo   RECONFIGURE  -  Edit settings
echo  ============================================================
echo.
echo  This will let you re-enter your bot token, admin ID, etc.
echo  Current values will be shown as defaults.
echo.
set /p CONFIRM="  Continue? (Y/N): "
if /i not "%CONFIRM%"=="Y" goto MENU
set "FORCE_SETUP=1"
call :SETUP_ENV
set "FORCE_SETUP="
goto MENU

REM ============================================================
:EXIT_CLEAN
REM ============================================================
cls
echo.
echo  Goodbye!
echo.
timeout /t 1 /nobreak >nul
exit /b 0

REM ============================================================
REM  SUBROUTINES
REM ============================================================

:CHECK_NODE
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Node.js is not installed.
    echo  Download from: https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo  [OK] Node.js found
exit /b 0

:CHECK_LOCALTUNNEL
where lt >nul 2>&1
if %errorlevel% neq 0 (
    echo  LocalTunnel not found. Installing...
    call npm install -g localtunnel
    if %errorlevel% neq 0 (
        echo  ERROR: Failed to install LocalTunnel.
        echo  Try manually: npm install -g localtunnel
        pause
        exit /b 1
    )
    echo  [OK] LocalTunnel installed
) else (
    echo  [OK] LocalTunnel found
)
exit /b 0

:INSTALL_DEPS
echo  Checking dependencies...
if not exist "%~dp0node_modules" (
    echo  Installing bot dependencies...
    pushd "%~dp0"
    call npm install
    popd
    if %errorlevel% neq 0 (
        echo  ERROR: Failed to install bot dependencies.
        pause
        exit /b 1
    )
    echo  [OK] Bot dependencies installed
) else (
    echo  [OK] Bot dependencies ready
)

if not exist "%~dp0web\server\node_modules" (
    echo  Installing server dependencies...
    pushd "%~dp0web\server"
    call npm install
    popd
    if %errorlevel% neq 0 (
        echo  ERROR: Failed to install server dependencies.
        pause
        exit /b 1
    )
    echo  [OK] Server dependencies installed
) else (
    echo  [OK] Server dependencies ready
)

if not exist "%~dp0web\client\node_modules" (
    echo  Installing client dependencies...
    pushd "%~dp0web\client"
    call npm install
    popd
    if %errorlevel% neq 0 (
        echo  ERROR: Failed to install client dependencies.
        pause
        exit /b 1
    )
    echo  [OK] Client dependencies installed
) else (
    echo  [OK] Client dependencies ready
)
exit /b 0

:SETUP_ENV
REM ---- Read existing values as defaults ----
set "CUR_BOT_TOKEN="
set "CUR_BOT_NAME="
set "CUR_ADMIN_ID="
set "CUR_JWT_SECRET="
set "CUR_DB_PATH=./bot.db"

REM Parse existing root .env
if exist "%~dp0.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0.env") do (
        if "%%A"=="BOT_TOKEN"     set "CUR_BOT_TOKEN=%%B"
        if "%%A"=="BOT_NAME"      set "CUR_BOT_NAME=%%B"
        if "%%A"=="MAIN_ADMIN_ID" set "CUR_ADMIN_ID=%%B"
        if "%%A"=="DATABASE_PATH" set "CUR_DB_PATH=%%B"
    )
)
REM Parse existing server .env for JWT
if exist "%~dp0web\server\.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0web\server\.env") do (
        if "%%A"=="JWT_SECRET" set "CUR_JWT_SECRET=%%B"
    )
)

REM If all values exist and not forced, skip setup
if defined FORCE_SETUP goto :DO_SETUP
if defined CUR_BOT_TOKEN if defined CUR_BOT_NAME if defined CUR_ADMIN_ID if defined CUR_JWT_SECRET (
    echo  [OK] Configuration found
    exit /b 0
)

:DO_SETUP
cls
echo.
echo  ============================================================
echo   FIRST TIME SETUP  -  Configure your bot
echo  ============================================================
echo.
echo  You need the following from @BotFather on Telegram:
echo    - Bot Token
echo    - Bot Username (without @)
echo  And your Telegram user ID (get it from @userinfobot)
echo.
echo  Press Enter to keep the current value shown in [brackets].
echo.

REM --- BOT TOKEN ---
echo  ------------------------------------------------------------
if defined CUR_BOT_TOKEN (
    echo  Bot Token [%CUR_BOT_TOKEN%]:
) else (
    echo  Bot Token (from @BotFather):
)
set "INPUT="
set /p INPUT="  > "
if not "%INPUT%"=="" set "CUR_BOT_TOKEN=%INPUT%"
if not defined CUR_BOT_TOKEN (
    echo  ERROR: Bot token is required.
    pause
    exit /b 1
)

REM --- BOT NAME ---
echo.
echo  ------------------------------------------------------------
if defined CUR_BOT_NAME (
    echo  Bot Username without @ [%CUR_BOT_NAME%]:
) else (
    echo  Bot Username without @ (e.g. mybot_bot):
)
set "INPUT="
set /p INPUT="  > "
if not "%INPUT%"=="" set "CUR_BOT_NAME=%INPUT%"
if not defined CUR_BOT_NAME (
    echo  ERROR: Bot username is required.
    pause
    exit /b 1
)

REM --- ADMIN ID ---
echo.
echo  ------------------------------------------------------------
if defined CUR_ADMIN_ID (
    echo  Your Telegram User ID [%CUR_ADMIN_ID%]:
) else (
    echo  Your Telegram User ID (get from @userinfobot):
)
set "INPUT="
set /p INPUT="  > "
if not "%INPUT%"=="" set "CUR_ADMIN_ID=%INPUT%"
if not defined CUR_ADMIN_ID (
    echo  ERROR: Admin ID is required.
    pause
    exit /b 1
)

REM --- JWT SECRET ---
echo.
echo  ------------------------------------------------------------
if defined CUR_JWT_SECRET (
    echo  JWT Secret [%CUR_JWT_SECRET%]:
) else (
    echo  JWT Secret (random string, min 32 chars, or press Enter to auto-generate):
)
set "INPUT="
set /p INPUT="  > "
if not "%INPUT%"=="" set "CUR_JWT_SECRET=%INPUT%"
if not defined CUR_JWT_SECRET (
    REM Auto-generate a simple secret from timestamp + random
    set "CUR_JWT_SECRET=jwt_%RANDOM%%RANDOM%%RANDOM%_secret_key_auto"
    echo  [OK] Auto-generated JWT secret
)

REM --- OPTIONAL: BINANCE ---
echo.
echo  ------------------------------------------------------------
echo  Binance API Key (optional, for auto TXID verify - press Enter to skip):
set "CUR_BINANCE_KEY="
set /p CUR_BINANCE_KEY="  > "

echo  Binance API Secret (optional - press Enter to skip):
set "CUR_BINANCE_SECRET="
set /p CUR_BINANCE_SECRET="  > "

REM --- OPTIONAL: GITHUB BACKUP ---
echo.
echo  ------------------------------------------------------------
echo  GitHub Backup Token (optional, for DB backups - press Enter to skip):
set "CUR_GH_TOKEN="
set /p CUR_GH_TOKEN="  > "

set "CUR_GH_REPO="
if defined CUR_GH_TOKEN (
    echo  GitHub Repo for backup (e.g. username/repo):
    set /p CUR_GH_REPO="  > "
)

REM ---- Write root .env ----
echo.
echo  Writing configuration files...
(
    echo BOT_TOKEN=%CUR_BOT_TOKEN%
    echo BOT_NAME=%CUR_BOT_NAME%
    echo ADMIN_IDS=%CUR_ADMIN_ID%
    echo MAIN_ADMIN_ID=%CUR_ADMIN_ID%
    echo DATABASE_PATH=%CUR_DB_PATH%
    echo BINANCE_API_KEY=%CUR_BINANCE_KEY%
    echo BINANCE_API_SECRET=%CUR_BINANCE_SECRET%
    echo GITHUB_BACKUP_TOKEN=%CUR_GH_TOKEN%
    echo GITHUB_BACKUP_REPO=%CUR_GH_REPO%
) > "%~dp0.env"
echo  [OK] .env written

REM ---- Write web/server/.env ----
(
    echo BOT_TOKEN=%CUR_BOT_TOKEN%
    echo BOT_NAME=%CUR_BOT_NAME%
    echo JWT_SECRET=%CUR_JWT_SECRET%
    echo WEB_PORT=3001
    echo CLIENT_ORIGIN=http://localhost:5173
    echo MAIN_ADMIN_ID=%CUR_ADMIN_ID%
) > "%~dp0web\server\.env"
echo  [OK] web/server/.env written

REM ---- Write web/client/.env ----
(
    echo VITE_BOT_NAME=%CUR_BOT_NAME%
    echo VITE_API_URL=/api
) > "%~dp0web\client\.env"
echo  [OK] web/client/.env written

echo.
echo  ============================================================
echo   Configuration saved!
echo.
echo   Bot Token  : %CUR_BOT_TOKEN%
echo   Bot Name   : %CUR_BOT_NAME%
echo   Admin ID   : %CUR_ADMIN_ID%
echo  ============================================================
echo.
echo  Press any key to continue...
pause >nul
exit /b 0
