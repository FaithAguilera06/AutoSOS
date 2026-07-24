@echo off
echo ========================================
echo Java Environment Setup for AutoSOS
echo ========================================
echo.

echo This script will help you set up Java for Android development.
echo.

:: Check if Java is already installed
echo Checking for existing Java installation...
java -version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Java is already installed and working!
    java -version
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 0
)

echo ❌ Java is not found in PATH
echo.

:: Try to find Java installations
echo Searching for Java installations...
set "java_found=false"

:: Check common Java installation paths
set "java_paths=C:\Program Files\Java\jdk-17;C:\Program Files\Java\jdk-11;C:\Program Files\Java\jdk-8;C:\Program Files\Java\jdk-21;C:\Program Files\Eclipse Adoptium\jdk-17.0.9.9-hotspot;C:\Program Files\Eclipse Adoptium\jdk-11.0.20.8-hotspot;C:\Program Files\Eclipse Adoptium\jdk-8.0.392.8-hotspot"

for %%p in (%java_paths%) do (
    if exist "%%p\bin\java.exe" (
        echo ✅ Found Java at: %%p
        set "java_found=true"
        set "JAVA_HOME=%%p"
        goto :found_java
    )
)

:: Check Program Files (x86)
set "java_paths=C:\Program Files (x86)\Java\jdk-17;C:\Program Files (x86)\Java\jdk-11;C:\Program Files (x86)\Java\jdk-8;C:\Program Files (x86)\Java\jdk-21"

for %%p in (%java_paths%) do (
    if exist "%%p\bin\java.exe" (
        echo ✅ Found Java at: %%p
        set "java_found=true"
        set "JAVA_HOME=%%p"
        goto :found_java
    )
)

:found_java
if "%java_found%"=="true" (
    echo.
    echo Setting up Java environment...
    echo JAVA_HOME will be set to: %JAVA_HOME%
    echo.
    
    :: Set JAVA_HOME for current session
    set "JAVA_HOME=%JAVA_HOME%"
    set "PATH=%JAVA_HOME%\bin;%PATH%"
    
    :: Test Java
    echo Testing Java...
    "%JAVA_HOME%\bin\java.exe" -version
    if %errorlevel% equ 0 (
        echo.
        echo ✅ Java is working!
        echo.
        echo Do you want to set JAVA_HOME permanently? (y/n)
        set /p permanent="Enter your choice: "
        if /i "%permanent%"=="y" (
            echo Setting JAVA_HOME permanently...
            setx JAVA_HOME "%JAVA_HOME%"
            echo ✅ JAVA_HOME set permanently
            echo.
            echo Please restart your command prompt for changes to take effect.
        )
        echo.
        echo You can now run the APK build script.
        echo Press any key to exit...
        pause >nul
        exit /b 0
    ) else (
        echo ❌ Java test failed
        goto :install_java
    )
) else (
    :install_java
    echo ❌ No Java installation found
    echo.
    echo Please install Java JDK 17 or higher:
    echo.
    echo Option 1: Download from Oracle
    echo https://www.oracle.com/java/technologies/downloads/
    echo.
    echo Option 2: Download from Eclipse Adoptium (Recommended)
    echo https://adoptium.net/
    echo.
    echo Option 3: Download from Microsoft OpenJDK
    echo https://learn.microsoft.com/en-us/java/openjdk/download
    echo.
    echo After installing Java:
    echo 1. Restart your command prompt
    echo 2. Run this script again
    echo 3. Or run the APK build script
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
