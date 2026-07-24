@echo off
echo ========================================
echo  Copy Files for Hugging Face Space
echo ========================================
echo.

:: Create a directory for Hugging Face files
set HF_DIR=autosos-huggingface-files
if not exist "%HF_DIR%" mkdir "%HF_DIR%"

echo 📁 Creating directory: %HF_DIR%
echo.

:: Copy the essential files for Hugging Face Space
echo 📋 Copying essential files...

:: Copy Dockerfile
if exist "Dockerfile" (
    copy "Dockerfile" "%HF_DIR%\"
    echo ✅ Copied Dockerfile
) else (
    echo ❌ Dockerfile not found
)

:: Copy requirements.txt
if exist "requirements.txt" (
    copy "requirements.txt" "%HF_DIR%\"
    echo ✅ Copied requirements.txt
) else (
    echo ❌ requirements.txt not found
)

:: Copy app.py
if exist "app.py" (
    copy "app.py" "%HF_DIR%\"
    echo ✅ Copied app.py
) else (
    echo ❌ app.py not found
)

:: Copy huggingface_yolo_integration.py
if exist "huggingface_yolo_integration.py" (
    copy "huggingface_yolo_integration.py" "%HF_DIR%\"
    echo ✅ Copied huggingface_yolo_integration.py
) else (
    echo ❌ huggingface_yolo_integration.py not found
)

:: Copy README.md
if exist "README.md" (
    copy "README.md" "%HF_DIR%\"
    echo ✅ Copied README.md
) else (
    echo ❌ README.md not found
)

echo.
echo ========================================
echo           Files Ready for Upload
echo ========================================
echo.
echo 📁 Files are now in: %HF_DIR%\
echo.
echo 📋 Next steps:
echo 1. Go to: https://huggingface.co/spaces/iceszn12/autosos
echo 2. Click "Files" tab
echo 3. Click "Add file" → "Upload files"
echo 4. Select all files from %HF_DIR%\ folder
echo 5. Click "Commit changes"
echo.
echo 🎯 Files to upload:
dir /b "%HF_DIR%\"
echo.
pause
