@echo off
echo ========================================
echo Android Development Environment Setup
echo ========================================
echo.

echo This script will help you set up the environment variables for Android development.
echo.

echo Please provide the following paths:
echo.

set /p JAVA_PATH="Enter Java JDK path (e.g., C:\Program Files\Java\jdk-17): "
set /p ANDROID_PATH="Enter Android SDK path (e.g., C:\Users\%USERNAME%\AppData\Local\Android\Sdk): "

echo.
echo Setting environment variables...

setx JAVA_HOME "%JAVA_PATH%"
setx ANDROID_HOME "%ANDROID_PATH%"

echo.
echo Adding to PATH...
setx PATH "%PATH%;%JAVA_HOME%\bin;%ANDROID_HOME%\tools;%ANDROID_HOME%\platform-tools"

echo.
echo ========================================
echo Environment variables set!
echo ========================================
echo.
echo Please restart your command prompt for changes to take effect.
echo.
echo You can now run build-apk.bat to build the APK.
echo.
pause
