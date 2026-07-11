@echo off
title Stop All Services
color 0C

echo Stopping all services...

REM Kill node processes on our ports
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173"') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Close our titled windows
taskkill /FI "WINDOWTITLE eq Telegram Bot" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Web Server" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Web Client" /F >nul 2>&1

echo Done. All services stopped.
timeout /t 2 /nobreak >nul
