#!/data/data/com.termux/files/usr/bin/bash

echo "🔧 إصلاح مشاكل تيرمكس..."
echo ""

# إيقاف العمليات القديمة
echo "⏹️  إيقاف العمليات السابقة..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

# تنظيف الملفات المؤقتة
echo "🧹 تنظيف الملفات المؤقتة..."
rm -rf web/client/node_modules/.vite 2>/dev/null || true
rm -rf web/client/dist 2>/dev/null || true

# التحقق من المنافذ
echo "🔍 التحقق من المنافذ..."
for port in 3001 5173; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "   قتل العملية على المنفذ $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
    fi
done

# تثبيت/تحديث التبعيات إذا لزم الأمر
if [ ! -d "node_modules" ]; then
    echo "📦 تثبيت التبعيات الرئيسية..."
    npm install
fi

if [ ! -d "web/client/node_modules" ]; then
    echo "📦 تثبيت تبعيات العميل..."
    cd web/client && npm install && cd ../..
fi

if [ ! -d "web/server/node_modules" ]; then
    echo "📦 تثبيت تبعيات الخادم..."
    cd web/server && npm install && cd ../..
fi

# جعل السكريبتات قابلة للتنفيذ
echo "🔐 تعيين الأذونات..."
chmod +x start-termux.sh
chmod +x web/client/start-dev.sh 2>/dev/null || true
chmod +x fix-termux.sh

echo ""
echo "✅ تم الإصلاح! الآن شغّل:"
echo "   ./start-termux.sh"
echo ""
