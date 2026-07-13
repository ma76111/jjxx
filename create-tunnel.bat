@echo off
chcp 65001 >nul
echo ========================================
echo   📡 إنشاء رابط عام للموقع
echo ========================================
echo.

:: Check if localtunnel is installed
where lt >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] LocalTunnel غير مثبت. جاري التثبيت...
    call npm install -g localtunnel
    echo.
)

echo [√] Vite شغال على: http://localhost:5173
echo.
echo اختر اسم subdomain (أو اضغط Enter لاسم عشوائي):
set /p SUBDOMAIN="اسم الـ subdomain: "

if "%SUBDOMAIN%"=="" (
    echo.
    echo جاري إنشاء tunnel بـ subdomain عشوائي...
    lt --port 5173
) else (
    echo.
    echo جاري إنشاء tunnel: https://%SUBDOMAIN%.loca.lt
    lt --port 5173 --subdomain %SUBDOMAIN%
)
