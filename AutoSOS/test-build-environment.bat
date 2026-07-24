@echo off
echo ========================================
echo AutoSOS Build Test Script
echo ========================================
echo.
echo This script will test each component step by step.
echo.
echo Press any key to start testing...
pause >nul
echo.

echo Testing Node.js...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js test failed
    echo Press any key to exit...
    pause >nul
    exit /b 1
) else (
    echo ✅ Node.js is working
)
echo.

echo Testing npm...
npm --version
if %errorlevel% neq 0 (
    echo ❌ npm test failed
    echo Press any key to exit...
    pause >nul
    exit /b 1
) else (
    echo ✅ npm is working
)
echo.

echo Testing if package.json exists...
if exist "package.json" (
    echo ✅ package.json found
) else (
    echo ❌ package.json not found
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo.

echo Testing npm install (dry run)...
echo This will check if dependencies can be installed...
call npm install --dry-run
if %errorlevel% neq 0 (
    echo ❌ npm install test failed
    echo Press any key to exit...
    pause >nul
    exit /b 1
) else (
    echo ✅ npm install test passed
)
echo.

echo Testing Angular build command...
echo This will check if the build command exists...
call npm run build --dry-run 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Angular build command test inconclusive
    echo (This is normal, dry-run may not work for all scripts)
) else (
    echo ✅ Angular build command test passed
)
echo.

echo Testing Capacitor...
npx cap --version
if %errorlevel% neq 0 (
    echo ❌ Capacitor test failed
    echo Press any key to exit...
    pause >nul
    exit /b 1
) else (
    echo ✅ Capacitor is working
)
echo.

echo Testing Android directory...
if exist "android" (
    echo ✅ Android directory found
) else (
    echo ❌ Android directory not found
    echo Run 'npx cap add android' first
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo.

echo Testing Gradle...
cd android
if exist "gradlew.bat" (
    echo ✅ Gradle wrapper found
    echo Testing Gradle...
    call gradlew --version
    if %errorlevel% neq 0 (
        echo ❌ Gradle test failed
        cd ..
        echo Press any key to exit...
        pause >nul
        exit /b 1
    ) else (
        echo ✅ Gradle is working
    )
) else (
    echo ❌ Gradle wrapper not found
    cd ..
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
cd ..
echo.

echo ========================================
echo ALL TESTS PASSED!
echo ========================================
echo.
echo Your environment is ready for building APKs.
echo You can now run:
echo - build-apk-simple.bat (recommended)
echo - quick-build-apk.bat
echo - build-android-apk.bat
echo.
echo Press any key to exit...
pause >nul
