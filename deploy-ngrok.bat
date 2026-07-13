@echo off
echo ========================================
echo   Ngrok Deployment Script
echo ========================================
echo.

:: Check if ngrok is installed
where ngrok >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Ngrok not found!
    echo.
    echo Please install ngrok:
    echo 1. Go to https://ngrok.com/download
    echo 2. Download ngrok for Windows
    echo 3. Extract ngrok.exe to this folder
    echo 4. Run: ngrok authtoken YOUR_TOKEN
    echo.
    pause
    exit /b 1
)

echo [1/4] Starting Bot...
start "Bot" cmd /k "npm start"
timeout /t 3 /nobreak >nul

echo [2/4] Starting Web Server...
start "Web Server" cmd /k "cd web\server && npm start"
timeout /t 3 /nobreak >nul

echo [3/4] Starting Web Client...
start "Web Client" cmd /k "cd web\client && npm run dev"
timeout /t 5 /nobreak >nul

echo [4/4] Starting Ngrok tunnel for port 3001 (API)...
start "Ngrok API" cmd /k "ngrok http 3001"

echo.
echo ========================================
echo   Services Started!
echo ========================================
echo.
echo Bot: Running in separate window
echo Web Server (API): Running on port 3001
echo Web Client: Running on port 5173
echo Ngrok: Check the window for your public URL
echo.
echo IMPORTANT: 
echo 1. Copy the Ngrok URL (https://xxxx.ngrok-free.app)
echo 2. Update web/client/.env with VITE_API_URL
echo 3. Restart the web client
echo.
pause
