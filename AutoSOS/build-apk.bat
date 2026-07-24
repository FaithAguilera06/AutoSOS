@echo off
echo ========================================
echo AutoSOS APK Build Script
echo ========================================
echo.
cd "C:\Users\Ice2Fast\Desktop\AUTOSOS SUPABASE\AutoSOS"
echo Step 1: Building Angular app...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Syncing with Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo Sync failed!
    pause
    exit /b 1
)

echo.
echo Step 3: Mapbox configuration...
echo Using web-based Mapbox GL JS (no native dependencies needed)
echo.

echo.
echo Step 4: Opening Android Studio...
echo Please follow these steps in Android Studio:
echo 1. Wait for Gradle sync to complete
echo 2. Go to Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo 3. Wait for the build to complete
echo 4. The APK will be located in: android\app\build\outputs\apk\debug\
echo.

call npx cap open android

echo.
echo ========================================
echo Build process initiated!
echo ========================================
echo.
echo If Android Studio doesn't open automatically:
echo 1. Open Android Studio manually
echo 2. Open the project: %cd%\android
echo 3. Wait for Gradle sync
echo 4. Build APK from Build menu
echo.
pause
