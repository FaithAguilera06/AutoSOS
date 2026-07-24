#!/usr/bin/env python3
"""
Test script for face recognition functionality
"""

import requests
import json
import base64
import os

# Test configuration
API_BASE_URL = "http://localhost:8001"

def test_health():
    """Test if the service is running"""
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Service is running")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"❌ Service returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Service is not running: {e}")
        return False

def test_face_registration():
    """Test face registration"""
    try:
        # Create a simple test image (1x1 pixel)
        test_image_data = base64.b64encode(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82').decode()
        
        # Test registration
        test_user_id = "test_user_123"
        test_user_name = "Test User"
        
        # Create form data
        files = {
            'file': ('test_face.jpg', base64.b64decode(test_image_data), 'image/jpeg')
        }
        data = {
            'user_id': test_user_id,
            'user_name': test_user_name
        }
        
        response = requests.post(f"{API_BASE_URL}/register-face", files=files, data=data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Face registration test: {result}")
            return True
        else:
            print(f"❌ Face registration failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Face registration test failed: {e}")
        return False

def test_face_check():
    """Test face registration check"""
    try:
        test_user_id = "test_user_123"
        response = requests.get(f"{API_BASE_URL}/check-face-registration/{test_user_id}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Face check test: {result}")
            return True
        else:
            print(f"❌ Face check failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Face check test failed: {e}")
        return False

def test_face_statistics():
    """Test face statistics endpoint"""
    try:
        response = requests.get(f"{API_BASE_URL}/face-statistics")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Face statistics test: {result}")
            return True
        else:
            print(f"❌ Face statistics failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Face statistics test failed: {e}")
        return False

def main():
    print("🧪 Testing Face Recognition Service")
    print("=" * 50)
    
    # Test 1: Health check
    print("\n1. Testing service health...")
    if not test_health():
        print("❌ Service is not running. Please start the FaceNet service first.")
        return
    
    # Test 2: Face registration
    print("\n2. Testing face registration...")
    test_face_registration()
    
    # Test 3: Face check
    print("\n3. Testing face registration check...")
    test_face_check()
    
    # Test 4: Face statistics
    print("\n4. Testing face statistics...")
    test_face_statistics()
    
    print("\n" + "=" * 50)
    print("🎯 Test completed!")

if __name__ == "__main__":
    main()
