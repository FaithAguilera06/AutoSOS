@echo off
echo ============================================
echo AutoSOS Local YOLOv8 Service with Supabase
echo ============================================
echo.

REM Change to the script's directory
cd /d "%~dp0"

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or later
    pause
    exit /b 1
)

REM Check if required packages are installed
echo Checking required packages...
python -c "import fastapi, uvicorn, ultralytics, cv2, supabase" 2>nul
if errorlevel 1 (
    echo Installing required packages...
    pip install fastapi uvicorn[standard] ultralytics opencv-python supabase python-multipart
    if errorlevel 1 (
        echo ERROR: Failed to install required packages
        echo Please install packages manually: pip install -r requirements_local_yolo_supabase.txt
        pause
        exit /b 1
    )
) else (
    echo All required packages are installed.
)

REM Check if .env file exists and load it
if exist .env (
    echo Loading environment variables from .env...
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        set %%a=%%b
    )
)

REM Check if the Python service file exists
if not exist local_yolo_supabase_service.py (
    echo ERROR: local_yolo_supabase_service.py not found!
    echo Current directory: %CD%
    echo Please make sure you're running this from the AutoSOS project root.
    pause
    exit /b 1
)

REM Run the service
echo.
echo Starting AutoSOS Local YOLOv8 Service...
echo This will download the model from Supabase storage
echo and start a local inference server.
echo Current directory: %CD%
echo.
python local_yolo_supabase_service.py

pause

