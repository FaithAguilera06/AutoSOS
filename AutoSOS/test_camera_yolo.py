#!/usr/bin/env python3
"""
Simple test script to check camera and YOLOv8 service
"""

import cv2
import requests
import time

def test_camera():
    """Test if camera works"""
    print("Testing camera...")
    
    # Try to open camera
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("ERROR: Could not open camera")
        return False
    
    # Try to read a frame
    ret, frame = cap.read()
    
    if not ret:
        print("ERROR: Could not read frame from camera")
        cap.release()
        return False
    
    print(f"SUCCESS: Camera working! Frame size: {frame.shape}")
    
    # Test different resolutions
    resolutions = [(640, 480), (1280, 720), (1920, 1080)]
    
    for width, height in resolutions:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        
        actual_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        print(f"Resolution {width}x{height}: Actual {actual_width}x{actual_height}")
    
    cap.release()
    return True

def test_yolo_service():
    """Test YOLOv8 service connection"""
    print("\nTesting YOLOv8 service...")
    
    service_url = "https://autosos-yolo.onrender.com"
    
    try:
        # Test health endpoint
        response = requests.get(f"{service_url}/health", timeout=10)
        
        if response.status_code == 200:
            health_data = response.json()
            print("SUCCESS: YOLOv8 Service Connected!")
            print(f"Service Status: {health_data.get('status', 'unknown')}")
            print(f"Model Loaded: {health_data.get('model_loaded', 'unknown')}")
            print(f"Model Name: {health_data.get('model_name', 'unknown')}")
            print(f"OpenCV Available: {health_data.get('opencv_available', 'unknown')}")
            return True
        else:
            print(f"ERROR: Service responded with status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"ERROR: Failed to connect to YOLOv8 service: {e}")
        return False

def test_model_info():
    """Test model info endpoint"""
    print("\nTesting model info...")
    
    service_url = "https://autosos-yolo.onrender.com"
    
    try:
        response = requests.get(f"{service_url}/model-info", timeout=10)
        
        if response.status_code == 200:
            model_data = response.json()
            print("SUCCESS: Model info retrieved!")
            print(f"Model Name: {model_data.get('model_name', 'unknown')}")
            print(f"Model Type: {model_data.get('model_type', 'unknown')}")
            print(f"Input Size: {model_data.get('input_size', 'unknown')}")
            print(f"Classes: {len(model_data.get('classes', []))} classes")
            return True
        else:
            print(f"ERROR: Model info failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"ERROR: Failed to get model info: {e}")
        return False

def main():
    """Run all tests"""
    print("=== Camera and YOLOv8 Service Test ===")
    print()
    
    # Test camera
    camera_ok = test_camera()
    
    # Test YOLOv8 service
    yolo_ok = test_yolo_service()
    
    # Test model info
    model_ok = test_model_info()
    
    print("\n=== Test Results ===")
    print(f"Camera: {'PASS' if camera_ok else 'FAIL'}")
    print(f"YOLOv8 Service: {'PASS' if yolo_ok else 'FAIL'}")
    print(f"Model Info: {'PASS' if model_ok else 'FAIL'}")
    
    if camera_ok and yolo_ok:
        print("\nSUCCESS: Both camera and YOLOv8 service are working!")
        print("You can now run the full test with: python yolov8_motorcycle_test.py")
    else:
        print("\nISSUES FOUND:")
        if not camera_ok:
            print("- Camera is not working properly")
        if not yolo_ok:
            print("- YOLOv8 service is not accessible")

if __name__ == "__main__":
    main()
