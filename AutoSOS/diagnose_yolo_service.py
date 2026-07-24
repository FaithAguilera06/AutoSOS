#!/usr/bin/env python3
"""
Quick diagnostic script for YOLOv8 service issues
"""

import requests
import json
import time
import cv2
import base64
import numpy as np
from typing import Dict, Any

class YOLOServiceDiagnostic:
    def __init__(self, service_url: str = "https://autosos-yolo.onrender.com"):
        self.service_url = service_url
        
    def test_service_health(self) -> Dict[str, Any]:
        """Test service health endpoint"""
        print("Testing service health...")
        
        try:
            response = requests.get(f"{self.service_url}/health", timeout=15)
            
            result = {
                "status_code": response.status_code,
                "response_time": response.elapsed.total_seconds(),
                "accessible": True
            }
            
            if response.status_code == 200:
                health_data = response.json()
                result.update(health_data)
                print(f"SUCCESS: Service is healthy: {health_data.get('status', 'unknown')}")
            else:
                print(f"WARNING: Service responded with status: {response.status_code}")
                result["response_text"] = response.text
                
        except requests.exceptions.Timeout:
            result = {"accessible": False, "error": "Timeout - service may be sleeping"}
            print("TIMEOUT: Service timeout - may be sleeping (Render free tier)")
            
        except requests.exceptions.ConnectionError:
            result = {"accessible": False, "error": "Connection failed"}
            print("ERROR: Cannot connect to service")
            
        except Exception as e:
            result = {"accessible": False, "error": str(e)}
            print(f"ERROR: {e}")
            
        return result
    
    def test_model_info(self) -> Dict[str, Any]:
        """Test model info endpoint"""
        print("\nTesting model info...")
        
        try:
            response = requests.get(f"{self.service_url}/model-info", timeout=15)
            
            if response.status_code == 200:
                model_data = response.json()
                print(f"SUCCESS: Model info retrieved")
                print(f"   Model: {model_data.get('model_name', 'Unknown')}")
                print(f"   Classes: {len(model_data.get('classes', []))}")
                return model_data
            else:
                print(f"ERROR: Model info failed: {response.status_code}")
                return {"error": f"Status {response.status_code}"}
                
        except Exception as e:
            print(f"ERROR: Model info error: {e}")
            return {"error": str(e)}
    
    def test_classes_endpoint(self) -> Dict[str, Any]:
        """Test classes endpoint"""
        print("\nTesting classes endpoint...")
        
        try:
            response = requests.get(f"{self.service_url}/classes", timeout=15)
            
            if response.status_code == 200:
                classes_data = response.json()
                print(f"SUCCESS: Classes info retrieved")
                print(f"   Total classes: {classes_data.get('total_classes', 0)}")
                
                classes = classes_data.get('classes', {})
                for class_id, class_name in classes.items():
                    print(f"   {class_id}: {class_name}")
                    
                return classes_data
            else:
                print(f"ERROR: Classes endpoint failed: {response.status_code}")
                return {"error": f"Status {response.status_code}"}
                
        except Exception as e:
            print(f"ERROR: Classes endpoint error: {e}")
            return {"error": str(e)}
    
    def create_test_image(self) -> np.ndarray:
        """Create a simple test image"""
        # Create a 640x480 test image with some shapes
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        
        # Add some colored rectangles and circles
        cv2.rectangle(img, (50, 50), (200, 150), (255, 0, 0), -1)  # Blue rectangle
        cv2.circle(img, (400, 200), 50, (0, 255, 0), -1)  # Green circle
        cv2.rectangle(img, (300, 300), (500, 400), (0, 0, 255), -1)  # Red rectangle
        
        # Add some text
        cv2.putText(img, "YOLOv8 Test Image", (200, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        return img
    
    def test_detection_endpoint(self) -> Dict[str, Any]:
        """Test detection with a simple image"""
        print("\nTesting detection endpoint...")
        
        try:
            # Create test image
            test_image = self.create_test_image()
            
            # Encode image to base64
            _, buffer = cv2.imencode('.jpg', test_image)
            image_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Prepare request
            payload = {
                "image_data": image_base64,
                "confidence": 0.1,  # Low confidence for testing
                "include_annotated_image": False
            }
            
            print("   Sending test image to detection endpoint...")
            start_time = time.time()
            
            response = requests.post(
                f"{self.service_url}/detect-base64",
                json=payload,
                timeout=30
            )
            
            detection_time = time.time() - start_time
            
            if response.status_code == 200:
                result_data = response.json()
                detections = result_data.get('detections', [])
                
                print(f"SUCCESS: Detection successful!")
                print(f"   Response time: {detection_time:.2f}s")
                print(f"   Detections found: {len(detections)}")
                
                for i, detection in enumerate(detections):
                    class_name = detection.get('class_display_name', 'Unknown')
                    confidence = detection.get('confidence', 0)
                    print(f"   Detection {i+1}: {class_name} ({confidence:.2f})")
                
                return {
                    "success": True,
                    "detection_time": detection_time,
                    "detections": detections,
                    "detection_count": len(detections)
                }
            else:
                print(f"ERROR: Detection failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "response": response.text
                }
                
        except Exception as e:
            print(f"ERROR: Detection test error: {e}")
            return {"success": False, "error": str(e)}
    
    def run_full_diagnostic(self) -> Dict[str, Any]:
        """Run complete diagnostic"""
        print("="*60)
        print("YOLOv8 SERVICE DIAGNOSTIC")
        print("="*60)
        print(f"Service URL: {self.service_url}")
        print()
        
        results = {
            "service_url": self.service_url,
            "timestamp": time.time(),
            "health": {},
            "model_info": {},
            "classes": {},
            "detection_test": {}
        }
        
        # Test health
        results["health"] = self.test_service_health()
        
        # If service is accessible, test other endpoints
        if results["health"].get("accessible", False):
            results["model_info"] = self.test_model_info()
            results["classes"] = self.test_classes_endpoint()
            results["detection_test"] = self.test_detection_endpoint()
        else:
            print("\nWARNING: Service not accessible, skipping other tests")
        
        # Save results
        with open("yolo_service_diagnostic.json", "w") as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\nDiagnostic results saved to: yolo_service_diagnostic.json")
        
        return results
    
    def print_summary(self, results: Dict[str, Any]):
        """Print diagnostic summary"""
        print("\n" + "="*60)
        print("DIAGNOSTIC SUMMARY")
        print("="*60)
        
        health = results.get("health", {})
        if health.get("accessible", False):
            print("SUCCESS: Service is accessible")
            print(f"   Status: {health.get('status', 'Unknown')}")
            print(f"   Model loaded: {health.get('model_loaded', 'Unknown')}")
            print(f"   OpenCV available: {health.get('opencv_available', 'Unknown')}")
        else:
            print("ERROR: Service is not accessible")
            print(f"   Error: {health.get('error', 'Unknown error')}")
        
        detection_test = results.get("detection_test", {})
        if detection_test.get("success", False):
            print("SUCCESS: Detection endpoint working")
            print(f"   Detection time: {detection_test.get('detection_time', 0):.2f}s")
            print(f"   Detections found: {detection_test.get('detection_count', 0)}")
        else:
            print("ERROR: Detection endpoint failed")
            if "error" in detection_test:
                print(f"   Error: {detection_test['error']}")
        
        print("\n" + "="*60)

def main():
    """Main diagnostic function"""
    diagnostic = YOLOServiceDiagnostic()
    results = diagnostic.run_full_diagnostic()
    diagnostic.print_summary(results)

if __name__ == "__main__":
    main()
