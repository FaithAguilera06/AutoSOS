@echo off
echo ========================================
echo AutoSOS Quick APK Build
echo ========================================
echo.
echo Press any key to start quick build...
pause >nul
echo.

echo Building Angular app...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ❌ Build failed!
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo Syncing with Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo.
    echo ❌ Sync failed!
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo Building APK...
cd android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo.
    echo ❌ APK build failed!
    cd ..
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
cd ..

echo.
echo ✅ APK built successfully!
echo Location: android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo Press any key to exit...
pause >nul

