@echo off
echo Changing to AutoSOS directory...
cd /d "C:\Users\Ice2Fast\Desktop\AUTOSOS SUPABASE\AutoSOS"

echo Installing requirements...
pip install -r requirements_test.txt

echo.
echo Starting YOLOv8 Motorcycle Diagnostic Test...
echo.
python yolov8_motorcycle_test.py

pause
