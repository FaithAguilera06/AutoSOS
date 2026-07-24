@echo off
setlocal enabledelayedexpansion

echo ========================================
echo AutoSOS Android APK Build Script
echo ========================================
echo.
echo Press any key to start the build process...
pause >nul
echo.

:: Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo ✓ Node.js is installed

:: Check if npm is available
echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: npm is not available
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo ✓ npm is available

:: Check if Capacitor CLI is installed
echo Checking Capacitor CLI...
npx cap --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Capacitor CLI...
    npm install -g @capacitor/cli
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install Capacitor CLI
        pause
        exit /b 1
    )
)
echo ✓ Capacitor CLI is available

:: Check if Java is installed
echo Checking Java installation...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Java is not installed or not in PATH
    echo Please install Java JDK 17 or higher
    echo You can run setup-java-env.bat to configure Java
    echo.
    set /p continue="Do you want to continue anyway? (y/n): "
    if /i not "!continue!"=="y" (
        echo Build cancelled
        pause
        exit /b 1
    )
) else (
    echo ✓ Java is installed
)

:: Check if Android SDK is available
echo Checking Android SDK...
if not defined ANDROID_HOME (
    echo WARNING: ANDROID_HOME environment variable is not set
    echo Please run setup-android-env.bat to configure Android SDK
    echo.
    set /p continue="Do you want to continue anyway? (y/n): "
    if /i not "!continue!"=="y" (
        echo Build cancelled
        pause
        exit /b 1
    )
) else (
    echo ✓ Android SDK is configured
)

echo.
echo ========================================
echo Starting Build Process
echo ========================================
echo.

:: Step 1: Install dependencies
echo Step 1: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo ✓ Dependencies installed

:: Step 2: Build Angular app
echo.
echo Step 2: Building Angular app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Angular build failed
    echo Please check the error messages above
    pause
    exit /b 1
)
echo ✓ Angular app built successfully

:: Step 3: Sync with Capacitor
echo.
echo Step 3: Syncing with Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Capacitor sync failed
    echo Please check the error messages above
    pause
    exit /b 1
)
echo ✓ Capacitor sync completed

:: Step 4: Build APK using Gradle
echo.
echo Step 4: Building APK using Gradle...
cd android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo ERROR: APK build failed
    echo Please check the error messages above
    cd ..
    pause
    exit /b 1
)
cd ..
echo ✓ APK built successfully

:: Step 5: Locate APK
echo.
echo Step 5: Locating APK...
set APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk
if exist "%APK_PATH%" (
    echo ✓ APK found at: %APK_PATH%
    echo.
    echo ========================================
    echo BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo APK Location: %APK_PATH%
    echo APK Size: 
    for %%A in ("%APK_PATH%") do echo %%~zA bytes
    echo.
    echo You can now install this APK on your Android device.
    echo.
    
    :: Ask if user wants to open the APK location
    set /p open="Do you want to open the APK folder? (y/n): "
    if /i "!open!"=="y" (
        explorer android\app\build\outputs\apk\debug\
    )
) else (
    echo ERROR: APK not found at expected location
    echo Please check the build output for errors
)

echo.
echo ========================================
echo Build Process Complete
echo ========================================
echo.
echo Next steps:
echo 1. Transfer the APK to your Android device
echo 2. Enable "Install from unknown sources" in device settings
echo 3. Install the APK
echo.
echo For debugging, you can also run:
echo - npx cap open android (to open in Android Studio)
echo - npx cap run android (to run on connected device)
echo.
pause
