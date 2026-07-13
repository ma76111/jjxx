@echo off
echo ========================================
echo   LocalTunnel Deployment Script
echo ========================================
echo.

:: Check if localtunnel is installed
where lt >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing LocalTunnel globally...
    npm install -g localtunnel
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install LocalTunnel
        pause
        exit /b 1
    )
)

echo [1/4] Starting Bot...
start "Bot" cmd /k "npm start"
timeout /t 3 /nobreak >nul

echo [2/4] Starting Web Server on port 3001...
start "Web Server" cmd /k "cd web\server && npm start"
timeout /t 3 /nobreak >nul

echo [3/4] Starting Web Client on port 5173...
start "Web Client" cmd /k "cd web\client && npm run dev"
timeout /t 5 /nobreak >nul

echo [4/4] Creating LocalTunnel for API (port 3001)...
echo.
echo Choose your subdomain name (e.g., mybot-api):
set /p SUBDOMAIN="Subdomain: "

if "%SUBDOMAIN%"=="" (
    echo [ERROR] Subdomain cannot be empty
    pause
    exit /b 1
)

echo.
echo Starting tunnel: https://%SUBDOMAIN%.loca.lt
start "LocalTunnel API" cmd /k "lt --port 3001 --subdomain %SUBDOMAIN%"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Tunnel Created!
echo ========================================
echo.
echo Your public API URL: https://%SUBDOMAIN%.loca.lt
echo.
echo Next Steps:
echo 1. Update web/client/.env:
echo    VITE_API_URL=https://%SUBDOMAIN%.loca.lt
echo.
echo 2. Restart web client (press Ctrl+C in that window, then npm run dev)
echo.
echo 3. Access your site: http://localhost:5173
echo.
echo NOTE: First visit will show a page asking for confirmation
echo       Click "Continue" to proceed
echo.
pause
