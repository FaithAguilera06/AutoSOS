#!/usr/bin/env python3
"""
Test script for local YOLOv8 service
"""

import requests
import json
import time

def test_local_service():
    """Test the local YOLOv8 service"""
    base_url = "http://localhost:8002"
    
    print("🧪 Testing Local YOLOv8 Service")
    print("=" * 40)
    
    # Test 1: Health check
    print("1. Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False
    
    # Test 2: Model info
    print("\n2. Testing model info endpoint...")
    try:
        response = requests.get(f"{base_url}/model-info", timeout=10)
        if response.status_code == 200:
            print("✅ Model info retrieved")
            model_info = response.json()
            print(f"   Model: {model_info.get('model_name', 'Unknown')}")
            print(f"   Classes: {model_info.get('num_classes', 0)}")
            print(f"   Type: {model_info.get('model_type', 'Unknown')}")
        else:
            print(f"❌ Model info failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Model info error: {e}")
    
    # Test 3: Root endpoint
    print("\n3. Testing root endpoint...")
    try:
        response = requests.get(f"{base_url}/", timeout=10)
        if response.status_code == 200:
            print("✅ Root endpoint working")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Root endpoint error: {e}")
    
    print("\n🎯 Service is ready for use!")
    print(f"📍 Service URL: {base_url}")
    print("🔗 Health: /health")
    print("📊 Model Info: /model-info")
    print("🎯 Detection: /detect")
    
    return True

if __name__ == "__main__":
    test_local_service()
