@echo off
chcp 65001 >nul
echo ========================================
echo   🚀 تشغيل تلقائي للمشروع على الإنترنت
echo ========================================
echo.

:: التحقق من التبعيات
echo [1/8] التحقق من التبعيات...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js غير مثبت!
    pause
    exit /b 1
)

:: تثبيت LocalTunnel
echo [2/8] تثبيت LocalTunnel...
call npm list -g localtunnel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo جاري تثبيت LocalTunnel...
    call npm install -g localtunnel
)

:: تشغيل البوت
echo.
echo [3/8] تشغيل البوت...
start "Telegram Bot" cmd /k "npm start"
timeout /t 3 /nobreak >nul

:: تشغيل Web Server
echo [4/8] تشغيل Web Server على المنفذ 3001...
start "Web Server API" cmd /k "cd web\server && npm start"
timeout /t 5 /nobreak >nul

:: إنشاء Tunnel للـ API
echo [5/8] إنشاء رابط عام للـ API...
set API_SUBDOMAIN=mybotapi-%RANDOM%
echo الـ subdomain: %API_SUBDOMAIN%
start "API Tunnel" cmd /k "lt --port 3001 --subdomain %API_SUBDOMAIN%"
timeout /t 5 /nobreak >nul

:: تحديث إعدادات Client
echo [6/8] تحديث إعدادات Frontend...
echo VITE_BOT_NAME=modulecd23j1m_bot> web\client\.env
echo VITE_API_URL=https://%API_SUBDOMAIN%.loca.lt/api>> web\client\.env
echo.

:: تشغيل Web Client
echo [7/8] تشغيل الموقع على المنفذ 5173...
start "Web Client" cmd /k "cd web\client && npm run dev"
timeout /t 8 /nobreak >nul

:: إنشاء Tunnel للـ Frontend
echo [8/8] إنشاء رابط عام للموقع...
set WEB_SUBDOMAIN=mybotsite-%RANDOM%
echo الـ subdomain: %WEB_SUBDOMAIN%
start "Web Tunnel" cmd /k "lt --port 5173 --subdomain %WEB_SUBDOMAIN%"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   ✅ تم! المشروع يعمل على الإنترنت
echo ========================================
echo.
echo 📡 رابط الموقع العام:
echo    https://%WEB_SUBDOMAIN%.loca.lt
echo.
echo 📡 رابط الـ API:
echo    https://%API_SUBDOMAIN%.loca.lt
echo.
echo ⚠️ ملاحظة:
echo    - في أول زيارة للموقع اضغط "Continue"
echo    - احتفظ بالروابط لمشاركتها
echo    - لا تغلق النوافذ لبقاء الموقع شغال
echo.
echo 🔴 لإيقاف كل شيء: أغلق كل النوافذ
echo.
pause
