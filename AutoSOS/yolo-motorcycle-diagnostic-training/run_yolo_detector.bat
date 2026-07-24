@echo off
echo Starting YOLOv8 Real-time Motorcycle Diagnostic Detector...
echo.

cd /d "%~dp0"

echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo Python not found in PATH. Trying alternative path...
    C:\Users\Ice2Fast\AppData\Local\Microsoft\WindowsApps\python3.11.exe --version >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Python not found. Please install Python 3.11 or later.
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=C:\Users\Ice2Fast\AppData\Local\Microsoft\WindowsApps\python3.11.exe
    )
) else (
    set PYTHON_CMD=python
)

echo Python found. Starting detector...
echo.

%PYTHON_CMD% real_time_yolo_detector.py --model runs/detect/train3/weights/best.pt --confidence 0.3

echo.
echo Detection session ended.
pause
