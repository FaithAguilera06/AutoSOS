#!/usr/bin/env python3
"""
Test script to verify YOLOv8 cloud service connection
"""

import requests
import json
import base64
from PIL import Image
import io

def test_yolo_health():
    """Test YOLOv8 service health endpoint"""
    try:
        print("🔍 Testing YOLOv8 service health...")
        response = requests.get("https://autosos-yolo.onrender.com/health", timeout=10)
        print(f"✅ Health check status: {response.status_code}")
        print(f"📄 Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_yolo_detection():
    """Test YOLOv8 detection with a simple image"""
    try:
        print("\n🧪 Testing YOLOv8 detection...")
        
        # Create a simple test image (1x1 pixel)
        img = Image.new('RGB', (100, 100), color='red')
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        img_data = buffer.getvalue()
        
        # Encode to base64
        img_base64 = base64.b64encode(img_data).decode('utf-8')
        
        # Test detection
        payload = {
            "image_data": img_base64,
            "confidence": 0.5,
            "include_annotated_image": False
        }
        
        response = requests.post(
            "https://autosos-yolo.onrender.com/detect-base64",
            json=payload,
            timeout=30
        )
        
        print(f"✅ Detection test status: {response.status_code}")
        print(f"📄 Response: {response.text}")
        return response.status_code == 200
        
    except Exception as e:
        print(f"❌ Detection test failed: {e}")
        return False

def main():
    print("🚀 Testing AutoSOS YOLOv8 Cloud Service")
    print("=" * 50)
    
    # Test health
    health_ok = test_yolo_health()
    
    if health_ok:
        # Test detection
        detection_ok = test_yolo_detection()
        
        if detection_ok:
            print("\n🎉 All tests passed! YOLOv8 service is working correctly.")
        else:
            print("\n⚠️ Health check passed but detection failed.")
    else:
        print("\n❌ YOLOv8 service is not available.")
        print("💡 You may need to deploy the service to Render first.")

if __name__ == "__main__":
    main()

