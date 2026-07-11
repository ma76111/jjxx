#!/data/data/com.termux/files/usr/bin/bash

# ================================================================
# Referral Bot - Termux PM2 Launcher
# ملف واحد يشغل كل حاجة على Termux بـ PM2
# ================================================================

echo "🚀 Referral Bot Launcher"
echo ""

# التحقق من Node.js
if ! command -v node &> /dev/null; then
    echo "❌ ثبت Node.js الأول: pkg install nodejs"
    exit 1
fi

# التحقق من PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 جاري تثبيت PM2..."
    npm install -g pm2
fi

# الحصول على IP
get_ip() {
    local ip=$(ip addr show wlan0 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d/ -f1 | head -n1)
    [ -z "$ip" ] && ip=$(ip route get 1 2>/dev/null | awk '{print $7; exit}')
    [ -z "$ip" ] && ip="127.0.0.1"
    echo "$ip"
}

IP=$(get_ip)
echo "🌐 IP: $IP"
echo ""

# إيقاف العمليات القديمة
pm2 delete all 2>/dev/null || true

# تحديث .env
[ -f "web/server/.env" ] && sed -i.bak "s|CLIENT_ORIGIN=.*|CLIENT_ORIGIN=http://${IP}:5173|g" web/server/.env
[ -f "web/client/.env" ] && sed -i.bak "s|VITE_API_URL=.*|VITE_API_URL=http://${IP}:3001/api|g" web/client/.env

# تشغيل الخدمات
echo "🤖 تشغيل البوت..."
pm2 start index.js --name bot

echo "🖥️  تشغيل الخادم..."
pm2 start web/server/index.js --name server

echo "⚛️  تشغيل العميل..."
cd web/client && pm2 start npm --name client -- run dev -- --host 0.0.0.0 && cd ../..

pm2 save

echo ""
echo "✅ تم التشغيل!"
echo "📱 افتح: http://${IP}:5173"
echo ""
pm2 status

