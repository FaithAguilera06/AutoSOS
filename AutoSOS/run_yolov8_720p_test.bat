@echo off
echo ========================================
echo YOLOv8 Motorcycle Diagnostic Test
echo 720p Camera with Cloud Detection
echo ========================================
echo.

REM Change to the correct directory
cd /d "C:\Users\Ice2Fast\Desktop\AUTOSOS SUPABASE\AutoSOS"

echo Starting YOLOv8 Motorcycle Diagnostic Test...
echo Camera Resolution: 720p (1280x720)
echo Cloud Service: https://autosos-yolo.onrender.com
echo.
echo Controls:
echo - Press 'q' to quit
echo - Press 's' to save image
echo - Press 'r' to reset detections
echo.

REM Run the Python test app
python yolov8_motorcycle_test.py

echo.
echo Test completed.
pause
