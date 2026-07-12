#!/data/data/com.termux/files/usr/bin/bash

# Simple ngrok wrapper for PM2
PORT=${1:-3001}

echo "Starting ngrok on port $PORT..."
ngrok http $PORT
