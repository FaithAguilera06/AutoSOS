# Quick Start: Local YOLO Service with Supabase

## 🎯 What This Does

Runs YOLOv8 locally on your laptop and allows your Android app to connect via the same WiFi network. The model is automatically downloaded from Supabase storage.

## 🚀 Quick Start (5 minutes)

### Step 1: Start the Local Service

**Windows:**
```bash
start_local_yolo_supabase.bat
```

**Mac/Linux:**
```bash
python local_yolo_supabase_service.py
```

### Step 2: Note Your Laptop's IP Address

When the service starts, you'll see output like:

```
🌐 Service Information
📍 Local IP: 192.168.1.100
🔌 Port: 8000
```

**Write down this IP address!**

### Step 3: Connect Your Android App

The Android app will automatically detect the local service. No configuration needed! 

The service detector prioritizes:
1. ✅ Local service (your laptop) - FASTEST
2. Cloud service (fallback)
3. Supabase service (fallback)

## 📱 Testing the Connection

### Test from Android Browser

Open this URL on your Android device:
```
http://<your-laptop-ip>:8000/health
```

You should see:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "ip_address": "192.168.1.100",
  "port": 8000,
  "service_type": "local_supabase_yolo"
}
```

### Test from Android App

1. Open the AutoSOS app
2. Go to Diagnostic > Camera
3. Click "Start Camera"
4. The app will automatically detect and connect to your local service

## 🔧 Troubleshooting

### Can't Find the Local Service?

**Check the same WiFi network:**
- Laptop and Android device must be on the same WiFi
- Check WiFi connection on both devices

**Check firewall:**
- Windows Firewall might block port 8000
- Allow Python to use the network

**Check IP address:**
- Your laptop's IP might have changed
- Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find current IP

### Model Won't Download?

**Check Supabase credentials:**
- Create `.env` file in project root:
```env
SUPABASE_URL=https://atdibhoeaeqfgjswcqwx.supabase.co
SUPABASE_KEY=your_key_here
```

**Check model exists:**
- Ensure `models/yolov8/best.pt` is in Supabase storage
- You can manually upload the model if needed

### Service Won't Start?

**Install dependencies:**
```bash
pip install -r requirements_local_yolo_supabase.txt
```

**Check Python version:**
```bash
python --version
```
Need Python 3.8 or later

**Check port availability:**
```bash
# Windows
netstat -ano | findstr :8000

# Mac/Linux
lsof -i :8000
```

## 📊 Usage Examples

### Test Detection with cURL

**Upload an image:**
```bash
curl -X POST http://192.168.1.100:8000/detect \
  -F "file=@image.jpg" \
  -F "confidence=0.25"
```

**With base64 image:**
```bash
curl -X POST http://192.168.1.100:8000/detect-base64 \
  -H "Content-Type: application/json" \
  -d '{
    "image_data": "base64_encoded_image",
    "confidence": 0.25
  }'
```

## 🎨 How It Works

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│   Android App   │────────>│  Local YOLO      │────────>│   Supabase   │
│                 │ Connect │   Service         │ Download │   Storage    │
│  (Your Device)  │<────────│  (Your Laptop)   │<────────│              │
└─────────────────┘         └──────────────────┘         └──────────────┘
      WiFi                        FastAPI              Download best.pt
                                   Port 8000
```

## 🔐 Security

- **Local network only** - Service is not exposed to internet
- **CORS enabled** - Allows web access from same network
- **No authentication** - Local development only
- For production: Add authentication and use HTTPS

## 💡 Tips

### Faster Detection
- Use smaller images (640x480 or smaller)
- Lower confidence threshold (0.15-0.25)
- Ensure good lighting when taking photos

### Better Performance
- Use wired connection for laptop if possible
- Close other apps on laptop
- Use SSD for faster model loading

### Network Debugging
```bash
# Find your laptop's IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# Test from terminal
curl http://192.168.1.100:8000/health

# Check if port is open
telnet 192.168.1.100 8000
```

## 📝 Environment Variables

Create `.env` file:

```env
SUPABASE_URL=https://atdibhoeaeqfgjswcqwx.supabase.co
SUPABASE_KEY=your_supabase_anon_key
```

Or set directly:

**Windows PowerShell:**
```powershell
$env:SUPABASE_URL="https://atdibhoeaeqfgjswcqwx.supabase.co"
$env:SUPABASE_KEY="your_key"
```

**Mac/Linux:**
```bash
export SUPABASE_URL="https://atdibhoeaeqfgjswcqwx.supabase.co"
export SUPABASE_KEY="your_key"
```

## 🚨 Common Issues

### Issue: "Connection refused"
**Solution:** Make sure the service is running and firewall allows port 8000

### Issue: "Model not loaded"
**Solution:** Check Supabase connection and model path in storage

### Issue: "Cannot download model"
**Solution:** Check internet connection and Supabase credentials

### Issue: "Detection is slow"
**Solution:** Reduce image size or use GPU acceleration

## 📞 Support

Need help?
1. Check the logs when starting the service
2. Test the `/health` endpoint first
3. Verify WiFi connection
4. Check firewall settings
5. Review `.env` configuration

---

**Ready to start?** Run `start_local_yolo_supabase.bat` and get your local IP address!

