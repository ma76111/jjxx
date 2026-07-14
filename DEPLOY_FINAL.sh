#!/bin/bash

# ════════════════════════════════════════
#   🚀 Deploy Script - Windows Git Bash
# ════════════════════════════════════════

clear
echo ""
echo "╔════════════════════════════════════════╗"
echo "║   🚀 تشغيل الموقع - النسخة النهائية  ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check LocalTunnel
if ! command -v lt &> /dev/null; then
    echo "[1/5] تثبيت LocalTunnel..."
    npm install -g localtunnel
else
    echo "[1/5] LocalTunnel جاهز ✓"
fi

# Start Bot
echo "[2/5] تشغيل البوت..."
start "Bot" cmd //c "npm start" 2>/dev/null || cmd.exe /c start "Bot" cmd //c "npm start"
sleep 3

# Start Web Server
echo "[3/5] تشغيل Web Server..."
start "Server" cmd //c "cd web/server && npm start" 2>/dev/null || cmd.exe /c start "Server" cmd //c "cd web/server && npm start"
sleep 5

# Start Web Client with --host 0.0.0.0
echo "[4/5] تشغيل الموقع..."
start "Web Client" cmd //k "cd web/client && npm run dev -- --host 0.0.0.0" 2>/dev/null || cmd.exe /c start "Web Client" cmd //k "cd web/client && npm run dev -- --host 0.0.0.0"
sleep 10

# Create Tunnel
echo "[5/5] إنشاء رابط عام..."
echo ""

# Generate random subdomain
SUBDOMAIN="mybot-$RANDOM"
echo "استخدام subdomain: $SUBDOMAIN"
echo ""

sleep 2

# Start tunnel in new window
start "Public Link" cmd //k "echo. && echo ════════════════════════════════════════ && echo    ✅ رابط الموقع العام: && echo. && echo    https://$SUBDOMAIN.loca.lt && echo. && echo ════════════════════════════════════════ && echo. && echo 📱 شير الرابط ده مع أي حد! && echo 💻 أو افتح: http://localhost:5173 && echo. && lt --port 5173 --subdomain $SUBDOMAIN" 2>/dev/null || cmd.exe /c start "Public Link" cmd //k "echo. && echo ════════════════════════════════════════ && echo    ✅ رابط الموقع العام: && echo. && echo    https://$SUBDOMAIN.loca.lt && echo. && echo ════════════════════════════════════════ && echo. && echo 📱 شير الرابط ده مع أي حد! && echo 💻 أو افتح: http://localhost:5173 && echo. && lt --port 5173 --subdomain $SUBDOMAIN"

sleep 5

clear
echo ""
echo "╔════════════════════════════════════════╗"
echo "║          ✅ تم التشغيل بنجاح!         ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "📡 رابط الموقع العام:"
echo ""
echo "   https://$SUBDOMAIN.loca.lt"
echo ""
echo "════════════════════════════════════════"
echo ""
echo "💻 الموقع محلياً:"
echo "   http://localhost:5173"
echo ""
echo "⚠️  ملاحظات:"
echo "   • في أول زيارة اضغط \"Continue\""
echo "   • لا تغلق نوافذ الـ cmd"
echo "   • الموقع شغال طول ما النوافذ مفتوحة"
echo ""
echo "🔴 لإيقاف الموقع:"
echo "   أغلق كل النوافذ"
echo ""

read -p "اضغط Enter للخروج..."
