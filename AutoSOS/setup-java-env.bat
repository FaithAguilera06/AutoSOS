@echo off
echo ========================================
echo AutoSOS - Java Environment Setup
echo ========================================
echo.

echo This script will help you set up Java for Android development.
echo.

echo Step 1: Check if Java is already installed...
java -version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Java is already installed!
    java -version
    echo.
    echo Step 2: Check JAVA_HOME...
    if defined JAVA_HOME (
        echo ✓ JAVA_HOME is set to: %JAVA_HOME%
    ) else (
        echo ✗ JAVA_HOME is not set
        echo.
        echo Please set JAVA_HOME manually:
        echo 1. Find your Java installation directory (usually C:\Program Files\Java\jdk-XX)
        echo 2. Set JAVA_HOME environment variable to that directory
        echo 3. Add %JAVA_HOME%\bin to your PATH
        echo.
        echo Example commands (run as Administrator):
        echo setx JAVA_HOME "C:\Program Files\Java\jdk-17"
        echo setx PATH "%PATH%;%JAVA_HOME%\bin"
    )
) else (
    echo ✗ Java is not installed or not in PATH
    echo.
    echo Please install Java JDK:
    echo 1. Download Java JDK 17 or 11 from: https://adoptium.net/
    echo 2. Install it to default location
    echo 3. Set JAVA_HOME environment variable
    echo 4. Add Java bin directory to PATH
    echo.
    echo After installation, restart this script.
)

echo.
echo ========================================
echo Setup Complete
echo ========================================
echo.
echo Next steps:
echo 1. If Java is properly configured, run: build-apk.bat
echo 2. If you need to install Java, follow the instructions above
echo.
pause
