@echo off
title Fast YOLOv8 Detector
color 0A

echo.
echo  ⚡ FAST YOLOv8 MOTORCYCLE DETECTOR ⚡
echo  =====================================
echo.
echo  🚀 Optimized for quick loading and real-time performance
echo  📹 Camera will start immediately while model loads in background
echo.
echo  Starting in 2 seconds...
echo.

timeout /t 2 /nobreak >nul

cd /d "%~dp0"

C:\Users\Ice2Fast\AppData\Local\Microsoft\WindowsApps\python3.11.exe fast_yolo_detector.py

echo.
echo  🛑 Fast detector session ended.
pause

