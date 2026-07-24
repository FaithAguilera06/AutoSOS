# Local YOLOv8 Service with Supabase Storage

## Overview

This setup allows you to run YOLOv8 locally on your laptop and connect your Android app via the same network. The model is automatically downloaded from Supabase storage.

## Features

- ✅ Downloads model from Supabase storage (`models/yolov8/best.pt`)
- ✅ Runs inference locally (fast response times)
- ✅ Accessible from Android app on same network
- ✅ Auto-detection of local IP address
- ✅ CORS enabled for web access
- ✅ Health check and model info endpoints
- ✅ Fallback to pretrained model if download fails

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements_local_yolo_supabase.txt
```

### 2. Configure Supabase

Create a `.env` file in the project root:

```env
SUPABASE_URL=https://atdibhoeaeqfgjswcqwx.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
```

Or set environment variables:

```bash
# Windows PowerShell
$env:SUPABASE_URL="https://atdibhoeaeqfgjswcqwx.supabase.co"
$env:SUPABASE_KEY="your_supabase_anon_key"

# Linux/Mac
export SUPABASE_URL="https://atdibhoeaeqfgjswcqwx.supabase.co"
export SUPABASE_KEY="your_supabase_anon_key"
```

### 3. Start the Service

#### Windows
```bash
start_local_yolo_supabase.bat
```

#### Linux/Mac
```bash
python local_yolo_supabase_service.py
```

#### Or directly with Python
```bash
python local_yolo_supabase_service.py
```

### 4. Note Your Local IP

When you start the service, it will display:

```
🌐 Service Information
📍 Local IP: 192.168.1.100
🔌 Port: 8000
🔗 Service URL: http://192.168.1.100:8000
```

**Save this IP address** - you'll need it for the Android app configuration.

## Android App Configuration

### Option 1: Manual Configuration

In your Android app, update the YOLO service URL to your laptop's local IP:

```typescript
// src/app/services/yolo-config.service.ts
private readonly YOLO_SERVICES = {
  primary: 'http://192.168.1.100:8000', // Your laptop's IP
  // ... other services
};
```

### Option 2: Automatic Detection

The service detector will automatically find the local service on your network.

## Usage

### Endpoints

- **Health Check**: `GET http://<your-ip>:8000/health`
- **Model Info**: `GET http://<your-ip>:8000/model-info`
- **Detect (File Upload)**: `POST http://<your-ip>:8000/detect`
- **Detect (Base64)**: `POST http://<your-ip>:8000/detect-base64`
- **Predict**: `POST http://<your-ip>:8000/predict`
- **Predict Base64**: `POST http://<your-ip>:8000/predict-base64`

### Example Detection Request

```bash
curl -X POST http://192.168.1.100:8000/detect \
  -F "file=@image.jpg" \
  -F "confidence=0.25"
```

### Example Base64 Detection

```bash
curl -X POST http://192.168.1.100:8000/detect-base64 \
  -H "Content-Type: application/json" \
  -d '{
    "image_data": "base64_encoded_image_here",
    "confidence": 0.25
  }'
```

## Response Format

```json
{
  "success": true,
  "detections": [
    {
      "class_id": 0,
      "class_name": "broken_headlights_tail_lights",
      "confidence": 0.85,
      "bbox": [100, 200, 300, 400],
      "center": {
        "x": 200,
        "y": 300
      }
    }
  ],
  "total_detections": 1,
  "model": "yolov8",
  "timestamp": 1703469443.123
}
```

## Troubleshooting

### Service Won't Start

1. **Check Python version**: `python --version` (need 3.8+)
2. **Check port availability**: Ensure port 8000 is not in use
3. **Check dependencies**: `pip install -r requirements_local_yolo_supabase.txt`
4. **Check Supabase credentials**: Verify `.env` file or environment variables

### Model Won't Download

1. **Check Supabase connection**: Verify SUPABASE_URL and SUPABASE_KEY
2. **Check model path**: Ensure `models/yolov8/best.pt` exists in Supabase storage
3. **Check network**: Ensure internet connection is available
4. **Try manual upload**: Upload `best.pt` to Supabase storage manually

### Android App Can't Connect

1. **Check same network**: Both devices must be on the same WiFi network
2. **Check firewall**: Allow port 8000 in Windows Firewall
3. **Check IP address**: Verify the laptop's IP hasn't changed
4. **Test from browser**: Open `http://<your-ip>:8000/health` in Android browser

### Performance Issues

1. **Reduce image size**: Use smaller images for faster inference
2. **Adjust confidence**: Lower confidence threshold for faster detection
3. **Use GPU**: If available, the service will use GPU automatically

## Model Storage

The model is stored in Supabase at:
- **Bucket**: `autosos`
- **Path**: `models/yolov8/best.pt`

On first run, the model is downloaded and cached locally as `best.pt` in the project root.

## Security Notes

- This service is intended for local network use only
- Do not expose this service to the internet without proper security
- The service uses CORS for web access
- Use HTTPS in production if exposing to internet

## Advanced Configuration

### Change Port

Edit `local_yolo_supabase_service.py`:

```python
uvicorn.run(
    app,
    host="0.0.0.0",
    port=8001,  # Change port here
    log_level="info"
)
```

### Use Custom Model

Upload your model to Supabase storage at `models/yolov8/your_model.pt` and update `MODEL_STORAGE_PATH` in the service file.

### Enable GPU Acceleration

Install CUDA and PyTorch with CUDA support:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the logs for error messages
3. Test with the `/health` endpoint first
4. Verify Supabase connection and model availability

---

**Note**: This service requires Python 3.8+ and a network connection to download the model from Supabase on first startup.

