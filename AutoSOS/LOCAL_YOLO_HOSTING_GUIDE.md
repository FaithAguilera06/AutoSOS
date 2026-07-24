# 🏍️ AutoSOS Local YOLO v8 Hosting Guide

This guide explains how to run YOLO v8 locally on your laptop so your AutoSOS app can use it when both devices are on the same network.

## 🎯 Overview

The local YOLO hosting setup allows you to:
- Run YOLO v8 inference locally on your laptop
- Use the same model from your Supabase database
- Automatically detect and connect when devices are on the same network
- Fallback to cloud services when local service is unavailable

## 🚀 Quick Start

### Option 1: Clickable Batch File (Windows)
1. Double-click `start_local_yolo_host.bat`
2. The script will automatically:
   - Check for Python and required packages
   - Install missing dependencies
   - Start the YOLO service on port 8000
   - Display your local IP address

### Option 2: Python Script (Cross-platform)
```bash
python start_local_yolo_host.py
```

### Option 3: Manual Setup
1. Install required packages:
   ```bash
   pip install fastapi uvicorn ultralytics opencv-python numpy pillow
   ```

2. Run the service:
   ```bash
   python yolo-motorcycle-diagnostic-training/backend/yolo_inference_service.py
   ```

## 📱 How It Works

### 1. Service Detection
Your AutoSOS app automatically detects available YOLO services in this order:
1. **Local Service** (same network) - `http://[your-laptop-ip]:8000`
2. **Cloud Service** - Your deployed YOLO service
3. **Supabase Service** - Integrated Supabase functions

### 2. Network Detection
The app scans common local network IP ranges:
- `192.168.1.x` - Common home router range
- `192.168.0.x` - Alternative home router range
- `10.0.0.x` - Corporate networks
- `172.16.x.x` - Another corporate range

### 3. Automatic Fallback
If the local service becomes unavailable, the app automatically falls back to cloud services.

## 🔧 Configuration

### Environment Variables
Set these in your `.env` file or environment:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

### Service URLs
The service detector automatically tries these URLs:
- `http://localhost:8000` (local development)
- `http://[your-ip]:8000` (local network)
- Your cloud YOLO service URL
- Supabase function URL

## 🧪 Testing

### Test the Local Service
1. Open `test_local_yolo_service.html` in your browser
2. The page will automatically detect your local YOLO service
3. Upload a motorcycle image to test detection
4. View results and annotated images

### Test from Your App
1. Start the local YOLO service on your laptop
2. Open your AutoSOS app on the same network
3. Go to Diagnostic → Camera Diagnostic
4. The app should automatically connect to your local service
5. You'll see a toast message: "YOLO service connected: local"

## 📊 Service Information

### Health Check
Visit `http://[your-ip]:8000/health` to check service status:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "service_type": "local_yolo_host",
  "ip_address": "192.168.1.100",
  "port": 8000,
  "classes": {
    "0": "Broken Headlights/Tail Lights",
    "1": "Broken Side Mirror",
    "2": "Flat Tire",
    "3": "Oil Leak"
  }
}
```

### API Endpoints
- `GET /health` - Service health check
- `POST /predict` - Upload image file for detection
- `POST /predict-base64` - Send base64 encoded image
- `GET /classes` - Get available detection classes

## 🔍 Troubleshooting

### Service Not Detected
1. **Check Firewall**: Ensure port 8000 is not blocked
2. **Check Network**: Ensure both devices are on the same network
3. **Check IP**: Verify your laptop's IP address
4. **Manual Connection**: Try setting the service URL manually

### Model Loading Issues
1. **Check Model Path**: Ensure the trained model exists
2. **Check Dependencies**: Ensure all packages are installed
3. **Fallback Model**: The service will use default YOLOv8 if custom model fails

### Connection Issues
1. **CORS**: The service includes CORS middleware for cross-origin requests
2. **Timeout**: Requests have a 3-second timeout
3. **Error Handling**: Check browser console for detailed error messages

## 📁 File Structure

```
AutoSOS/
├── start_local_yolo_host.bat          # Windows batch file
├── start_local_yolo_host.py           # Python script
├── test_local_yolo_service.html       # Test page
├── LOCAL_YOLO_HOSTING_GUIDE.md        # This guide
├── src/app/services/
│   └── yolo-service-detector.service.ts  # Service detection
└── yolo-motorcycle-diagnostic-training/
    └── backend/
        └── yolo_inference_service.py  # Main service
```

## 🌐 Network Requirements

### Local Network Setup
- Both devices must be on the same network (WiFi/LAN)
- Port 8000 must be accessible
- No VPN interference
- Firewall allows connections on port 8000

### IP Address Discovery
The app automatically discovers your laptop's IP by:
1. Checking common network ranges
2. Testing connectivity to potential IPs
3. Selecting the fastest responding service

## 🔒 Security Considerations

### Local Network Only
- The service binds to `0.0.0.0` to accept connections from any IP
- This is safe on local networks but avoid on public networks
- Consider using a VPN for remote access

### CORS Configuration
- Currently allows all origins (`*`)
- For production, restrict to your app's domain
- Update the CORS middleware in the service

## 📈 Performance

### Local vs Cloud
- **Local**: Faster inference, no internet required
- **Cloud**: More reliable, better for production
- **Hybrid**: Best of both worlds with automatic fallback

### Optimization Tips
1. **GPU**: Use GPU acceleration if available
2. **Model Size**: Use smaller models for faster inference
3. **Image Size**: Resize images before sending
4. **Batch Processing**: Process multiple images together

## 🆘 Support

### Common Issues
1. **Port 8000 in use**: Change port in service configuration
2. **Model not loading**: Check model file path and permissions
3. **Network not detected**: Manually set service URL
4. **CORS errors**: Check browser console for details

### Getting Help
1. Check the browser console for error messages
2. Test the service using the HTML test page
3. Verify network connectivity between devices
4. Check firewall and antivirus settings

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Local service starts without errors
- ✅ Health check returns successful response
- ✅ App shows "YOLO service connected: local"
- ✅ Image detection works with local service
- ✅ Fallback to cloud works when local is unavailable

---

**Happy coding! 🚀**

Your AutoSOS app now has the power of local YOLO v8 inference while maintaining cloud fallback capabilities!
