# Cloudflare Tunnel Setup Guide for AutoSOS

This guide will help you set up a Cloudflare tunnel to expose your local YOLO service to the internet, allowing your AutoSOS app to use your local computer for AI processing.

## 📋 Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Domain**: You need a domain managed by Cloudflare
3. **Local YOLO Service**: Your `local_yolo_backend_service.py` should be working
4. **Windows Computer**: This guide is for Windows (can be adapted for other OS)

## 🚀 Quick Setup

### Step 1: Download Cloudflared

1. Go to [Cloudflared Releases](https://github.com/cloudflare/cloudflared/releases)
2. Download the Windows version (`cloudflared-windows-amd64.exe`)
3. Rename it to `cloudflared.exe`
4. Add it to your PATH or place it in your project folder

**Alternative**: Install via package manager:
```bash
winget install cloudflare.cloudflared
```

### Step 2: Run Setup Script

1. Open Command Prompt as Administrator
2. Navigate to your AutoSOS project folder
3. Run the setup script:
```bash
setup_cloudflare_tunnel.bat
```

This script will:
- ✅ Check if cloudflared is installed
- 🔐 Authenticate with Cloudflare
- 🚇 Create a tunnel named `autosos-yolo-tunnel`
- 🌐 Set up DNS records
- 📝 Create configuration files
- 📄 Generate startup scripts

### Step 3: Start Your Services

1. **Start Local YOLO Service**:
```bash
start_local_yolo_service.bat
```

2. **Start Cloudflare Tunnel**:
```bash
start_cloudflare_tunnel.bat
```

### Step 4: Test Your Setup

1. Set your tunnel URL as an environment variable:
```bash
set CLOUDFLARE_TUNNEL_URL=https://autosos-yolo.yourdomain.com
```

2. Run the test script:
```bash
python test_cloudflare_setup.py
```

## 📁 Generated Files

After setup, you'll have these files:

- `setup_cloudflare_tunnel.bat` - Initial setup script
- `start_cloudflare_tunnel.bat` - Start tunnel manually
- `start_local_yolo_service.bat` - Start local YOLO service
- `install_cloudflare_service.bat` - Install as Windows service
- `test_cloudflare_setup.py` - Test script
- `%USERPROFILE%\.cloudflared\config.yml` - Tunnel configuration
- `%USERPROFILE%\.cloudflared\autosos-yolo-tunnel.json` - Tunnel credentials

## 🔧 Configuration Details

### Tunnel Configuration (`config.yml`)
```yaml
tunnel: autosos-yolo-tunnel
credentials-file: C:\Users\YourUsername\.cloudflared\autosos-yolo-tunnel.json

ingress:
  - hostname: autosos-yolo.yourdomain.com
    service: http://localhost:8002
  - service: http_status:404
```

### DNS Record
- **Type**: CNAME
- **Name**: autosos-yolo
- **Target**: autosos-yolo-tunnel.cfargotunnel.com
- **Proxy**: Enabled (orange cloud)

## 🚀 Running as Windows Service (Optional)

For automatic startup:

1. Run as Administrator:
```bash
install_cloudflare_service.bat
```

2. The service will start automatically on boot

3. Manage the service:
```bash
net start cloudflared    # Start service
net stop cloudflared     # Stop service
sc query cloudflared     # Check status
```

## 🧪 Testing Your Setup

### Manual Testing

1. **Test Local Service**:
```bash
curl http://localhost:8002/health
```

2. **Test Tunnel**:
```bash
curl https://autosos-yolo.yourdomain.com/health
```

### Automated Testing

Run the comprehensive test script:
```bash
python test_cloudflare_setup.py
```

This will test:
- ✅ Local service health endpoint
- ✅ Local service model info
- ✅ Local service detection
- ✅ Tunnel health endpoint
- ✅ Tunnel model info
- ✅ Tunnel detection

## 🔧 Troubleshooting

### Common Issues

#### 1. "Cloudflared not found"
- **Solution**: Download and install cloudflared, add to PATH

#### 2. "Authentication failed"
- **Solution**: Make sure you're logged into the correct Cloudflare account

#### 3. "DNS record creation failed"
- **Solution**: Create manually in Cloudflare dashboard:
  - Type: CNAME
  - Name: autosos-yolo
  - Target: autosos-yolo-tunnel.cfargotunnel.com

#### 4. "Local service not running"
- **Solution**: Start your YOLO service first:
```bash
python local_yolo_backend_service.py
```

#### 5. "Tunnel connection failed"
- **Solution**: Check firewall settings, ensure port 8002 is accessible

### Debug Commands

1. **Check tunnel status**:
```bash
cloudflared tunnel list
```

2. **Check tunnel configuration**:
```bash
cloudflared tunnel info autosos-yolo-tunnel
```

3. **Test tunnel connectivity**:
```bash
cloudflared tunnel --config %USERPROFILE%\.cloudflared\config.yml run autosos-yolo-tunnel --loglevel debug
```

4. **Check service logs** (if running as service):
```bash
# Open Event Viewer
# Navigate to: Windows Logs > Application
# Look for cloudflared entries
```

## 🔒 Security Considerations

1. **HTTPS**: Cloudflare automatically provides HTTPS
2. **Access Control**: Consider adding Cloudflare Access rules
3. **Rate Limiting**: Configure rate limits in Cloudflare dashboard
4. **Firewall**: Your local service is only accessible through the tunnel

## 📊 Monitoring

### Cloudflare Dashboard
- Monitor traffic in Cloudflare Analytics
- Check tunnel status in Zero Trust > Tunnels
- View DNS records in DNS management

### Local Monitoring
- Check service logs in Event Viewer
- Monitor local YOLO service logs
- Use the test script for health checks

## 🔄 Updating Your App

Once your tunnel is working, update your AutoSOS app to use the tunnel URL:

1. **Update Frontend Configuration**:
```typescript
// In your Angular service
const YOLO_SERVICE_URL = 'https://autosos-yolo.yourdomain.com';
```

2. **Test the Integration**:
- Use the camera diagnostic feature
- Check that detections work through the tunnel
- Monitor response times

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Cloudflare tunnel documentation
3. Check your local YOLO service logs
4. Verify DNS propagation (can take up to 24 hours)

## 🎯 Next Steps

After successful setup:

1. ✅ Test all AutoSOS features with the tunnel
2. 🔧 Configure Cloudflare Access for additional security
3. 📊 Set up monitoring and alerts
4. 🚀 Consider load balancing for multiple instances
5. 💾 Set up automated backups of your configuration

---

**Happy tunneling! 🚇✨**
