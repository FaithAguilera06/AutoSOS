#!/usr/bin/env python3
"""
Test script for Cloudflare tunnel setup
Tests both local service and tunnel connectivity
"""

import requests
import time
import json
import os
from typing import Dict, Any

# Configuration
LOCAL_SERVICE_URL = "http://localhost:8002"
CLOUDFLARE_TUNNEL_URL = os.getenv("CLOUDFLARE_TUNNEL_URL")  # e.g., "https://autosos-yolo.yourdomain.com"

def test_endpoint(url: str, endpoint: str, method: str = "GET", data: Dict = None, files: Dict = None) -> Dict[str, Any]:
    """Test an endpoint and return results"""
    full_url = f"{url}{endpoint}"
    print(f"\n🔍 Testing {method} {full_url}...")
    
    try:
        if method == "GET":
            response = requests.get(full_url, timeout=10)
        elif method == "POST":
            response = requests.post(full_url, data=data, files=files, timeout=30)
        else:
            raise ValueError("Unsupported method")
        
        result = {
            "success": True,
            "status_code": response.status_code,
            "response_time": response.elapsed.total_seconds(),
            "content_type": response.headers.get('content-type', 'unknown'),
            "data": None
        }
        
        # Try to parse JSON response
        try:
            result["data"] = response.json()
        except:
            result["data"] = response.text[:200] + "..." if len(response.text) > 200 else response.text
        
        print(f"✅ Status: {result['status_code']}")
        print(f"⏱️  Response time: {result['response_time']:.3f}s")
        print(f"📄 Content type: {result['content_type']}")
        
        if isinstance(result["data"], dict):
            print(f"📊 Response keys: {list(result['data'].keys())}")
        else:
            print(f"📝 Response preview: {result['data']}")
            
        return result
        
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection Error: Could not connect to {full_url}")
        return {"success": False, "error": "Connection failed"}
    except requests.exceptions.Timeout:
        print(f"⏰ Timeout: Request took too long")
        return {"success": False, "error": "Timeout"}
    except Exception as e:
        print(f"❌ Error: {e}")
        return {"success": False, "error": str(e)}

def create_test_image():
    """Create a simple test image for detection testing"""
    try:
        from PIL import Image
        import io
        
        # Create a simple 200x200 red image
        img = Image.new('RGB', (200, 200), color='red')
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG')
        return img_byte_arr.getvalue()
    except ImportError:
        print("⚠️  PIL not available, skipping image test")
        return None

def test_detection_endpoint(url: str):
    """Test the detection endpoint with a sample image"""
    print(f"\n🎯 Testing detection endpoint at {url}/detect...")
    
    test_image = create_test_image()
    if not test_image:
        print("❌ Cannot create test image, skipping detection test")
        return {"success": False, "error": "No test image"}
    
    files = {'file': ('test_image.jpg', test_image, 'image/jpeg')}
    data = {'confidence': 0.5, 'include_annotated_image': 'false'}
    
    return test_endpoint(url, "/detect", method="POST", data=data, files=files)

def run_comprehensive_test():
    """Run comprehensive tests for both local and tunnel"""
    print("=" * 60)
    print("🧪 Cloudflare Tunnel Setup Test")
    print("=" * 60)
    print()
    
    # Test local service
    print("📍 Testing Local Service (http://localhost:8002)")
    print("-" * 40)
    
    local_results = {}
    local_results["health"] = test_endpoint(LOCAL_SERVICE_URL, "/health")
    local_results["model_info"] = test_endpoint(LOCAL_SERVICE_URL, "/model-info")
    local_results["detection"] = test_detection_endpoint(LOCAL_SERVICE_URL)
    
    # Test tunnel if URL is provided
    if CLOUDFLARE_TUNNEL_URL:
        print(f"\n🌐 Testing Cloudflare Tunnel ({CLOUDFLARE_TUNNEL_URL})")
        print("-" * 40)
        
        tunnel_results = {}
        tunnel_results["health"] = test_endpoint(CLOUDFLARE_TUNNEL_URL, "/health")
        tunnel_results["model_info"] = test_endpoint(CLOUDFLARE_TUNNEL_URL, "/model-info")
        tunnel_results["detection"] = test_detection_endpoint(CLOUDFLARE_TUNNEL_URL)
    else:
        print("\n⚠️  CLOUDFLARE_TUNNEL_URL environment variable not set.")
        print("   Set it to your tunnel URL to test the tunnel.")
        tunnel_results = None
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    print("\n🏠 Local Service Results:")
    for test_name, result in local_results.items():
        status = "✅ PASS" if result.get("success") else "❌ FAIL"
        print(f"   {test_name.capitalize()}: {status}")
        if not result.get("success"):
            print(f"      Error: {result.get('error', 'Unknown error')}")
    
    if tunnel_results:
        print("\n🌐 Tunnel Results:")
        for test_name, result in tunnel_results.items():
            status = "✅ PASS" if result.get("success") else "❌ FAIL"
            print(f"   {test_name.capitalize()}: {status}")
            if not result.get("success"):
                print(f"      Error: {result.get('error', 'Unknown error')}")
    
    # Overall status
    local_success = all(result.get("success", False) for result in local_results.values())
    tunnel_success = all(result.get("success", False) for result in tunnel_results.values()) if tunnel_results else True
    
    print(f"\n🎯 Overall Status:")
    print(f"   Local Service: {'✅ WORKING' if local_success else '❌ ISSUES'}")
    if tunnel_results:
        print(f"   Cloudflare Tunnel: {'✅ WORKING' if tunnel_success else '❌ ISSUES'}")
    
    if local_success and (tunnel_success or not tunnel_results):
        print("\n🎉 All tests passed! Your setup is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")
        print("\n🔧 Troubleshooting tips:")
        print("   1. Make sure your local YOLO service is running")
        print("   2. Check your Cloudflare tunnel configuration")
        print("   3. Verify your domain DNS settings")
        print("   4. Check firewall settings")

if __name__ == "__main__":
    try:
        run_comprehensive_test()
    except KeyboardInterrupt:
        print("\n\n⏹️  Test interrupted by user.")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
    
    print("\n" + "=" * 60)
    input("Press Enter to exit...")
