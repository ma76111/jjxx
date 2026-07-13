@echo off
chcp 65001 >nul
echo ========================================
echo   🌐 Full Deployment with Tunneling
echo ========================================
echo.
echo Choose your tunneling service:
echo.
echo 1. LocalTunnel (Easiest - No signup)
echo 2. Ngrok (Best - Requires free account)
echo 3. Serveo (Simple - SSH based)
echo 4. Manual setup
echo.
set /p CHOICE="Enter choice (1-4): "

if "%CHOICE%"=="1" goto localtunnel
if "%CHOICE%"=="2" goto ngrok
if "%CHOICE%"=="3" goto serveo
if "%CHOICE%"=="4" goto manual
echo Invalid choice!
pause
exit /b 1

:localtunnel
echo.
echo ========================================
echo   LocalTunnel Setup
echo ========================================
echo.

where lt >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing LocalTunnel...
    call npm install -g localtunnel
)

echo.
echo Choose subdomain for API (e.g., mybot-api):
set /p API_SUBDOMAIN="API Subdomain: "

echo Choose subdomain for Frontend (e.g., mybot-web):
set /p WEB_SUBDOMAIN="Web Subdomain: "

echo.
echo Starting services...
start "Bot" cmd /k "npm start"
timeout /t 3 /nobreak >nul

start "API Server" cmd /k "cd web\server && npm start"
timeout /t 3 /nobreak >nul

echo.
echo Creating tunnels...
start "API Tunnel" cmd /k "lt --port 3001 --subdomain %API_SUBDOMAIN%"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   📝 IMPORTANT: Update Configuration
echo ========================================
echo.
echo 1. Edit web\client\.env and set:
echo    VITE_API_URL=https://%API_SUBDOMAIN%.loca.lt
echo.
echo 2. After editing, start the web client:
echo    cd web\client
echo    npm run dev
echo.
echo 3. Then create tunnel for frontend:
echo    lt --port 5173 --subdomain %WEB_SUBDOMAIN%
echo.
echo Your URLs will be:
echo - API: https://%API_SUBDOMAIN%.loca.lt
echo - Web: https://%WEB_SUBDOMAIN%.loca.lt
echo.
echo Press any key when ready to continue...
pause >nul
start "Web Client" cmd /k "cd web\client && npm run dev"
timeout /t 5 /nobreak >nul
start "Web Tunnel" cmd /k "lt --port 5173 --subdomain %WEB_SUBDOMAIN%"

echo.
echo ========================================
echo   ✅ All services started!
echo ========================================
echo.
echo Access your site at: https://%WEB_SUBDOMAIN%.loca.lt
echo.
pause
exit /b 0

:ngrok
echo.
echo ========================================
echo   Ngrok Setup
echo ========================================
echo.

where ngrok >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Ngrok not found!
    echo.
    echo Please:
    echo 1. Download from https://ngrok.com/download
    echo 2. Extract ngrok.exe to this folder
    echo 3. Get auth token from https://dashboard.ngrok.com
    echo 4. Run: ngrok authtoken YOUR_TOKEN
    echo.
    pause
    exit /b 1
)

echo Starting services...
start "Bot" cmd /k "npm start"
timeout /t 3 /nobreak >nul

start "API Server" cmd /k "cd web\server && npm start"
timeout /t 3 /nobreak >nul

echo Creating ngrok tunnel for API...
start "API Tunnel" cmd /k "ngrok http 3001"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   📝 IMPORTANT: Update Configuration
echo ========================================
echo.
echo 1. Check the Ngrok window and copy the https URL
echo 2. Edit web\client\.env and set:
echo    VITE_API_URL=https://YOUR-NGROK-URL.ngrok-free.app
echo.
echo 3. After editing, start web client and its tunnel:
echo    cd web\client && npm run dev
echo    ngrok http 5173
echo.
echo Press any key when ready to continue...
pause >nul
start "Web Client" cmd /k "cd web\client && npm run dev"
timeout /t 5 /nobreak >nul
start "Web Tunnel" cmd /k "ngrok http 5173"

echo.
echo ✅ All services started!
echo Check the Ngrok windows for your public URLs
echo.
pause
exit /b 0

:serveo
echo.
echo ========================================
echo   Serveo Setup (SSH Tunneling)
echo ========================================
echo.

echo Starting services...
start "Bot" cmd /k "npm start"
timeout /t 3 /nobreak >nul

start "API Server" cmd /k "cd web\server && npm start"
timeout /t 3 /nobreak >nul

start "Web Client" cmd /k "cd web\client && npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo Choose subdomain for API:
set /p API_SUB="API Subdomain: "

echo.
echo Creating Serveo tunnel...
echo Run this command in a new terminal:
echo   ssh -R %API_SUB%:80:localhost:3001 serveo.net
echo.
echo Your API URL will be: https://%API_SUB%.serveo.net
echo.
echo Update web\client\.env with this URL and restart client
echo.
pause
exit /b 0

:manual
echo.
echo ========================================
echo   Manual Setup
echo ========================================
echo.
echo Starting all services...
start "Bot" cmd /k "npm start"
timeout /t 3 /nobreak >nul

start "API Server" cmd /k "cd web\server && npm start"
timeout /t 3 /nobreak >nul

start "Web Client" cmd /k "cd web\client && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo Services started:
echo - Bot: Running
echo - API: http://localhost:3001
echo - Web: http://localhost:5173
echo.
echo Now you need to:
echo 1. Choose a tunneling service (ngrok, localtunnel, etc.)
echo 2. Create tunnels for ports 3001 and 5173
echo 3. Update web\client\.env with the API tunnel URL
echo 4. Restart the web client
echo.
pause
exit /b 0
