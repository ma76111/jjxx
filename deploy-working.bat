@echo off
chcp 65001 >nul
echo ========================================
echo   🚀 تشغيل الموقع على الإنترنت (محدّث)
echo ========================================
echo.

:: تثبيت LocalTunnel
echo [1/6] التحقق من LocalTunnel...
call npm list -g localtunnel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo جاري التثبيت...
    call npm install -g localtunnel
)

:: تشغيل البوت
echo [2/6] تشغيل البوت...
start "Telegram Bot" cmd /k "npm start"
timeout /t 3 /nobreak >nul

:: تشغيل Web Server
echo [3/6] تشغيل Web Server...
start "Web Server" cmd /k "cd web\server && npm start"
timeout /t 5 /nobreak >nul

:: تشغيل Web Client
echo [4/6] تشغيل الموقع...
start "Web Client" cmd /k "cd web\client && npm run dev -- --host"
timeout /t 8 /nobreak >nul

:: إنشاء Tunnel للـ Frontend على port 5173
echo [5/6] إنشاء رابط عام...
set WEB_SUBDOMAIN=mybot-%RANDOM%
start "Web Tunnel" cmd /k "lt --port 5173 --subdomain %WEB_SUBDOMAIN%"
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   ✅ تم! الموقع شغال
echo ========================================
echo.
echo 📡 رابط الموقع:
echo    https://%WEB_SUBDOMAIN%.loca.lt
echo.
echo ⚠️ ملاحظة:
echo    - في أول زيارة اضغط "Continue"
echo    - لو مش شغال، استنى 30 ثانية وحاول تاني
echo.
echo 💻 أو افتح محلياً:
echo    http://localhost:5173
echo.
pause
