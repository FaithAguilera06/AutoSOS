@echo off
title AutoSOS Camera Diagnostic - Integrated Mode
color 0A

echo.
echo  🖥️ AUTOSOS CAMERA DIAGNOSTIC - INTEGRATED MODE 🖥️
echo  ==================================================
echo.
echo  🚀 Optimized for Windows
echo  📹 Resolution: 1280x720 (720p)
echo  🏍️ Motorcycle diagnostic detection
echo  ⚡ Real-time YOLOv8 inference
echo  🔧 Windows DirectShow backend
echo  🌐 Integrated with AutoSOS backend services
echo  📊 Supabase database integration
echo.
echo  Starting in 2 seconds...
echo.

timeout /t 2 /nobreak >nul

REM Change to the script's directory
cd /d "%~dp0"

REM Set environment variables for Supabase integration
set SUPABASE_URL=https://atdibhoeaeqfgjswcqwx.supabase.co
set SUPABASE_ANON_KEY=sb_publishable_8zWSuqsDoSKDiWkz3Yd_eg_E7N1X7oj

echo Environment variables set for Supabase integration.
echo Starting AutoSOS camera diagnostic...
echo.

python yolo-motorcycle-diagnostic-training\autosos_camera_diagnostic.py

echo.
echo  🛑 AutoSOS camera diagnostic session ended.
pause
