@echo off
chcp 65001 >nul
cls
echo.
echo ╔════════════════════════════════════════╗
echo ║   🚀 تشغيل الموقع - النسخة النهائية  ║
echo ╚════════════════════════════════════════╝
echo.

:: Check LocalTunnel
where lt >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [1/5] تثبيت LocalTunnel...
    call npm install -g localtunnel
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

:: Start Web Client with --host 0.0.0.0 flag
echo [4/5] تشغيل الموقع...
start "Web Client" cmd /k "cd web\client && npm run dev -- --host 0.0.0.0"
timeout /t 10 /nobreak >nul

:: Create Tunnel
echo [5/5] إنشاء رابط عام...
echo.
set SUBDOMAIN=mybot-%RANDOM%
echo استخدام subdomain: %SUBDOMAIN%
echo.

timeout /t 2 /nobreak >nul

start "Public Link" cmd /k "echo. && echo ════════════════════════════════════════ && echo    ✅ رابط الموقع العام: && echo. && echo    https://%SUBDOMAIN%.loca.lt && echo. && echo ════════════════════════════════════════ && echo. && echo 📱 شير الرابط ده مع أي حد! && echo 💻 أو افتح: http://localhost:5173 && echo. && lt --port 5173 --subdomain %SUBDOMAIN%"

timeout /t 5 /nobreak >nul

cls
echo.
echo ╔════════════════════════════════════════╗
echo ║          ✅ تم التشغيل بنجاح!         ║
echo ╚════════════════════════════════════════╝
echo.
echo 📡 رابط الموقع العام:
echo.
echo    https://%SUBDOMAIN%.loca.lt
echo.
echo ════════════════════════════════════════
echo.
echo 💻 الموقع محلياً:
echo    http://localhost:5173
echo.
echo ⚠️  ملاحظات:
echo    • في أول زيارة اضغط "Continue"
echo    • لا تغلق نوافذ الـ cmd
echo    • الموقع شغال طول ما النوافذ مفتوحة
echo.
echo 🔴 لإيقاف الموقع:
echo    أغلق كل النوافذ
echo.
pause
