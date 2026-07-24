@echo off
echo ========================================
echo AutoSOS APK Fix Test Script
echo ========================================
echo.

echo This script will test the APK fix for the MainActivity issue.
echo.

echo Step 1: Checking if MainActivity exists in correct location...
if exist "android\app\src\main\java\com\autosos\app\MainActivity.java" (
    echo ✓ MainActivity.java found in correct location: com.autosos.app
) else (
    echo ✗ MainActivity.java NOT found in correct location
    echo Expected: android\app\src\main\java\com\autosos\app\MainActivity.java
    pause
    exit /b 1
)

echo.
echo Step 2: Checking if old MainActivity was removed...
if exist "android\app\src\main\java\io\ionic\starter\MainActivity.java" (
    echo ✗ Old MainActivity still exists in wrong location
    echo Please remove: android\app\src\main\java\io\ionic\starter\MainActivity.java
) else (
    echo ✓ Old MainActivity removed from wrong location
)

echo.
echo Step 3: Checking Capacitor configuration...
if exist "android\app\src\main\assets\capacitor.config.json" (
    echo ✓ Capacitor configuration found
) else (
    echo ✗ Capacitor configuration missing
    echo Run: npx cap sync android
)

echo.
echo Step 4: Checking Android manifest...
findstr /C:"com.autosos.app.MainActivity" android\app\src\main\AndroidManifest.xml >nul
if %errorlevel% == 0 (
    echo ✓ AndroidManifest.xml references correct MainActivity
) else (
    echo ✗ AndroidManifest.xml does not reference correct MainActivity
)

echo.
echo ========================================
echo APK Fix Status
echo ========================================
echo.
echo The MainActivity ClassNotFoundException should now be fixed!
echo.
echo Next steps:
echo 1. Install Java JDK 17 or 11
echo 2. Set JAVA_HOME environment variable
echo 3. Run: build-apk.bat
echo 4. Install and test the new APK
echo.
echo The app should now launch without crashing.
echo.
pause
