@echo off
title AutoSOS YOLO Service Rollback
echo.
echo ===============================================
echo    🔄 AutoSOS YOLO Service Rollback
echo ===============================================
echo.

REM Get the current directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo 📍 Working Directory: %SCRIPT_DIR%
echo.

REM Check if backup directory exists
if not exist "backup_previous_yolo_method" (
    echo ❌ Backup directory not found!
    echo Please ensure backup_previous_yolo_method directory exists
    pause
    exit /b 1
)

echo ✅ Backup directory found
echo.

echo 🔄 Starting rollback process...
echo.

REM Backup current files before rollback
echo 📝 Creating backup of current implementation...
if not exist "backup_current_implementation" mkdir "backup_current_implementation"

if exist "src\app\client\pages\diagnostic\camera\camera.page.ts" (
    copy "src\app\client\pages\diagnostic\camera\camera.page.ts" "backup_current_implementation\camera.page.ts.current"
    echo ✅ Backed up current camera page
)

if exist "src\app\services\yolo-service-detector.service.ts" (
    copy "src\app\services\yolo-service-detector.service.ts" "backup_current_implementation\yolo-service-detector.service.ts.current"
    echo ✅ Backed up current service detector
)

echo.

REM Restore original files
echo 🔄 Restoring original files...

REM Restore camera page
if exist "backup_previous_yolo_method\camera.page.ts.backup" (
    copy "backup_previous_yolo_method\camera.page.ts.backup" "src\app\client\pages\diagnostic\camera\camera.page.ts"
    echo ✅ Restored original camera page
) else (
    echo ❌ Original camera page backup not found
)

REM Restore YOLO inference service
if exist "backup_previous_yolo_method\yolo_inference_service.py.backup" (
    copy "backup_previous_yolo_method\yolo_inference_service.py.backup" "yolo-motorcycle-diagnostic-training\backend\yolo_inference_service.py"
    echo ✅ Restored original YOLO inference service
) else (
    echo ❌ Original YOLO inference service backup not found
)

REM Restore Hugging Face integration
if exist "backup_previous_yolo_method\huggingface_yolo_integration.py.backup" (
    copy "backup_previous_yolo_method\huggingface_yolo_integration.py.backup" "huggingface_yolo_integration.py"
    echo ✅ Restored original Hugging Face integration
) else (
    echo ❌ Original Hugging Face integration backup not found
)

REM Restore app configuration
if exist "backup_previous_yolo_method\app.py.backup" (
    copy "backup_previous_yolo_method\app.py.backup" "app.py"
    echo ✅ Restored original app configuration
) else (
    echo ❌ Original app configuration backup not found
)

echo.

REM Remove new local service files
echo 🗑️ Removing local service files...

if exist "start_local_yolo_host.bat" (
    del "start_local_yolo_host.bat"
    echo ✅ Removed local YOLO host batch file
)

if exist "start_local_yolo_host.py" (
    del "start_local_yolo_host.py"
    echo ✅ Removed local YOLO host Python script
)

if exist "test_local_yolo_service.html" (
    del "test_local_yolo_service.html"
    echo ✅ Removed local YOLO service test page
)

if exist "LOCAL_YOLO_HOSTING_GUIDE.md" (
    del "LOCAL_YOLO_HOSTING_GUIDE.md"
    echo ✅ Removed local YOLO hosting guide
)

if exist "src\app\services\yolo-service-detector.service.ts" (
    del "src\app\services\yolo-service-detector.service.ts"
    echo ✅ Removed YOLO service detector
)

echo.

REM Verify rollback
echo 🔍 Verifying rollback...

if exist "src\app\client\pages\diagnostic\camera\camera.page.ts" (
    echo ✅ Camera page exists
) else (
    echo ❌ Camera page missing
)

if exist "yolo-motorcycle-diagnostic-training\backend\yolo_inference_service.py" (
    echo ✅ YOLO inference service exists
) else (
    echo ❌ YOLO inference service missing
)

echo.

echo ===============================================
echo    ✅ Rollback Complete!
echo ===============================================
echo.
echo 📋 Summary:
echo    - Original files restored
echo    - Local service files removed
echo    - Current implementation backed up
echo.
echo 🔍 Next Steps:
echo    1. Restart your development server
echo    2. Test the original YOLO service
echo    3. Verify Hugging Face Space connection
echo.
echo 📁 Backup Location: backup_current_implementation\
echo 📁 Original Backup: backup_previous_yolo_method\
echo.
pause
