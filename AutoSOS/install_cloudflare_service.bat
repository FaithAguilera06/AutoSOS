@echo off
echo ========================================
echo  Installing Cloudflare Tunnel Service
echo ========================================
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ This script requires administrator privileges.
    echo Please right-click and "Run as administrator"
    pause
    exit /b 1
)

:: Check if cloudflared is installed
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Cloudflared not found. Please run setup_cloudflare_tunnel.bat first.
    pause
    exit /b 1
)

:: Check if config file exists
if not exist "%USERPROFILE%\.cloudflared\config.yml" (
    echo ❌ Configuration file not found.
    echo Please run setup_cloudflare_tunnel.bat first.
    pause
    exit /b 1
)

echo 🔧 Installing Cloudflare tunnel as Windows service...
echo.

:: Install the service
cloudflared service install
if %errorlevel% neq 0 (
    echo ❌ Failed to install service.
    pause
    exit /b 1
)

echo ✅ Service installed successfully.
echo.

:: Start the service
echo 🚀 Starting the service...
net start cloudflared
if %errorlevel% neq 0 (
    echo ⚠️  Service installed but failed to start.
    echo You may need to start it manually: net start cloudflared
) else (
    echo ✅ Service started successfully.
)

echo.
echo ========================================
echo         Service Installation Complete
echo ========================================
echo.
echo 🎉 Cloudflare tunnel is now running as a Windows service!
echo.
echo 📋 Service Management Commands:
echo   - Start service:   net start cloudflared
echo   - Stop service:    net stop cloudflared
echo   - Service status:  sc query cloudflared
echo   - Uninstall:       cloudflared service uninstall
echo.
echo 🔍 To check if the tunnel is working:
echo   - Visit your configured domain
echo   - Check service logs in Windows Event Viewer
echo.
echo 📖 For troubleshooting, see: CLOUDFLARE_SETUP_GUIDE.md
echo.
pause
