#!/data/data/com.termux/files/usr/bin/bash
# Vite dev server starter for Termux
cd "$(dirname "$0")"
exec npm run dev -- --host 0.0.0.0
