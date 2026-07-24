@echo off
echo ========================================
echo    Starting Cloudflare Tunnel
echo ========================================
echo.

:: Check if cloudflared is installed
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Cloudflared not found. Please run setup_cloudflare_tunnel.bat first.
    pause
    exit /b 1
)

:: Check if local YOLO service is running
echo 🔍 Checking if local YOLO service is running...
curl -s http://localhost:8002/health >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Local YOLO service is not running on http://localhost:8002
    echo.
    echo Please start your local YOLO service first:
    echo   python local_yolo_backend_service.py
    echo.
    echo Or run: start_local_yolo_service.bat
    echo.
    set /p CONTINUE=Continue anyway? (y/N): 
    if /i not "%CONTINUE%"=="y" (
        echo Exiting...
        pause
        exit /b 1
    )
) else (
    echo ✅ Local YOLO service is running.
)

echo.
echo 🚇 Starting Cloudflare tunnel...
echo.
echo Your YOLO service will be available at your configured domain.
echo Press Ctrl+C to stop the tunnel.
echo.

:: Start the tunnel
cloudflared tunnel --config "%USERPROFILE%\.cloudflared\config.yml" run autosos-yolo-tunnel

echo.
echo Tunnel stopped.
pause
