#!/usr/bin/env python3
"""
Test script to verify facial recognition registration is working
"""

import requests
import base64
import json

# Test image (a simple 1x1 pixel image as base64)
test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

def test_register_face():
    """Test the register face endpoint"""
    
    # Convert base64 to bytes
    image_bytes = base64.b64decode(test_image_base64)
    
    # Prepare form data
    files = {
        'file': ('test_face.jpg', image_bytes, 'image/jpeg')
    }
    
    data = {
        'user_id': 'test_user_123',
        'user_name': 'Test User'
    }
    
    try:
        print("🧪 Testing facial recognition registration...")
        print(f"📤 Sending request to: http://localhost:8001/register-face")
        print(f"👤 User ID: {data['user_id']}")
        print(f"📝 User Name: {data['user_name']}")
        
        # Send request
        response = requests.post(
            'http://localhost:8001/register-face',
            files=files,
            data=data,
            timeout=30
        )
        
        print(f"📊 Response Status: {response.status_code}")
        print(f"📄 Response Content: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✅ Face registration test PASSED!")
                print(f"🎉 Message: {result.get('message')}")
                return True
            else:
                print("❌ Face registration test FAILED - success=false")
                return False
        else:
            print(f"❌ Face registration test FAILED - HTTP {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Cannot connect to facial recognition service")
        print("💡 Make sure the service is running on http://localhost:8001")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_get_users():
    """Test getting registered users"""
    try:
        print("\n🧪 Testing get users endpoint...")
        response = requests.get('http://localhost:8001/users', timeout=10)
        
        print(f"📊 Response Status: {response.status_code}")
        print(f"📄 Response Content: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Get users test PASSED!")
            print(f"👥 Total users: {result.get('total_count', 0)}")
            return True
        else:
            print(f"❌ Get users test FAILED - HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Facial Recognition API Tests...")
    print("=" * 50)
    
    # Test 1: Get users (should be empty initially)
    test1_passed = test_get_users()
    
    # Test 2: Register face
    test2_passed = test_register_face()
    
    # Test 3: Get users again (should have 1 user now)
    test3_passed = test_get_users()
    
    print("\n" + "=" * 50)
    print("📋 Test Results Summary:")
    print(f"✅ Get users (initial): {'PASSED' if test1_passed else 'FAILED'}")
    print(f"✅ Register face: {'PASSED' if test2_passed else 'FAILED'}")
    print(f"✅ Get users (after): {'PASSED' if test3_passed else 'FAILED'}")
    
    if all([test1_passed, test2_passed, test3_passed]):
        print("\n🎉 All tests PASSED! Facial recognition registration is working!")
    else:
        print("\n⚠️ Some tests FAILED. Check the errors above.")
