@echo off
chcp 65001 >nul
cls
echo.
echo ╔════════════════════════════════════════╗
echo ║   🚀 تشغيل الموقع على الإنترنت       ║
echo ╚════════════════════════════════════════╝
echo.

:: Check LocalTunnel
where lt >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [1/5] تثبيت LocalTunnel...
    call npm install -g localtunnel >nul 2>nul
) else (
    echo [1/5] LocalTunnel جاهز ✓
)

:: Start Bot
echo [2/5] تشغيل البوت...
start /MIN "Bot" cmd /c "npm start"
timeout /t 3 /nobreak >nul

:: Start Web Server
echo [3/5] تشغيل Web Server...
start /MIN "Server" cmd /c "cd web\server && npm start"
timeout /t 5 /nobreak >nul

:: Start Web Client with host flag
echo [4/5] تشغيل الموقع...
start "Web Client" cmd /k "cd web\client && npm run dev -- --host"
timeout /t 10 /nobreak >nul

:: Create Tunnel
echo [5/5] إنشاء رابط عام...
echo.
echo ─────────────────────────────────────────
set /p SUBDOMAIN="اسم الـ subdomain (أو Enter للعشوائي): "
echo ─────────────────────────────────────────
echo.

if "%SUBDOMAIN%"=="" (
    set SUBDOMAIN=mybot-%RANDOM%
    echo استخدام subdomain عشوائي: %SUBDOMAIN%
)

echo جاري إنشاء الـ tunnel...
timeout /t 2 /nobreak >nul

start "Public Link" cmd /k "echo. && echo ════════════════════════════════════════ && echo    رابط الموقع العام: && echo    https://%SUBDOMAIN%.loca.lt && echo ════════════════════════════════════════ && echo. && echo شير الرابط ده! 🚀 && echo. && lt --port 5173 --subdomain %SUBDOMAIN%"

timeout /t 5 /nobreak >nul

cls
echo.
echo ╔════════════════════════════════════════╗
echo ║          ✅ تم التشغيل بنجاح!         ║
echo ╚════════════════════════════════════════╝
echo.
echo 📡 رابط الموقع:
echo    https://%SUBDOMAIN%.loca.lt
echo.
echo 💻 أو محلياً:
echo    http://localhost:5173
echo.
echo ⚠️  ملاحظة:
echo    - في أول زيارة اضغط "Continue"
echo    - لا تغلق نوافذ الـ cmd
echo.
echo ─────────────────────────────────────────
echo.
pause
