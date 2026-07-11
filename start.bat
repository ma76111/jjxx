@echo off
title Referral Bot Launcher
color 0A

echo ================================================
echo   Referral Bot - Starting all services
echo ================================================
echo.

REM Check node is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

REM Install dependencies if node_modules missing
if not exist "node_modules" (
    echo [1/3] Installing bot dependencies...
    call npm install --silent
)
if not exist "web\server\node_modules" (
    echo [2/3] Installing server dependencies...
    pushd web\server
    call npm install --silent
    popd
)
if not exist "web\client\node_modules" (
    echo [3/3] Installing client dependencies...
    pushd web\client
    call npm install --silent
    popd
)

echo.
echo [BOT]    Starting Telegram bot...
start "Telegram Bot" cmd /k "color 0B && echo [BOT] Starting... && node index.js"

timeout /t 2 /nobreak >nul

echo [SERVER] Starting Web server on port 3001...
start "Web Server" cmd /k "color 0E && echo [SERVER] Starting... && node web/server/index.js"

timeout /t 2 /nobreak >nul

echo [CLIENT] Starting React dev server on port 5173...
start "Web Client" cmd /k "color 0D && echo [CLIENT] Starting... && cd web\client && npm run dev"

echo.
echo ================================================
echo   All services started!
echo.
echo   Bot:    Check the blue window
echo   API:    http://localhost:3001/health
echo   Web:    http://localhost:5173
echo ================================================
echo.
echo Press any key to open the web dashboard...
pause >nul
start "" "http://localhost:5173"
