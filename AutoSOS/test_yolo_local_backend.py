#!/usr/bin/env python3
"""
Comprehensive YOLOv8 Local Backend Test
Tests the YOLOv8 model locally to diagnose detection issues
"""

import os
import sys
import time
import cv2
import numpy as np
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class YOLOv8LocalTester:
    def __init__(self):
        self.model = None
        self.model_path = None
        self.test_results = {}
        
        # Class names for motorcycle issues (from cloud service)
        self.class_names = {
            0: "broken_headlights_tail_lights",
            1: "broken_side_mirror", 
            2: "flat_tire",
            3: "oil_leak"
        }
        
        # Class display names
        self.class_display_names = {
            0: "Broken Headlights/Tail Lights",
            1: "Broken Side Mirror",
            2: "Flat Tire", 
            3: "Oil Leak"
        }
        
        # Class colors for visualization
        self.class_colors = {
            0: (255, 255, 0),    # Yellow
            1: (255, 165, 0),    # Orange
            2: (0, 0, 255),      # Red
            3: (128, 0, 128)     # Purple
        }
        
    def check_dependencies(self) -> Dict[str, bool]:
        """Check if all required dependencies are available"""
        logger.info("Checking dependencies...")
        
        dependencies = {}
        
        # Check OpenCV
        try:
            import cv2
            dependencies['opencv'] = True
            logger.info(f"✅ OpenCV version: {cv2.__version__}")
        except ImportError as e:
            dependencies['opencv'] = False
            logger.error(f"❌ OpenCV not available: {e}")
        
        # Check Ultralytics
        try:
            from ultralytics import YOLO
            dependencies['ultralytics'] = True
            logger.info("✅ Ultralytics YOLO available")
        except ImportError as e:
            dependencies['ultralytics'] = False
            logger.error(f"❌ Ultralytics not available: {e}")
        
        # Check NumPy
        try:
            import numpy as np
            dependencies['numpy'] = True
            logger.info(f"✅ NumPy version: {np.__version__}")
        except ImportError as e:
            dependencies['numpy'] = False
            logger.error(f"❌ NumPy not available: {e}")
        
        # Check PIL
        try:
            from PIL import Image
            dependencies['pil'] = True
            logger.info("✅ PIL available")
        except ImportError as e:
            dependencies['pil'] = False
            logger.error(f"❌ PIL not available: {e}")
        
        return dependencies
    
    def find_yolo_models(self) -> List[str]:
        """Find available YOLOv8 models in the project"""
        logger.info("Searching for YOLOv8 models...")
        
        model_paths = []
        search_dirs = [
            "models",
            "model_cache", 
            "yolo-motorcycle-diagnostic-training",
            "cloud-deployment/yolo-service",
            "."
        ]
        
        model_extensions = [".pt", ".onnx", ".engine"]
        
        for search_dir in search_dirs:
            if os.path.exists(search_dir):
                for root, dirs, files in os.walk(search_dir):
                    for file in files:
                        if any(file.endswith(ext) for ext in model_extensions):
                            full_path = os.path.join(root, file)
                            model_paths.append(full_path)
                            logger.info(f"Found model: {full_path}")
        
        return model_paths
    
    def load_yolo_model(self, model_path: Optional[str] = None) -> bool:
        """Load YOLOv8 model"""
        try:
            from ultralytics import YOLO
            
            if model_path and os.path.exists(model_path):
                logger.info(f"Loading custom model: {model_path}")
                self.model = YOLO(model_path)
                self.model_path = model_path
            else:
                # Try to find a custom model
                models = self.find_yolo_models()
                if models:
                    logger.info(f"Loading first found model: {models[0]}")
                    self.model = YOLO(models[0])
                    self.model_path = models[0]
                else:
                    # Fallback to pretrained model
                    logger.info("Loading YOLOv8 nano pretrained model...")
                    self.model = YOLO("yolov8n.pt")
                    self.model_path = "yolov8n.pt"
            
            logger.info("✅ YOLOv8 model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load YOLOv8 model: {e}")
            return False
    
    def test_model_info(self) -> Dict[str, Any]:
        """Get detailed model information"""
        if not self.model:
            return {"error": "Model not loaded"}
        
        try:
            info = {
                "model_path": self.model_path,
                "model_type": str(type(self.model)),
                "model_loaded": True
            }
            
            # Try to get model names/classes
            if hasattr(self.model, 'names'):
                info['class_names'] = self.model.names
                info['num_classes'] = len(self.model.names)
            
            # Try to get model info
            if hasattr(self.model, 'info'):
                try:
                    self.model.info()
                    info['model_info_available'] = True
                except:
                    info['model_info_available'] = False
            
            logger.info(f"Model info: {info}")
            return info
            
        except Exception as e:
            logger.error(f"Error getting model info: {e}")
            return {"error": str(e)}
    
    def create_test_images(self) -> List[np.ndarray]:
        """Create test images for detection"""
        logger.info("Creating test images...")
        
        test_images = []
        
        # Create simple colored rectangles as test images
        colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0)]
        
        for i, color in enumerate(colors):
            # Create 640x640 image
            img = np.zeros((640, 640, 3), dtype=np.uint8)
            
            # Add colored rectangle
            cv2.rectangle(img, (100, 100), (540, 540), color, -1)
            
            # Add some noise/texture
            noise = np.random.randint(0, 50, (640, 640, 3), dtype=np.uint8)
            img = cv2.add(img, noise)
            
            test_images.append(img)
            
            # Save test image
            cv2.imwrite(f"test_image_{i}.jpg", img)
        
        logger.info(f"Created {len(test_images)} test images")
        return test_images
    
    def test_detection_on_images(self, images: List[np.ndarray]) -> List[Dict[str, Any]]:
        """Test detection on provided images"""
        if not self.model:
            logger.error("Model not loaded")
            return []
        
        results = []
        
        for i, image in enumerate(images):
            logger.info(f"Testing detection on image {i+1}/{len(images)}")
            
            try:
                # Run detection
                start_time = time.time()
                detections = self.model(image, conf=0.1, verbose=False)  # Low confidence for testing
                detection_time = time.time() - start_time
                
                # Process results
                detection_data = {
                    "image_index": i,
                    "detection_time": detection_time,
                    "raw_results": len(detections),
                    "detections": []
                }
                
                for result in detections:
                    if hasattr(result, 'boxes') and result.boxes is not None:
                        boxes = result.boxes
                        for box in boxes:
                            # Get box data
                            if hasattr(box, 'xyxy'):
                                bbox = box.xyxy[0].cpu().numpy().tolist()
                                conf = box.conf[0].cpu().numpy().item()
                                cls = int(box.cls[0].cpu().numpy().item())
                                
                                detection_data["detections"].append({
                                    "bbox": bbox,
                                    "confidence": conf,
                                    "class": cls,
                                    "class_name": self.model.names.get(cls, f"class_{cls}") if hasattr(self.model, 'names') else f"class_{cls}"
                                })
                
                results.append(detection_data)
                logger.info(f"Image {i+1}: {len(detection_data['detections'])} detections in {detection_time:.3f}s")
                
            except Exception as e:
                logger.error(f"Error detecting on image {i+1}: {e}")
                results.append({
                    "image_index": i,
                    "error": str(e)
                })
        
        return results
    
    def test_camera_detection(self, duration: int = 10) -> Dict[str, Any]:
        """Test real-time camera detection"""
        logger.info(f"Testing camera detection for {duration} seconds...")
        
        if not self.model:
            logger.error("Model not loaded")
            return {"error": "Model not loaded"}
        
        # Try to open camera
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            logger.error("Could not open camera")
            return {"error": "Could not open camera"}
        
        # Set camera properties
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        start_time = time.time()
        frame_count = 0
        detection_count = 0
        total_detection_time = 0
        
        try:
            while time.time() - start_time < duration:
                ret, frame = cap.read()
                if not ret:
                    logger.error("Could not read frame")
                    break
                
                frame_count += 1
                
                # Run detection every 5th frame to avoid overload
                if frame_count % 5 == 0:
                    try:
                        det_start = time.time()
                        results = self.model(frame, conf=0.3, verbose=False)
                        det_time = time.time() - det_start
                        
                        total_detection_time += det_time
                        detection_count += 1
                        
                        # Count detections
                        num_detections = 0
                        for result in results:
                            if hasattr(result, 'boxes') and result.boxes is not None:
                                num_detections += len(result.boxes)
                        
                        if num_detections > 0:
                            logger.info(f"Frame {frame_count}: {num_detections} detections")
                        
                    except Exception as e:
                        logger.error(f"Detection error on frame {frame_count}: {e}")
                
                # Show frame (optional)
                cv2.imshow('YOLOv8 Test', frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
        
        except KeyboardInterrupt:
            logger.info("Camera test interrupted by user")
        
        finally:
            cap.release()
            cv2.destroyAllWindows()
        
        avg_detection_time = total_detection_time / detection_count if detection_count > 0 else 0
        fps = frame_count / (time.time() - start_time)
        
        result = {
            "duration": time.time() - start_time,
            "total_frames": frame_count,
            "detection_runs": detection_count,
            "average_detection_time": avg_detection_time,
            "fps": fps
        }
        
        logger.info(f"Camera test results: {result}")
        return result
    
    def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run comprehensive YOLOv8 backend test"""
        logger.info("Starting comprehensive YOLOv8 backend test...")
        
        test_results = {
            "timestamp": time.time(),
            "dependencies": {},
            "model_info": {},
            "test_images": {},
            "camera_test": {}
        }
        
        # 1. Check dependencies
        test_results["dependencies"] = self.check_dependencies()
        
        # 2. Load model
        if test_results["dependencies"].get("ultralytics", False):
            model_loaded = self.load_yolo_model()
            if model_loaded:
                test_results["model_info"] = self.test_model_info()
                
                # 3. Test on synthetic images
                test_images = self.create_test_images()
                test_results["test_images"] = self.test_detection_on_images(test_images)
                
                # 4. Test camera (if available)
                if test_results["dependencies"].get("opencv", False):
                    test_results["camera_test"] = self.test_camera_detection(duration=5)
            else:
                test_results["model_info"] = {"error": "Failed to load model"}
        
        # Save results
        with open("yolo_test_results.json", "w") as f:
            json.dump(test_results, f, indent=2, default=str)
        
        logger.info("Test completed. Results saved to yolo_test_results.json")
        return test_results
    
    def print_summary(self, results: Dict[str, Any]):
        """Print test summary"""
        print("\n" + "="*60)
        print("YOLOv8 LOCAL BACKEND TEST SUMMARY")
        print("="*60)
        
        # Dependencies
        print("\n📦 DEPENDENCIES:")
        deps = results.get("dependencies", {})
        for dep, status in deps.items():
            status_icon = "✅" if status else "❌"
            print(f"  {status_icon} {dep.upper()}: {'Available' if status else 'Missing'}")
        
        # Model info
        print("\n🤖 MODEL INFO:")
        model_info = results.get("model_info", {})
        if "error" in model_info:
            print(f"  ❌ Model loading failed: {model_info['error']}")
        else:
            print(f"  ✅ Model loaded: {model_info.get('model_path', 'Unknown')}")
            print(f"  📊 Classes: {model_info.get('num_classes', 'Unknown')}")
        
        # Test images
        print("\n🖼️ TEST IMAGES:")
        test_images = results.get("test_images", [])
        if test_images:
            total_detections = sum(len(img.get("detections", [])) for img in test_images)
            avg_time = np.mean([img.get("detection_time", 0) for img in test_images])
            print(f"  📸 Images tested: {len(test_images)}")
            print(f"  🎯 Total detections: {total_detections}")
            print(f"  ⏱️ Average detection time: {avg_time:.3f}s")
        else:
            print("  ❌ No test images processed")
        
        # Camera test
        print("\n📹 CAMERA TEST:")
        camera_test = results.get("camera_test", {})
        if "error" in camera_test:
            print(f"  ❌ Camera test failed: {camera_test['error']}")
        else:
            print(f"  ✅ Duration: {camera_test.get('duration', 0):.1f}s")
            print(f"  📊 FPS: {camera_test.get('fps', 0):.1f}")
            print(f"  🎯 Detection runs: {camera_test.get('detection_runs', 0)}")
            print(f"  ⏱️ Avg detection time: {camera_test.get('average_detection_time', 0):.3f}s")
        
        print("\n" + "="*60)

def main():
    """Main function"""
    print("YOLOv8 Local Backend Diagnostic Test")
    print("This will test your local YOLOv8 setup comprehensively")
    print("-" * 50)
    
    tester = YOLOv8LocalTester()
    results = tester.run_comprehensive_test()
    tester.print_summary(results)
    
    print(f"\nDetailed results saved to: yolo_test_results.json")
    print("Run this test to diagnose YOLOv8 detection issues!")

if __name__ == "__main__":
    main()
