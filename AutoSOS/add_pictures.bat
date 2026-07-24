@echo off
echo Adding Pictures to YOLOv8 Dataset
echo ====================================
echo.

REM Change to the script's directory
cd /d "%~dp0"

echo Starting picture addition tool...
echo.

python add_pictures.py

pause
