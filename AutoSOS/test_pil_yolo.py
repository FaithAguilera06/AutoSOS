#!/usr/bin/env python3
"""
Test script for YOLOv8 service with PIL approach
"""

import requests
from PIL import Image
import io

def test_yolo_service():
    """Test the YOLOv8 service with PIL approach"""
    
    # Create a simple test image
    img = Image.new('RGB', (640, 480), color='white')
    
    # Save to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    
    # Test the service
    url = "https://autosos-yolo.onrender.com/predict"
    
    try:
        files = {'file': ('test.jpg', img_bytes, 'image/jpeg')}
        response = requests.post(url, files=files, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ YOLOv8 service is working with PIL approach!")
        else:
            print("❌ YOLOv8 service failed")
            
    except Exception as e:
        print(f"❌ Error testing YOLOv8 service: {e}")

if __name__ == "__main__":
    test_yolo_service()
