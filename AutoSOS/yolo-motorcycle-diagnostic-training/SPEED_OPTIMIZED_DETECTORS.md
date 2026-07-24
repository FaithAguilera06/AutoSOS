# Speed-Optimized YOLOv8 Detectors

Multiple detector versions optimized for different speed requirements:

## 🚀 Speed Options (Fastest to Slowest)

### 1. **MINIMAL** - Absolute Fastest
- **File**: `MINIMAL.bat`
- **Resolution**: 160x120 (tiny)
- **Processing**: Every 5th frame only
- **Graphics**: Minimal rectangles and text
- **Use**: Maximum speed, lowest quality

### 2. **ULTRA_FAST** - Very Fast
- **File**: `ULTRA_FAST.bat`
- **Resolution**: 320x240 (small)
- **Processing**: Every 3rd frame only
- **Graphics**: Simple rectangles and labels
- **Use**: High speed, low quality

### 3. **INSTANT** - Fast with Background Loading
- **File**: `INSTANT_DETECTOR.bat`
- **Resolution**: 640x480 (medium)
- **Processing**: Every 2nd frame
- **Graphics**: Standard quality
- **Use**: Good speed, camera starts immediately

### 4. **FAST** - Balanced Speed
- **File**: `FAST_DETECTOR.bat`
- **Resolution**: 640x480 (medium)
- **Processing**: Every 2nd frame
- **Graphics**: Good quality
- **Use**: Balanced speed and quality

### 5. **Original** - Full Quality
- **File**: `START_YOLO_DETECTOR.bat`
- **Resolution**: 1280x720 (high)
- **Processing**: Every frame
- **Graphics**: Full quality
- **Use**: Best quality, slower speed

## ⚡ Speed Comparison

| Detector | Resolution | Frame Skip | Speed | Quality |
|----------|------------|------------|-------|---------|
| MINIMAL | 160x120 | 5 | ⚡⚡⚡⚡⚡ | ⭐ |
| ULTRA_FAST | 320x240 | 3 | ⚡⚡⚡⚡ | ⭐⭐ |
| INSTANT | 640x480 | 2 | ⚡⚡⚡ | ⭐⭐⭐ |
| FAST | 640x480 | 2 | ⚡⚡ | ⭐⭐⭐⭐ |
| Original | 1280x720 | 1 | ⚡ | ⭐⭐⭐⭐⭐ |

## 🎯 Recommended Usage

### For Maximum Speed:
```bash
# Double-click:
MINIMAL.bat
```

### For Balanced Speed/Quality:
```bash
# Double-click:
ULTRA_FAST.bat
```

### For Good Quality with Fast Loading:
```bash
# Double-click:
INSTANT_DETECTOR.bat
```

## 🔧 Speed Optimizations Applied

1. **Ultra-low resolution** (160x120 to 320x240)
2. **Frame skipping** (process every 2nd-5th frame)
3. **Minimal graphics** (simple rectangles, short labels)
4. **Background model loading** (camera starts immediately)
5. **Reduced processing** (smaller inference resolution)
6. **Lower confidence threshold** (0.15-0.2 for more detections)

## 📊 Performance Tips

- **MINIMAL**: Use for testing if YOLOv8 works at all
- **ULTRA_FAST**: Use for real-time testing with acceptable quality
- **INSTANT**: Use for development and testing
- **FAST**: Use for production with good quality
- **Original**: Use for final demonstrations

## 🎮 Controls (All Versions)

- **Q** - Quit
- **S** - Save frame (if detections found)
- **C** - Change confidence (some versions)
- **H** - Toggle help (some versions)

---

**Choose the detector that matches your speed requirements!** 🚀
