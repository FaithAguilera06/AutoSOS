@echo off
echo 🌐 Setting up LocalXpose for AutoSOS YOLOv8 Service
echo ===================================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found! Please install Python first.
    pause
    exit /b 1
)

echo ✅ Python is ready!
echo.

REM Check if localxpose is installed
localxpose --version >nul 2>&1
if errorlevel 1 (
    echo 📥 LocalXpose not found. Please install it first:
    echo.
    echo 1. Go to: https://localxpose.io/download
    echo 2. Download the Windows version
    echo 3. Extract and place localxpose.exe in this directory
    echo 4. Or add it to your PATH
    echo.
    pause
    exit /b 1
)

echo ✅ LocalXpose is ready!
echo.

echo 🚀 Starting local YOLOv8 service...
start "AutoSOS YOLOv8 Service" /min python local_yolo_backend_service.py

REM Wait for service to start
echo ⏳ Waiting for service to start...
timeout /t 5 /nobreak >nul

echo ✅ Local service started on http://localhost:8002
echo.

echo 🌐 Starting LocalXpose tunnel...
echo 💡 This will create a public URL for your local service
echo 💡 Keep this window open while using the service
echo.

REM Start LocalXpose tunnel
localxpose tunnel http --to localhost:8002

echo.
echo 🛑 Services stopped
pause
