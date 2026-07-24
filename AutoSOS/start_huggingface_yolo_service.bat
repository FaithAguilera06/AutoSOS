@echo off
echo ========================================
echo  Starting Hugging Face YOLOv8 Service
echo ========================================
echo.

:: Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Python not found. Please install Python first.
    pause
    exit /b 1
)

:: Check if the service file exists
if not exist "huggingface_yolo_integration.py" (
    echo ❌ huggingface_yolo_integration.py not found.
    echo Please make sure you're in the correct directory.
    pause
    exit /b 1
)

:: Check if required packages are installed
echo 🔍 Checking Python dependencies...
python -c "import transformers, huggingface_hub, torch, ultralytics" 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Some required packages are missing.
    echo.
    echo Installing Hugging Face dependencies...
    pip install -r huggingface_requirements.txt
    if %errorlevel% neq 0 (
        echo ❌ Failed to install packages.
        pause
        exit /b 1
    )
    echo ✅ Packages installed successfully.
)

echo.
echo 🚀 Starting Hugging Face YOLOv8 service on http://localhost:8002
echo.
echo The service will be available at:
echo   - Health check: http://localhost:8002/health
echo   - Detection: http://localhost:8002/detect
echo   - Model info: http://localhost:8002/model-info
echo   - Available models: http://localhost:8002/available-models
echo   - Switch model: POST http://localhost:8002/switch-model
echo.
echo 🔄 Model Loading Strategy:
echo   1. Try Hugging Face pipeline (facebook/detr-resnet-50)
echo   2. Try Hugging Face model + processor
echo   3. Fallback to Ultralytics YOLOv8
echo.
echo Press Ctrl+C to stop the service.
echo.

:: Start the service
python huggingface_yolo_integration.py

echo.
echo Hugging Face YOLOv8 service stopped.
pause
