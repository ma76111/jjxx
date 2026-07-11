#!/data/data/com.termux/files/usr/bin/bash

echo "Fixing build issues..."

# Clean all build artifacts and caches
rm -rf web/client/dist
rm -rf web/client/node_modules/.vite
rm -rf web/client/node_modules/.cache

# Reinstall dependencies
cd web/client
npm install

# Build
npm run build

echo "Done! Try running ./start-termux-root.sh again"
