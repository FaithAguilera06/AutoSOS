# YOLOv8 Real-time Motorcycle Diagnostic Detector

A standalone application that streams your camera feed and runs YOLOv8 detection in real-time with bounding box annotations for motorcycle issues.

## 🎯 Features

- **Real-time camera streaming** with live YOLOv8 detection
- **Bounding box annotations** around detected motorcycle issues
- **Color-coded detections** for different issue types:
  - 🟡 **Yellow**: Broken Headlights/Tail Lights
  - 🟠 **Orange**: Broken Side Mirror  
  - 🔴 **Red**: Flat Tire
  - 🟣 **Purple**: Oil Leak
- **Interactive controls** for saving frames and adjusting settings
- **Performance optimized** for real-time detection

## 🚀 Quick Start

### Option 1: Run with Python (Recommended)
```bash
# Double-click this file:
run_yolo_detector.bat
```

### Option 2: Create Executable
```bash
# Double-click this file to create standalone .exe:
setup_detector.bat
```

### Option 3: Manual Python Run
```bash
python real_time_yolo_detector.py --model runs/detect/train3/weights/best.pt --confidence 0.3
```

## 🎮 Controls

When the detector is running:

- **Q** - Quit the application
- **S** - Save current frame with detections
- **C** - Change confidence threshold
- **H** - Show/hide help overlay

## ⚙️ Command Line Options

```bash
python real_time_yolo_detector.py [options]

Options:
  --model MODEL         Path to YOLOv8 model file (default: runs/detect/train3/weights/best.pt)
  --confidence CONFIDENCE  Confidence threshold 0.0-1.0 (default: 0.3)
  --camera CAMERA       Camera index (default: 0 for default camera)
  --help               Show help message
```

## 📊 What You'll See

### Detection Information
- **Real-time bounding boxes** around detected issues
- **Confidence scores** for each detection
- **Issue type labels** with color coding
- **Frame counter** and detection count
- **Performance metrics**

### Example Output
```
🤖 YOLOv8 Motorcycle Diagnostic - Real-time Detector
============================================================
🔄 Loading YOLOv8 model from: runs/detect/train3/weights/best.pt
✅ Model loaded successfully!
📊 Model size: 5.9 MB
📹 Initializing camera (index: 0)...
✅ Camera initialized: 1280x720 @ 30 FPS

🎯 Starting real-time YOLOv8 detection...
📋 Controls:
   - Press 'q' to quit
   - Press 's' to save current frame
   - Press 'c' to change confidence threshold
   - Press 'h' to show/hide help
```

## 🔧 Troubleshooting

### Camera Issues
- **No camera found**: Try different camera index: `--camera 1` or `--camera 2`
- **Permission denied**: Allow camera access in Windows settings
- **Poor performance**: Lower camera resolution or increase confidence threshold

### Model Issues
- **Model not found**: Ensure you're running from the correct directory
- **Slow detection**: The model is optimized for real-time use (50-70ms per frame)

### Performance Tips
- **Lower confidence** (0.2-0.3) for more detections
- **Higher confidence** (0.5-0.7) for fewer, more accurate detections
- **Close other applications** for better performance

## 📁 Files Created

- `real_time_yolo_detector.py` - Main detector application
- `run_yolo_detector.bat` - Easy launcher script
- `setup_detector.bat` - Setup script for creating executable
- `requirements_detector.txt` - Python dependencies
- `detection_result_*.jpg` - Saved frames with detections

## 🎯 Expected Results

The detector will show:
- **Live camera feed** with real-time motorcycle issue detection
- **Bounding boxes** around detected problems
- **Confidence scores** and issue type labels
- **Smooth 30 FPS** performance on most systems

## 🔍 Testing Your Model

1. **Point camera at motorcycle images** from your training dataset
2. **Test with real motorcycle** parts (headlights, mirrors, tires)
3. **Adjust confidence threshold** to see more/fewer detections
4. **Save frames** with detections for analysis

## 📞 Support

If you encounter issues:
1. Check that your YOLOv8 model file exists
2. Ensure camera permissions are granted
3. Try different confidence thresholds
4. Check Python and OpenCV installation

---

**Ready to test your YOLOv8 motorcycle diagnostic model in real-time!** 🏍️🤖
