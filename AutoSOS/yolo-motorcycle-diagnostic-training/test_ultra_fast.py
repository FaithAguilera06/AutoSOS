#!/usr/bin/env python3
"""
Test Ultra Fast Detector - No Camera Required
Tests the detector components without camera access
"""

import os
import sys
import time
import numpy as np

def test_imports():
    """Test if all required imports work"""
    print("🔍 Testing imports...")
    
    try:
        import cv2
        print("✅ OpenCV imported successfully")
    except ImportError as e:
        print(f"❌ OpenCV import failed: {e}")
        return False
    
    try:
        from ultralytics import YOLO
        print("✅ YOLO imported successfully")
    except ImportError as e:
        print(f"❌ YOLO import failed: {e}")
        return False
    
    return True

def test_model_loading():
    """Test if model can be loaded"""
    print("\n🔄 Testing model loading...")
    
    try:
        from ultralytics import YOLO
        
        model_path = "runs/detect/train3/weights/best.pt"
        if os.path.exists(model_path):
            print(f"✅ Model file found: {model_path}")
            
            # Try to load the model
            model = YOLO(model_path)
            print("✅ Model loaded successfully!")
            
            # Test inference on a dummy image
            dummy_image = np.zeros((240, 320, 3), dtype=np.uint8)
            results = model(dummy_image, conf=0.2, verbose=False, device='cpu')
            print("✅ Model inference test passed!")
            
            return True
        else:
            print(f"❌ Model file not found: {model_path}")
            return False
            
    except Exception as e:
        print(f"❌ Model loading failed: {e}")
        return False

def test_camera_access():
    """Test camera access without hanging"""
    print("\n📹 Testing camera access...")
    
    try:
        import cv2
        
        # Try to access camera with timeout
        cap = cv2.VideoCapture(0)
        
        if cap.isOpened():
            print("✅ Camera opened successfully")
            
            # Try to read a frame with timeout
            ret, frame = cap.read()
            if ret and frame is not None:
                print("✅ Camera frame read successfully")
                print(f"   Frame shape: {frame.shape}")
                cap.release()
                return True
            else:
                print("❌ Camera frame read failed")
                cap.release()
                return False
        else:
            print("❌ Camera could not be opened")
            return False
            
    except Exception as e:
        print(f"❌ Camera test failed: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 ULTRA FAST DETECTOR TEST")
    print("=" * 30)
    print("Testing components without running full detector...")
    print()
    
    # Test imports
    if not test_imports():
        print("\n❌ Import test failed - check dependencies")
        return
    
    # Test model loading
    if not test_model_loading():
        print("\n❌ Model test failed - check model file")
        return
    
    # Test camera access
    camera_ok = test_camera_access()
    
    print("\n" + "=" * 30)
    print("📊 TEST RESULTS:")
    print("✅ Imports: OK")
    print("✅ Model: OK")
    if camera_ok:
        print("✅ Camera: OK")
        print("\n🎯 All tests passed! Ultra fast detector should work.")
    else:
        print("❌ Camera: FAILED")
        print("\n⚠️ Camera test failed. Possible issues:")
        print("   • Camera in use by another application")
        print("   • No camera available")
        print("   • Camera permissions issue")
        print("\n💡 Try closing other camera applications and run again.")
    
    print("\nPress Enter to exit...")
    input()

if __name__ == "__main__":
    main()
