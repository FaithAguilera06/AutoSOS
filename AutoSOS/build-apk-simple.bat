@echo off
echo ========================================
echo AutoSOS Android APK Build Script
echo ========================================
echo.
echo This script will build your Android APK step by step.
echo.
echo Press any key to start...
pause >nul
echo.

echo Step 1: Installing dependencies...
echo Please wait...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Failed to install dependencies
    echo Please check the error messages above
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo ✓ Dependencies installed successfully
echo.

echo Step 2: Building Angular app...
echo Please wait...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Angular build failed
    echo Please check the error messages above
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo ✓ Angular app built successfully
echo.

echo Step 3: Syncing with Capacitor...
echo Please wait...
call npx cap sync android
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Capacitor sync failed
    echo Please check the error messages above
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo ✓ Capacitor sync completed
echo.

echo Step 4: Building APK...
echo Please wait, this may take a few minutes...

:: Check and set Java environment
echo Checking Java environment...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java not found in PATH, trying to detect Java installation...
    
    :: Try to find Java installations
    set "java_found=false"
    set "java_paths=C:\Program Files\Java\jdk-17;C:\Program Files\Java\jdk-11;C:\Program Files\Java\jdk-8;C:\Program Files\Java\jdk-21;C:\Program Files\Eclipse Adoptium\jdk-17.0.9.9-hotspot;C:\Program Files\Eclipse Adoptium\jdk-11.0.20.8-hotspot;C:\Program Files\Eclipse Adoptium\jdk-8.0.392.8-hotspot"
    
    for %%p in (%java_paths%) do (
        if exist "%%p\bin\java.exe" (
            echo ✅ Found Java at: %%p
            set "java_found=true"
            set "JAVA_HOME=%%p"
            set "PATH=%%p\bin;%PATH%"
            goto :java_ready
        )
    )
    
    :: Check Program Files (x86)
    set "java_paths=C:\Program Files (x86)\Java\jdk-17;C:\Program Files (x86)\Java\jdk-11;C:\Program Files (x86)\Java\jdk-8;C:\Program Files (x86)\Java\jdk-21"
    
    for %%p in (%java_paths%) do (
        if exist "%%p\bin\java.exe" (
            echo ✅ Found Java at: %%p
            set "java_found=true"
            set "JAVA_HOME=%%p"
            set "PATH=%%p\bin;%PATH%"
            goto :java_ready
        )
    )
    
    if "%java_found%"=="false" (
        echo.
        echo ❌ ERROR: Java JDK not found!
        echo.
        echo Please install Java JDK 17 or higher:
        echo 1. Download from https://adoptium.net/ (Recommended)
        echo 2. Or run setup-java.bat to help configure Java
        echo 3. Restart command prompt after installation
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
    
    :java_ready
    echo ✅ Java environment configured
) else (
    echo ✅ Java is already configured
)

cd android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: APK build failed
    echo Please check the error messages above
    echo.
    echo Common solutions:
    echo 1. Run setup-java.bat to configure Java
    echo 2. Make sure Android SDK is installed
    echo 3. Check if JAVA_HOME is set correctly
    echo.
    cd ..
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
cd ..
echo ✓ APK built successfully
echo.

echo ========================================
echo BUILD SUCCESSFUL!
echo ========================================
echo.
echo Your APK is located at:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo.

:: Check if APK exists and show size
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    echo APK file found!
    for %%A in ("android\app\build\outputs\apk\debug\app-debug.apk") do (
        echo APK Size: %%~zA bytes
    )
    echo.
    set /p open="Do you want to open the APK folder? (y/n): "
    if /i "!open!"=="y" (
        explorer android\app\build\outputs\apk\debug\
    )
) else (
    echo ❌ APK file not found at expected location
    echo Please check the build output for errors
)

echo.
echo ========================================
echo Build process complete!
echo ========================================
echo.
echo Next steps:
echo 1. Transfer the APK to your Android device
echo 2. Enable "Install from unknown sources" in device settings
echo 3. Install the APK
echo.
echo Press any key to exit...
pause >nul
