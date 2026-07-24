# LocalXpose Setup Guide for AutoSOS YOLOv8 Service

## 📋 Prerequisites

1. **LocalXpose Account**: You already have this ✅
2. **Python**: For running the local YOLOv8 service
3. **LocalXpose CLI**: Download from https://localxpose.io/download

## 🚀 Quick Setup

### Step 1: Install LocalXpose CLI

1. Go to https://localxpose.io/download
2. Download the Windows version
3. Extract `localxpose.exe` to your project directory
4. Or add it to your system PATH

### Step 2: Login to LocalXpose

```bash
# Login with your account
localxpose login

# Enter your email and password when prompted
```

### Step 3: Start Your Local Service

```bash
# Install Python dependencies (if not already done)
pip install fastapi uvicorn opencv-python ultralytics numpy python-multipart

# Start the local YOLOv8 service
python local_yolo_backend_service.py
```

### Step 4: Create Tunnel

```bash
# Create a tunnel to your local service
localxpose tunnel http --to localhost:8002

# Or with a custom subdomain
localxpose tunnel http --to localhost:8002 --subdomain autosos-yolo
```

## 🔧 Manual Setup (Alternative)

If you prefer to set it up manually:

### 1. Start Local Service
```bash
python local_yolo_backend_service.py
```

### 2. Create Tunnel
```bash
localxpose tunnel http --to localhost:8002
```

### 3. Copy the Public URL
LocalXpose will give you a URL like:
```
https://abc123.loca.lt
```

### 4. Update Frontend
Update your Angular app to use the LocalXpose URL instead of localhost.

## 🎯 Testing Your Setup

### Test Local Service
```bash
# Test if local service is working
curl http://localhost:8002/health
```

### Test Public URL
```bash
# Test the LocalXpose URL (replace with your actual URL)
curl https://your-url.loca.lt/health
```

## 🔄 Frontend Integration

Update your camera page to use the LocalXpose URL:

```typescript
// In src/app/client/pages/diagnostic/camera/camera.page.ts
// Replace the YOLO_SERVICE_URL with your LocalXpose URL
private readonly YOLO_SERVICE_URL = 'https://your-url.loca.lt';
```

## 📱 Mobile Testing

Once you have the LocalXpose URL, you can test your app on mobile devices:

1. Make sure your phone is connected to the internet
2. Update the service URL in your app
3. The app will now use your local YOLOv8 service through the public URL

## 🛠️ Troubleshooting

### Common Issues

1. **Service not starting**: Check if port 8002 is available
2. **Tunnel not working**: Make sure you're logged in to LocalXpose
3. **CORS errors**: The service is configured to allow all origins
4. **Model not loading**: Check if your YOLOv8 model files are in the correct location

### Useful Commands

```bash
# Check if service is running
curl http://localhost:8002/health

# List active tunnels
localxpose tunnel list

# Stop all tunnels
localxpose tunnel stop-all
```

## 🎉 Benefits

- ✅ **Free**: LocalXpose has a free tier
- ✅ **Easy**: Simple setup process
- ✅ **Fast**: Direct connection to your local service
- ✅ **Mobile**: Test on real devices
- ✅ **Secure**: HTTPS by default

## 📞 Support

If you need help:
- LocalXpose Docs: https://localxpose.io/docs
- LocalXpose Support: https://localxpose.io/support
