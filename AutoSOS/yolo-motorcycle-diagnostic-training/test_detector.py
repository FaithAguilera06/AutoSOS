#!/usr/bin/env python3
"""
Test script for YOLOv8 Real-time Detector
Tests model loading and basic functionality without camera
"""

import os
import sys
from ultralytics import YOLO
import numpy as np

def test_model_loading():
    """Test if the YOLOv8 model loads correctly"""
    print("🧪 Testing YOLOv8 Model Loading...")
    
    model_path = "runs/detect/train3/weights/best.pt"
    
    if not os.path.exists(model_path):
        print(f"❌ Model file not found: {model_path}")
        return False
    
    try:
        model = YOLO(model_path)
        print(f"✅ Model loaded successfully!")
        print(f"📊 Model size: {os.path.getsize(model_path) / (1024*1024):.1f} MB")
        return True
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return False

def test_dummy_inference():
    """Test inference with a dummy image"""
    print("\n🧪 Testing Dummy Inference...")
    
    try:
        model = YOLO("runs/detect/train3/weights/best.pt")
        
        # Create a dummy image (640x640, 3 channels)
        dummy_image = np.zeros((640, 640, 3), dtype=np.uint8)
        
        # Run inference
        results = model(dummy_image, conf=0.3, verbose=False)
        
        print(f"✅ Inference completed successfully!")
        print(f"📊 Results processed: {len(results)} result(s)")
        
        return True
    except Exception as e:
        print(f"❌ Error during inference: {e}")
        return False

def test_dependencies():
    """Test if all required dependencies are available"""
    print("🧪 Testing Dependencies...")
    
    dependencies = [
        ('ultralytics', 'YOLOv8'),
        ('cv2', 'OpenCV'),
        ('numpy', 'NumPy'),
        ('torch', 'PyTorch')
    ]
    
    all_good = True
    
    for module_name, display_name in dependencies:
        try:
            __import__(module_name)
            print(f"✅ {display_name} - Available")
        except ImportError:
            print(f"❌ {display_name} - Missing")
            all_good = False
    
    return all_good

def main():
    """Main test function"""
    print("🤖 YOLOv8 Real-time Detector - Test Suite")
    print("=" * 50)
    
    # Test dependencies
    deps_ok = test_dependencies()
    
    if not deps_ok:
        print("\n❌ Some dependencies are missing. Please install them:")
        print("pip install -r requirements_detector.txt")
        return
    
    # Test model loading
    model_ok = test_model_loading()
    
    if not model_ok:
        print("\n❌ Model loading failed. Check model file path.")
        return
    
    # Test inference
    inference_ok = test_dummy_inference()
    
    if not inference_ok:
        print("\n❌ Inference test failed.")
        return
    
    print("\n🎉 All tests passed!")
    print("✅ Your YOLOv8 detector is ready to run!")
    print("\n📋 Next steps:")
    print("1. Run: run_yolo_detector.bat")
    print("2. Or create executable: setup_detector.bat")
    print("3. Point camera at motorcycle images to test detection")

if __name__ == "__main__":
    main()
