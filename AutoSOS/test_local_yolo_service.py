#!/usr/bin/env python3
"""
Test script for the local YOLOv8 service
"""

import requests
import cv2
import numpy as np
import time

def test_service_health():
    """Test if the local service is running"""
    try:
        response = requests.get("http://localhost:8002/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("SUCCESS: Local YOLOv8 Service is running!")
            print(f"   Model loaded: {data.get('model_loaded', False)}")
            print(f"   Model path: {data.get('model_path', 'Unknown')}")
            print(f"   Classes: {data.get('model_classes', 0)}")
            return True
        else:
            print(f"ERROR: Service responded with status: {response.status_code}")
            return False
    except Exception as e:
        print(f"ERROR: Cannot connect to local service: {e}")
        return False

def test_model_info():
    """Test model info endpoint"""
    try:
        response = requests.get("http://localhost:8002/model-info", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("SUCCESS: Model info retrieved!")
            print(f"   Model name: {data.get('model_name', 'Unknown')}")
            print(f"   Model type: {data.get('model_type', 'Unknown')}")
            print(f"   Classes: {data.get('classes', {})}")
            return True
        else:
            print(f"ERROR: Model info failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"ERROR: Error getting model info: {e}")
        return False

def test_detection():
    """Test detection with a sample image"""
    try:
        # Create a simple test image
        test_image = np.zeros((640, 640, 3), dtype=np.uint8)
        cv2.rectangle(test_image, (100, 100), (300, 200), (255, 255, 255), -1)
        
        # Save test image
        cv2.imwrite("test_detection_image.jpg", test_image)
        
        # Test detection
        with open("test_detection_image.jpg", "rb") as f:
            files = {"file": ("test.jpg", f, "image/jpeg")}
            response = requests.post("http://localhost:8002/detect", files=files, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("SUCCESS: Detection test successful!")
            print(f"   Detections: {len(data.get('detections', []))}")
            print(f"   Success: {data.get('success', False)}")
            return True
        else:
            print(f"ERROR: Detection failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"ERROR: Error in detection test: {e}")
        return False

def main():
    """Run all tests"""
    print("Testing Local YOLOv8 Service")
    print("=" * 40)
    
    # Test 1: Service health
    print("\n1. Testing service health...")
    health_ok = test_service_health()
    
    if not health_ok:
        print("\nERROR: Service is not running. Please start it with:")
        print("   python local_yolo_backend_service.py")
        print("   or")
        print("   start_local_yolo_service.bat")
        return
    
    # Test 2: Model info
    print("\n2. Testing model info...")
    model_ok = test_model_info()
    
    # Test 3: Detection
    print("\n3. Testing detection...")
    detection_ok = test_detection()
    
    # Summary
    print("\n" + "=" * 40)
    print("Test Results:")
    print(f"   Health Check: {'PASS' if health_ok else 'FAIL'}")
    print(f"   Model Info: {'PASS' if model_ok else 'FAIL'}")
    print(f"   Detection: {'PASS' if detection_ok else 'FAIL'}")
    
    if health_ok and model_ok and detection_ok:
        print("\nSUCCESS: All tests passed! Local YOLOv8 service is ready!")
        print("   You can now use it in your AutoSOS system.")
    else:
        print("\nWARNING: Some tests failed. Check the service configuration.")

if __name__ == "__main__":
    main()
