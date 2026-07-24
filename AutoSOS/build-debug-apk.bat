@echo off
echo ========================================
echo AutoSOS Debug APK Build
echo ========================================
echo.

echo Building Angular app with debug info...
call npm run build -- --configuration=production
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo Syncing with Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo Sync failed!
    pause
    exit /b 1
)

echo Building debug APK...
cd android
call gradlew assembleDebug --stacktrace --info
cd ..

echo.
echo Debug APK built! Location: android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo Opening Android Studio for debugging...
call npx cap open android
echo.
pause

