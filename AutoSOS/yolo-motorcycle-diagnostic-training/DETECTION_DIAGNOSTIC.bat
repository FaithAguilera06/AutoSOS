@echo off
title Detection Diagnostic
color 0A

echo.
echo  🔍 DETECTION DIAGNOSTIC 🔍
echo  ===========================
echo.
echo  🎯 Finding why YOLOv8 isn't detecting
echo  📊 Testing different confidence levels
echo  📹 Testing with real camera
echo  🔧 Detailed diagnostic information
echo.
echo  Starting diagnostic...
echo.

cd /d "%~dp0"

C:\Users\Ice2Fast\AppData\Local\Microsoft\WindowsApps\python3.11.exe detection_diagnostic.py

echo.
echo  🛑 Diagnostic completed.
pause
