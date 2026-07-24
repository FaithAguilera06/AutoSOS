@echo off
echo Setting up YOLOv8 Real-time Detector...
echo.

cd /d "%~dp0"

echo Installing dependencies...
C:\Users\Ice2Fast\AppData\Local\Microsoft\WindowsApps\python3.11.exe -m pip install -r requirements_detector.txt

echo.
echo Installing PyInstaller for creating executable...
C:\Users\Ice2Fast\AppData\Local\Microsoft\WindowsApps\python3.11.exe -m pip install pyinstaller

echo.
echo Creating executable...
C:\Users\Ice2Fast\AppData\Local\Microsoft\WindowsApps\python3.11.exe -m PyInstaller --onefile --windowed --name "YOLOv8_Motorcycle_Detector" real_time_yolo_detector.py

echo.
echo Setup complete! 
echo Executable created in: dist\YOLOv8_Motorcycle_Detector.exe
echo.
echo To run the detector:
echo 1. Double-click: dist\YOLOv8_Motorcycle_Detector.exe
echo 2. Or run: run_yolo_detector.bat
echo.
pause
