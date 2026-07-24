@echo off
title YOLOv8 Motorcycle Diagnostic - Real-time Detector
color 0A

echo.
echo  ██╗   ██╗ ██████╗ ██╗      ██████╗ ██╗   ██╗    ██████╗ ███████╗████████╗██████╗ ████████╗
echo  ╚██╗ ██╔╝██╔═══██╗██║     ██╔═══██╗██║   ██║   ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝
echo   ╚████╔╝ ██║   ██║██║     ██║   ██║██║   ██║   ██████╔╝█████╗     ██║   ██████╔╝   ██║   
echo    ╚██╔╝  ██║   ██║██║     ██║   ██║██║   ██║   ██╔══██╗██╔══╝     ██║   ██╔══██╗   ██║   
echo     ██║   ╚██████╔╝███████╗╚██████╔╝╚██████╔╝   ██║  ██║███████╗   ██║   ██║  ██║   ██║   
echo     ╚═╝    ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝    ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   
echo.
echo  ███╗   ███╗ ██████╗ ████████╗ ██████╗ ██████╗ ██╗      ██████╗ ██╗    ██╗██╗      █████╗ 
echo  ████╗ ████║██╔═══██╗╚══██╔══╝██╔═══██╗██╔══██╗██║     ██╔═══██╗██║    ██║██║     ██╔══██╗
echo  ██╔████╔██║██║   ██║   ██║   ██║   ██║██████╔╝██║     ██║   ██║██║ █╗ ██║██║     ███████║
echo  ██║╚██╔╝██║██║   ██║   ██║   ██║   ██║██╔══██╗██║     ██║   ██║██║███╗██║██║     ██╔══██║
echo  ██║ ╚═╝ ██║╚██████╔╝   ██║   ╚██████╔╝██║  ██║███████╗╚██████╔╝╚███╔███╔╝███████╗██║  ██║
echo  ╚═╝     ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚══╝╚══╝ ╚══════╝╚═╝  ╚═╝
echo.
echo  ██████╗ ███████╗████████╗██████╗ ████████╗███████╗ ██████╗████████╗ ██████╗ ██████╗ 
echo  ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗
echo  ██████╔╝█████╗     ██║   ██████╔╝   ██║   █████╗  ██║        ██║   ██║   ██║██████╔╝
echo  ██╔══██╗██╔══╝     ██║   ██╔══██╗   ██║   ██╔══╝  ██║        ██║   ██║   ██║██╔══██╗
echo  ██║  ██║███████╗   ██║   ██║  ██║   ██║   ███████╗╚██████╗   ██║   ╚██████╔╝██║  ██║
echo  ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
echo.
echo  ================================================================================
echo  🤖 REAL-TIME YOLOv8 MOTORCYCLE DIAGNOSTIC DETECTOR
echo  ================================================================================
echo.
echo  🎯 Features:
echo     • Real-time camera streaming with live YOLOv8 detection
echo     • Bounding box annotations around detected motorcycle issues
echo     • Color-coded detections for different issue types
echo     • Interactive controls for saving frames and adjusting settings
echo.
echo  🎮 Controls:
echo     • Q - Quit the application
echo     • S - Save current frame with detections
echo     • C - Change confidence threshold
echo     • H - Show/hide help overlay
echo.
echo  🚀 Starting detector in 3 seconds...
echo.

timeout /t 3 /nobreak >nul

echo  🔄 Loading YOLOv8 model and initializing camera...
echo.

cd /d "%~dp0"

C:\Users\Ice2Fast\AppData\Local\Microsoft\WindowsApps\python3.11.exe real_time_yolo_detector.py --model runs/detect/train3/weights/best.pt --confidence 0.3

echo.
echo  🛑 Detector session ended.
echo  📁 Check for saved detection images in this folder.
echo.
pause
