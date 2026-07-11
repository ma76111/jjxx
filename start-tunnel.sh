#!/data/data/com.termux/files/usr/bin/bash

# ================================================================
# Public Tunnel Manager for Web Dashboard
# إدارة النفق العام للوصول للوحة التحكم
# ================================================================

set -e

echo "🌐 مدير النفق العام"
echo "================================"
echo ""

# التحقق من تثبيت localtunnel
if ! command -v lt &> /dev/null; then
    echo "❌ LocalTunnel غير مثبت!"
    echo "📦 جاري التثبيت..."
    npm install -g localtunnel
    echo "✅ تم التثبيت"
fi

# التحقق من تشغيل Web Server
if ! pm2 list | grep -q "web-server.*online"; then
    echo "⚠️  Web Server غير مشغل!"
    read -p "هل تريد تشغيله الآن؟ (y/n): " start_server
    if [ "$start_server" == "y" ]; then
        pm2 start web-server
        sleep 3
    else
        echo "❌ يجب تشغيل Web Server أولاً"
        exit 1
    fi
fi

echo "اختر طريقة الاتصال:"
echo "1. LocalTunnel (مجاني)"
echo "2. Serveo (مجاني)"
echo "3. Ngrok (يتطلب حساب)"
echo ""
read -p "اختيارك: " tunnel_choice

case $tunnel_choice in
    1)
        echo ""
        echo "📝 LocalTunnel - Domain مؤقت"
        read -p "أدخل اسم فرعي مخصص (اتركه فارغاً للعشوائي): " subdomain
        
        if [ -z "$subdomain" ]; then
            echo "🚀 جاري فتح النفق..."
            lt --port 3001
        else
            echo "🚀 جاري فتح النفق..."
            lt --port 3001 --subdomain "$subdomain"
        fi
        ;;
    
    2)
        echo ""
        echo "📝 Serveo - SSH Tunnel"
        read -p "أدخل اسم فرعي مخصص (اتركه فارغاً للعشوائي): " subdomain
        
        if [ -z "$subdomain" ]; then
            echo "🚀 جاري فتح النفق..."
            ssh -R 80:localhost:3001 serveo.net
        else
            echo "🚀 جاري فتح النفق..."
            ssh -R ${subdomain}:80:localhost:3001 serveo.net
        fi
        ;;
    
    3)
        echo ""
        echo "📝 Ngrok"
        
        if ! command -v ngrok &> /dev/null; then
            echo "❌ Ngrok غير مثبت!"
            echo "📥 يمكنك تنزيله من: https://ngrok.com/download"
            exit 1
        fi
        
        read -p "أدخل Auth Token (من ngrok.com): " ngrok_token
        
        if [ ! -z "$ngrok_token" ]; then
            ngrok config add-authtoken "$ngrok_token"
        fi
        
        echo "🚀 جاري فتح النفق..."
        ngrok http 3001
        ;;
    
    *)
        echo "❌ اختيار غير صحيح"
        exit 1
        ;;
esac
