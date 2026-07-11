#!/bin/bash

# ================================================================
# Script Testing Tool
# أداة اختبار السكريبتات
# ================================================================

echo "🔍 اختبار صحة السكريبتات..."
echo "================================"
echo ""

# اختبار بناء الجمل (Syntax)
test_syntax() {
    local file=$1
    echo -n "📝 اختبار $file... "
    
    if [ ! -f "$file" ]; then
        echo "❌ الملف غير موجود"
        return 1
    fi
    
    if bash -n "$file" 2>/dev/null; then
        echo "✅ صحيح"
        return 0
    else
        echo "❌ خطأ في بناء الجملة"
        bash -n "$file"
        return 1
    fi
}

# اختبار الملفات
echo "1️⃣ اختبار بناء الجمل..."
echo ""

errors=0

test_syntax "setup-termux.sh" || errors=$((errors + 1))
test_syntax "start-tunnel.sh" || errors=$((errors + 1))
test_syntax "manage.sh" || errors=$((errors + 1))

echo ""
echo "================================"

if [ $errors -eq 0 ]; then
    echo "✅ جميع الاختبارات نجحت!"
    echo ""
    echo "📋 الملفات الموجودة:"
    ls -lh *.sh 2>/dev/null | awk '{print "   " $9, "(" $5 ")"}'
    echo ""
    echo "📦 الحزم المطلوبة:"
    echo "   ✓ Node.js"
    echo "   ✓ npm"
    echo "   ✓ git"
    echo "   ✓ sqlite"
    echo "   ✓ PM2 (سيتم تثبيته)"
    echo ""
    echo "🚀 جاهز للتشغيل على Termux!"
else
    echo "❌ فشل $errors اختبار(ات)"
    exit 1
fi
