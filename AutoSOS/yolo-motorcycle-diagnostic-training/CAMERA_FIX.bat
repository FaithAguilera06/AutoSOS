@echo off
title Windows Camera Fix
color 0A

echo.
echo  🔧 WINDOWS CAMERA FIX 🔧
echo  =========================
echo.
echo  🖥️ Diagnosing camera issues
echo  🔍 Testing different backends
echo  🎯 Creating optimized detector
echo.
echo  Starting diagnostic...
echo.

cd /d "%~dp0"

C:\Users\Ice2Fast\AppData\Local\Microsoft\WindowsApps\python3.11.exe windows_camera_fix.py

echo.
echo  🛑 Camera diagnostic completed.
pause
