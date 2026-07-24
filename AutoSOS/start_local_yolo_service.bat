@echo off
echo ========================================
echo    Starting Local YOLO Service
echo ========================================
echo.

:: Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Python not found. Please install Python first.
    pause
    exit /b 1
)

:: Check if the YOLO service file exists
if not exist "local_yolo_backend_service.py" (
    echo ❌ local_yolo_backend_service.py not found.
    echo Please make sure you're in the correct directory.
    pause
    exit /b 1
)

:: Check if required packages are installed
echo 🔍 Checking Python dependencies...
python -c "import fastapi, uvicorn, ultralytics" 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Some required packages are missing.
    echo.
    echo Installing required packages...
    pip install fastapi uvicorn ultralytics opencv-python pillow numpy
    if %errorlevel% neq 0 (
        echo ❌ Failed to install packages.
        pause
        exit /b 1
    )
    echo ✅ Packages installed successfully.
)

echo.
echo 🚀 Starting YOLO service on http://localhost:8002
echo.
echo The service will be available at:
echo   - Health check: http://localhost:8002/health
echo   - Detection: http://localhost:8002/detect
echo   - Model info: http://localhost:8002/model-info
echo.
echo Press Ctrl+C to stop the service.
echo.

:: Start the YOLO service
python local_yolo_backend_service.py

echo.
echo YOLO service stopped.
pause
