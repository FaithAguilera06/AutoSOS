#!/usr/bin/env python3
"""
Test script to verify LocalXpose setup
"""

import requests
import json
import time
import sys

def test_local_service():
    """Test the local YOLOv8 service"""
    print("🧪 Testing Local YOLOv8 Service")
    print("=" * 40)
    
    try:
        # Test health endpoint
        response = requests.get("http://localhost:8002/health", timeout=5)
        if response.status_code == 200:
            print("✅ Local service is running")
            health_data = response.json()
            print(f"   Model loaded: {health_data.get('model_loaded', False)}")
            print(f"   Model path: {health_data.get('model_path', 'Unknown')}")
            return True
        else:
            print(f"❌ Local service error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Local service not accessible: {e}")
        return False

def test_public_url(public_url):
    """Test the LocalXpose public URL"""
    print(f"\n🌐 Testing Public URL: {public_url}")
    print("=" * 50)
    
    try:
        # Test health endpoint through public URL
        response = requests.get(f"{public_url}/health", timeout=10)
        if response.status_code == 200:
            print("✅ Public URL is working!")
            health_data = response.json()
            print(f"   Status: {health_data.get('status', 'Unknown')}")
            print(f"   Model loaded: {health_data.get('model_loaded', False)}")
            return True
        else:
            print(f"❌ Public URL error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Public URL not accessible: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 LocalXpose Setup Test")
    print("=" * 30)
    
    # Test local service first
    if not test_local_service():
        print("\n❌ Local service is not running!")
        print("💡 Please start the service first:")
        print("   python local_yolo_backend_service.py")
        return
    
    # Ask for public URL
    print("\n📝 Please enter your LocalXpose public URL:")
    print("   (e.g., https://abc123.loca.lt)")
    public_url = input("URL: ").strip()
    
    if not public_url:
        print("❌ No URL provided")
        return
    
    if not public_url.startswith('http'):
        public_url = 'https://' + public_url
    
    # Test public URL
    if test_public_url(public_url):
        print(f"\n🎉 Setup Complete!")
        print(f"📍 Local URL: http://localhost:8002")
        print(f"🌐 Public URL: {public_url}")
        print(f"\n💡 Update your frontend to use: {public_url}")
    else:
        print(f"\n❌ Public URL test failed")
        print("💡 Make sure your LocalXpose tunnel is running")

if __name__ == "__main__":
    main()
