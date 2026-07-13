@echo off
echo ================================================
echo   Starting Bot Locally (Test Mode)
echo ================================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)

echo [1/5] Installing bot dependencies...
call npm install

echo.
echo [2/5] Building React frontend...
cd web\client
if not exist "node_modules" (
    echo Installing client dependencies...
    call npm install
)
echo Building client...
call npm run build
cd ..\..

echo.
echo [3/5] Starting Telegram Bot...
start "Telegram Bot" cmd /k "node index.js"

timeout /t 3 /nobreak >nul

echo.
echo [4/5] Starting Web Server...
cd web\server
if not exist "node_modules" (
    echo Installing server dependencies...
    call npm install
    cd ..\..
) else (
    cd ..\..
)
start "Web Server" cmd /k "node web\server\index.js"

timeout /t 3 /nobreak >nul

echo.
echo [5/5] Starting LocalTunnel...
echo.
echo Installing localtunnel if needed...
call npm install -g localtunnel

echo.
echo Starting tunnel on port 3001...
start "LocalTunnel" cmd /k "npx localtunnel --port 3001"

echo.
echo ================================================
echo   All Services Started!
echo ================================================
echo.
echo Check the "LocalTunnel" window for your public URL
echo It will look like: https://something.loca.lt
echo.
echo Press any key to stop all services...
pause >nul

echo.
echo Stopping services...
taskkill /FI "WINDOWTITLE eq Telegram Bot*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Web Server*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LocalTunnel*" /F >nul 2>&1

echo Done!
pause
