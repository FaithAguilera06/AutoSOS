@echo off
echo ========================================
echo    Cloudflare Tunnel Setup for AutoSOS
echo ========================================
echo.

:: Check if cloudflared is installed
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Cloudflared not found. Please download and install it first.
    echo.
    echo 📥 Download from: https://github.com/cloudflare/cloudflared/releases
    echo 📁 Or install via package manager:
    echo    - Windows: winget install cloudflare.cloudflared
    echo    - Or download the .exe and add to PATH
    echo.
    pause
    exit /b 1
)

echo ✅ Cloudflared is installed.
echo.

:: Authenticate with Cloudflare
echo 🔐 Authenticating with Cloudflare...
echo Please log in to your Cloudflare account when prompted.
cloudflared tunnel login
if %errorlevel% neq 0 (
    echo ❌ Cloudflare authentication failed.
    pause
    exit /b 1
)

echo ✅ Successfully authenticated with Cloudflare.
echo.

:: Create tunnel
echo 🚇 Creating Cloudflare tunnel...
set TUNNEL_NAME=autosos-yolo-tunnel
cloudflared tunnel create %TUNNEL_NAME%
if %errorlevel% neq 0 (
    echo ❌ Failed to create tunnel.
    pause
    exit /b 1
)

echo ✅ Tunnel '%TUNNEL_NAME%' created successfully.
echo.

:: Create config file
echo 📝 Creating tunnel configuration...
set CONFIG_DIR=%USERPROFILE%\.cloudflared
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

echo Creating config.yml...
(
echo tunnel: %TUNNEL_NAME%
echo credentials-file: %CONFIG_DIR%\%TUNNEL_NAME%.json
echo.
echo ingress:
echo   - hostname: autosos-yolo.your-domain.com
echo     service: http://localhost:8002
echo   - service: http_status:404
) > "%CONFIG_DIR%\config.yml"

echo ✅ Configuration file created at: %CONFIG_DIR%\config.yml
echo.

:: Create DNS record
echo 🌐 Setting up DNS record...
echo Please enter your domain name (e.g., yourdomain.com):
set /p DOMAIN_NAME=Domain: 
if "%DOMAIN_NAME%"=="" (
    echo ❌ Domain name is required.
    pause
    exit /b 1
)

set SUBDOMAIN=autosos-yolo
cloudflared tunnel route dns %TUNNEL_NAME% %SUBDOMAIN%.%DOMAIN_NAME%
if %errorlevel% neq 0 (
    echo ❌ Failed to create DNS record.
    echo You may need to create it manually in your Cloudflare dashboard.
    echo Subdomain: %SUBDOMAIN%.%DOMAIN_NAME%
    echo Target: %TUNNEL_NAME%
    pause
    exit /b 1
)

echo ✅ DNS record created: %SUBDOMAIN%.%DOMAIN_NAME%
echo.

:: Update config with actual domain
echo Updating configuration with your domain...
(
echo tunnel: %TUNNEL_NAME%
echo credentials-file: %CONFIG_DIR%\%TUNNEL_NAME%.json
echo.
echo ingress:
echo   - hostname: %SUBDOMAIN%.%DOMAIN_NAME%
echo     service: http://localhost:8002
echo   - service: http_status:404
) > "%CONFIG_DIR%\config.yml"

echo ✅ Configuration updated with domain: %SUBDOMAIN%.%DOMAIN_NAME%
echo.

:: Create startup script
echo 📄 Creating startup script...
(
echo @echo off
echo echo Starting Cloudflare tunnel for AutoSOS YOLO service...
echo echo.
echo echo Make sure your local YOLO service is running on http://localhost:8002
echo echo.
echo cloudflared tunnel --config "%CONFIG_DIR%\config.yml" run %TUNNEL_NAME%
echo pause
) > "start_cloudflare_tunnel.bat"

echo ✅ Startup script created: start_cloudflare_tunnel.bat
echo.

:: Create service script
echo 📄 Creating Windows service script...
(
echo @echo off
echo echo Installing Cloudflare tunnel as Windows service...
echo echo.
echo cloudflared service install
echo if %%errorlevel%% neq 0 ^(
echo     echo ❌ Failed to install service.
echo     pause
echo     exit /b 1
echo ^)
echo.
echo echo ✅ Service installed successfully.
echo echo.
echo echo To start the service:
echo echo   net start cloudflared
echo echo.
echo echo To stop the service:
echo echo   net stop cloudflared
echo echo.
echo pause
) > "install_cloudflare_service.bat"

echo ✅ Service installation script created: install_cloudflare_service.bat
echo.

echo ========================================
echo           Setup Complete!
echo ========================================
echo.
echo 🎉 Cloudflare tunnel setup completed successfully!
echo.
echo 📋 Next Steps:
echo 1. Start your local YOLO service: python local_yolo_backend_service.py
echo 2. Start the tunnel: start_cloudflare_tunnel.bat
echo 3. Your service will be available at: https://%SUBDOMAIN%.%DOMAIN_NAME%
echo.
echo 📁 Configuration files:
echo    - Tunnel config: %CONFIG_DIR%\config.yml
echo    - Credentials: %CONFIG_DIR%\%TUNNEL_NAME%.json
echo.
echo 🔧 Optional: Install as Windows service for auto-start:
echo    - Run: install_cloudflare_service.bat
echo.
echo 📖 For more information, see: CLOUDFLARE_SETUP_GUIDE.md
echo.
pause
