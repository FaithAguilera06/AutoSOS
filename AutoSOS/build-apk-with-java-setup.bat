@echo off
echo ========================================
echo AutoSOS Java Setup and APK Build
echo ========================================
echo.

echo This script will:
echo 1. Check if Java is installed
echo 2. Help you install Java if needed
echo 3. Build your Android APK
echo.

echo Press any key to start...
pause >nul
echo.

:: Check if Java is already working
echo Checking Java installation...
java -version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Java is already working!
    java -version
    echo.
    echo Proceeding to APK build...
    goto :build_apk
)

echo ❌ Java is not found in PATH
echo.

:: Try to find Java installations
echo Searching for Java installations...
set "java_found=false"
set "java_paths=C:\Program Files\Java\jdk-17;C:\Program Files\Java\jdk-11;C:\Program Files\Java\jdk-8;C:\Program Files\Java\jdk-21;C:\Program Files\Eclipse Adoptium\jdk-17.0.9.9-hotspot;C:\Program Files\Eclipse Adoptium\jdk-11.0.20.8-hotspot;C:\Program Files\Eclipse Adoptium\jdk-8.0.392.8-hotspot"

for %%p in (%java_paths%) do (
    if exist "%%p\bin\java.exe" (
        echo ✅ Found Java at: %%p
        set "java_found=true"
        set "JAVA_HOME=%%p"
        set "PATH=%%p\bin;%PATH%"
        goto :java_configured
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
        goto :java_configured
    )
)

:java_configured
if "%java_found%"=="true" (
    echo.
    echo ✅ Java found and configured for this session
    echo JAVA_HOME: %JAVA_HOME%
    echo.
    echo Testing Java...
    "%JAVA_HOME%\bin\java.exe" -version
    if %errorlevel% equ 0 (
        echo ✅ Java is working!
        echo.
        echo Do you want to set JAVA_HOME permanently? (y/n)
        set /p permanent="Enter your choice: "
        if /i "%permanent%"=="y" (
            echo Setting JAVA_HOME permanently...
            setx JAVA_HOME "%JAVA_HOME%"
            echo ✅ JAVA_HOME set permanently
            echo Please restart your command prompt for permanent changes.
        )
        echo.
        goto :build_apk
    ) else (
        echo ❌ Java test failed
        goto :install_java
    )
) else (
    :install_java
    echo ❌ No Java installation found
    echo.
    echo You need to install Java JDK 17 or higher.
    echo.
    echo Recommended options:
    echo.
    echo 1. Eclipse Adoptium (Free, Recommended)
    echo    Download: https://adoptium.net/
    echo    Choose: JDK 17 or JDK 21
    echo.
    echo 2. Oracle JDK (Free for personal use)
    echo    Download: https://www.oracle.com/java/technologies/downloads/
    echo.
    echo 3. Microsoft OpenJDK (Free)
    echo    Download: https://learn.microsoft.com/en-us/java/openjdk/download
    echo.
    echo After installing Java:
    echo 1. Restart your command prompt
    echo 2. Run this script again
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

:build_apk
echo ========================================
echo Starting APK Build Process
echo ========================================
echo.

echo Step 1: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Failed to install dependencies
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo ✓ Dependencies installed successfully
echo.

echo Step 2: Building Angular app...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Angular build failed
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo ✓ Angular app built successfully
echo.

echo Step 3: Syncing with Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Capacitor sync failed
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo ✓ Capacitor sync completed
echo.

echo Step 4: Building APK...
echo Please wait, this may take a few minutes...
cd android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: APK build failed
    echo Please check the error messages above
    cd ..
    echo.
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
)

echo.
echo ========================================
echo Build process complete!
echo ========================================
echo.
echo Press any key to exit...
pause >nul
