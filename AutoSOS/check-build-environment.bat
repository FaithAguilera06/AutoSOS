@echo off
setlocal enabledelayedexpansion

echo ========================================
echo AutoSOS Android Build Environment Check
echo ========================================
echo.

set "all_good=true"

:: Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    echo    Please install from: https://nodejs.org/
    set "all_good=false"
) else (
    for /f "tokens=*" %%i in ('node --version') do set "node_version=%%i"
    echo ✓ Node.js !node_version! is installed
)

:: Check npm
echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not available
    set "all_good=false"
) else (
    for /f "tokens=*" %%i in ('npm --version') do set "npm_version=%%i"
    echo ✓ npm !npm_version! is available
)

:: Check Java
echo Checking Java...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java is not installed or not in PATH
    echo    Please install Java JDK 17 or higher
    echo    Run setup-java-env.bat to configure Java
    set "all_good=false"
) else (
    echo ✓ Java is installed
)

:: Check Android SDK
echo Checking Android SDK...
if not defined ANDROID_HOME (
    echo ❌ ANDROID_HOME environment variable is not set
    echo    Please run setup-android-env.bat to configure Android SDK
    set "all_good=false"
) else (
    echo ✓ Android SDK is configured at: %ANDROID_HOME%
)

:: Check Android SDK tools
if defined ANDROID_HOME (
    if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
        echo ✓ Android platform-tools are available
    ) else (
        echo ❌ Android platform-tools not found
        echo    Please install Android SDK Platform-Tools
        set "all_good=false"
    )
)

:: Check Capacitor CLI
echo Checking Capacitor CLI...
npx cap --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Capacitor CLI not found, will install during build
) else (
    for /f "tokens=*" %%i in ('npx cap --version') do set "cap_version=%%i"
    echo ✓ Capacitor CLI !cap_version! is available
)

:: Check Ionic CLI
echo Checking Ionic CLI...
ionic --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Ionic CLI not found, will install during build
) else (
    for /f "tokens=*" %%i in ('ionic --version') do set "ionic_version=%%i"
    echo ✓ Ionic CLI !ionic_version! is available
)

echo.
echo ========================================
if "%all_good%"=="true" (
    echo ✅ ALL CHECKS PASSED - Ready to build APK!
    echo.
    echo You can now run:
    echo - build-android-apk.bat (full build with checks)
    echo - quick-build-apk.bat (quick build)
    echo - build-debug-apk.bat (debug build)
) else (
    echo ❌ SOME CHECKS FAILED - Please fix issues above
    echo.
    echo Common solutions:
    echo 1. Install Node.js from https://nodejs.org/
    echo 2. Run setup-java-env.bat to configure Java
    echo 3. Run setup-android-env.bat to configure Android SDK
    echo 4. Install Android Studio and Android SDK
)
echo ========================================
echo.
pause
