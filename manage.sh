#!/data/data/com.termux/files/usr/bin/bash

# ================================================================
# Quick Management Script
# سكريبت إدارة سريع للبوت
# ================================================================

show_status() {
    echo "📊 حالة الخدمات:"
    echo "================================"
    pm2 status
    echo ""
    echo "💾 استخدام الذاكرة:"
    pm2 describe telegram-bot | grep "memory" || echo "N/A"
    pm2 describe web-server | grep "memory" || echo "N/A"
}

show_logs() {
    echo "اختر الخدمة:"
    echo "1. Telegram Bot"
    echo "2. Web Server"
    echo "3. الكل"
    read -p "اختيارك: " choice
    
    case $choice in
        1) pm2 logs telegram-bot --lines 50 ;;
        2) pm2 logs web-server --lines 50 ;;
        3) pm2 logs --lines 50 ;;
        *) echo "❌ اختيار غير صحيح" ;;
    esac
}

restart_services() {
    echo "🔄 إعادة تشغيل الخدمات..."
    pm2 restart all
    echo "✅ تم إعادة التشغيل"
    pm2 status
}

stop_services() {
    echo "⏸️  إيقاف الخدمات..."
    pm2 stop all
    echo "✅ تم الإيقاف"
}

start_services() {
    echo "▶️  تشغيل الخدمات..."
    pm2 start all
    echo "✅ تم التشغيل"
    pm2 status
}

backup_database() {
    echo "💾 نسخ احتياطي لقاعدة البيانات..."
    timestamp=$(date +%Y%m%d_%H%M%S)
    mkdir -p backups
    cp bot.db "backups/bot_${timestamp}.db"
    echo "✅ تم النسخ الاحتياطي: backups/bot_${timestamp}.db"
}

update_code() {
    echo "🔄 تحديث الكود من GitHub..."
    
    if [ ! -d ".git" ]; then
        echo "❌ هذا ليس مستودع Git"
        return
    fi
    
    # حفظ التغييرات المحلية
    git stash
    
    # سحب التحديثات
    git pull origin main
    
    # إعادة التطبيق
    git stash pop
    
    echo "📦 تحديث الحزم..."
    npm install
    
    if [ -d "web/server" ]; then
        cd web/server && npm install && cd ../..
    fi
    
    if [ -d "web/client" ]; then
        cd web/client && npm install && npm run build && cd ../..
    fi
    
    echo "🔄 إعادة تشغيل الخدمات..."
    pm2 restart all
    
    echo "✅ تم التحديث بنجاح"
}

clean_logs() {
    echo "🧹 تنظيف ملفات اللوجات..."
    pm2 flush
    rm -f logs/*.log
    echo "✅ تم تنظيف اللوجات"
}

# القائمة الرئيسية
echo ""
echo "================================"
echo "   🤖 إدارة البوت السريعة"
echo "================================"
echo ""
echo "1. حالة الخدمات"
echo "2. عرض اللوجات"
echo "3. إعادة تشغيل"
echo "4. إيقاف الخدمات"
echo "5. تشغيل الخدمات"
echo "6. نسخ احتياطي للبيانات"
echo "7. تحديث الكود"
echo "8. تنظيف اللوجات"
echo "9. فتح نفق عام"
echo "0. خروج"
echo ""
read -p "اختيارك: " choice

case $choice in
    1) show_status ;;
    2) show_logs ;;
    3) restart_services ;;
    4) stop_services ;;
    5) start_services ;;
    6) backup_database ;;
    7) update_code ;;
    8) clean_logs ;;
    9) bash start-tunnel.sh ;;
    0) echo "👋 إلى اللقاء!" ;;
    *) echo "❌ اختيار غير صحيح" ;;
esac
