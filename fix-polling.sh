#!/bin/bash

# ================================================================
# إصلاح مشاكل Telegram Polling
# ================================================================

echo "🔧 إصلاح مشاكل Telegram API..."
echo ""

# 1. التحقق من الاتصال
echo "✓ فحص الاتصال بـ Telegram..."
if ! curl -s --max-time 5 https://api.telegram.org > /dev/null; then
    echo "❌ لا يوجد اتصال بـ Telegram API"
    echo "تأكد من اتصالك بالإنترنت"
    exit 1
fi
echo "✅ الاتصال جيد"
echo ""

# 2. إعادة تشغيل البوت
echo "🔄 إعادة تشغيل البوت..."
pm2 restart bot

echo ""
echo "✅ تم إعادة تشغيل البوت"
echo "استخدم 'pm2 logs bot' لمراقبة السجلات"
