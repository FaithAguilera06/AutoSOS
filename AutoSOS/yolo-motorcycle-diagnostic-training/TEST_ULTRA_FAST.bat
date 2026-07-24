@echo off
title Test Ultra Fast Detector
color 0A

echo.
echo  🧪 TEST ULTRA FAST DETECTOR 🧪
echo  ===============================
echo.
echo  🔍 Testing components without camera
echo  📊 Checking imports, model, and camera
echo  ⚡ Safe testing mode
echo.
echo  Starting test...
echo.

cd /d "%~dp0"

C:\Users\Ice2Fast\AppData\Local\Microsoft\WindowsApps\python3.11.exe test_ultra_fast.py

echo.
echo  🛑 Test completed.
pause
