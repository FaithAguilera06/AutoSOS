#!/usr/bin/env python3
"""
Test script for Hugging Face YOLOv8 models
Tests different models and compares performance
"""

import requests
import time
import json
import os
from typing import Dict, Any, List
import base64
from PIL import Image
import io

# Configuration
SERVICE_URL = "http://localhost:8002"

def create_test_image() -> bytes:
    """Create a test image for detection"""
    # Create a simple 400x400 image with some shapes
    img = Image.new('RGB', (400, 400), color='white')
    
    # Add some colored rectangles to simulate objects
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    
    # Draw some rectangles
    draw.rectangle([50, 50, 150, 150], fill='red', outline='black', width=2)
    draw.rectangle([200, 100, 300, 200], fill='blue', outline='black', width=2)
    draw.rectangle([100, 250, 200, 350], fill='green', outline='black', width=2)
    
    # Convert to bytes
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    return img_byte_arr.getvalue()

def test_endpoint(url: str, endpoint: str, method: str = "GET", data: Dict = None, files: Dict = None) -> Dict[str, Any]:
    """Test an endpoint and return results"""
    full_url = f"{url}{endpoint}"
    print(f"\n🔍 Testing {method} {full_url}...")
    
    try:
        if method == "GET":
            response = requests.get(full_url, timeout=30)
        elif method == "POST":
            response = requests.post(full_url, data=data, files=files, timeout=60)
        else:
            raise ValueError("Unsupported method")
        
        result = {
            "success": True,
            "status_code": response.status_code,
            "response_time": response.elapsed.total_seconds(),
            "data": None
        }
        
        try:
            result["data"] = response.json()
        except:
            result["data"] = response.text[:200] + "..." if len(response.text) > 200 else response.text
        
        print(f"✅ Status: {result['status_code']}")
        print(f"⏱️  Response time: {result['response_time']:.3f}s")
        
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

def test_detection_with_image(image_data: bytes, confidence: float = 0.5) -> Dict[str, Any]:
    """Test detection endpoint with image"""
    files = {'file': ('test_image.jpg', image_data, 'image/jpeg')}
    data = {'confidence': confidence, 'include_annotated_image': 'false'}
    
    return test_endpoint(SERVICE_URL, "/detect", method="POST", data=data, files=files)

def test_model_switching():
    """Test switching between different models"""
    print("\n🔄 Testing Model Switching")
    print("-" * 40)
    
    # Test available models endpoint
    available_models = test_endpoint(SERVICE_URL, "/available-models")
    
    if not available_models.get("success"):
        print("❌ Failed to get available models")
        return
    
    models_data = available_models["data"]
    if "recommended_models" in models_data:
        recommended = models_data["recommended_models"]
        print(f"📋 Recommended models: {recommended}")
        
        # Test switching to first recommended model
        if recommended:
            test_model = recommended[0]
            print(f"\n🔄 Switching to model: {test_model}")
            
            switch_data = {"model_name": test_model}
            switch_result = test_endpoint(SERVICE_URL, "/switch-model", method="POST", data=switch_data)
            
            if switch_result.get("success"):
                print(f"✅ Successfully switched to {test_model}")
                
                # Test detection with new model
                test_image = create_test_image()
                detection_result = test_detection_with_image(test_image)
                
                if detection_result.get("success"):
                    detections = detection_result["data"].get("detections", [])
                    print(f"🎯 Detections with {test_model}: {len(detections)}")
                else:
                    print(f"❌ Detection failed with {test_model}")
            else:
                print(f"❌ Failed to switch to {test_model}")

def run_comprehensive_test():
    """Run comprehensive tests"""
    print("=" * 60)
    print("🧪 Hugging Face YOLOv8 Service Test")
    print("=" * 60)
    print()
    
    # Test 1: Health check
    print("📍 Testing Service Health")
    print("-" * 40)
    health_result = test_endpoint(SERVICE_URL, "/health")
    
    if not health_result.get("success"):
        print("❌ Service is not running. Please start the service first.")
        print("Run: start_huggingface_yolo_service.bat")
        return
    
    # Test 2: Model info
    print("\n📊 Testing Model Information")
    print("-" * 40)
    model_info = test_endpoint(SERVICE_URL, "/model-info")
    
    if model_info.get("success"):
        info_data = model_info["data"]
        print(f"🤖 Model: {info_data.get('model_name', 'Unknown')}")
        print(f"🔧 Type: {info_data.get('model_type', 'Unknown')}")
        print(f"💻 Device: {info_data.get('device', 'Unknown')}")
        print(f"📋 Classes: {info_data.get('num_classes', 0)}")
    
    # Test 3: Detection with test image
    print("\n🎯 Testing Object Detection")
    print("-" * 40)
    test_image = create_test_image()
    detection_result = test_detection_with_image(test_image)
    
    if detection_result.get("success"):
        detections = detection_result["data"].get("detections", [])
        detection_time = detection_result["data"].get("detection_time", 0)
        print(f"🎯 Detections found: {len(detections)}")
        print(f"⏱️  Detection time: {detection_time:.3f}s")
        
        for i, detection in enumerate(detections):
            print(f"   Detection {i+1}: {detection.get('display_name', 'Unknown')} "
                  f"({detection.get('confidence', 0):.3f} confidence)")
    else:
        print("❌ Detection test failed")
    
    # Test 4: Model switching
    test_model_switching()
    
    # Test 5: Available models
    print("\n📋 Testing Available Models")
    print("-" * 40)
    available_models = test_endpoint(SERVICE_URL, "/available-models")
    
    if available_models.get("success"):
        models_data = available_models["data"]
        if "available_models" in models_data:
            models = models_data["available_models"]
            print(f"📊 Found {len(models)} available models")
            
            # Show top 5 models by downloads
            top_models = sorted(models, key=lambda x: x.get("downloads", 0), reverse=True)[:5]
            print("🏆 Top 5 models by downloads:")
            for i, model in enumerate(top_models, 1):
                print(f"   {i}. {model['id']} ({model.get('downloads', 0):,} downloads)")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    tests = [
        ("Health Check", health_result),
        ("Model Info", model_info),
        ("Object Detection", detection_result),
        ("Available Models", available_models)
    ]
    
    passed = 0
    for test_name, result in tests:
        status = "✅ PASS" if result.get("success") else "❌ FAIL"
        print(f"   {test_name}: {status}")
        if result.get("success"):
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("\n🎉 All tests passed! Your Hugging Face YOLOv8 service is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")
        print("\n🔧 Troubleshooting tips:")
        print("   1. Make sure the service is running: start_huggingface_yolo_service.bat")
        print("   2. Check if all dependencies are installed: pip install -r huggingface_requirements.txt")
        print("   3. Verify your internet connection (needed for downloading models)")
        print("   4. Check the service logs for detailed error messages")

if __name__ == "__main__":
    try:
        run_comprehensive_test()
    except KeyboardInterrupt:
        print("\n\n⏹️  Test interrupted by user.")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
    
    print("\n" + "=" * 60)
    input("Press Enter to exit...")
