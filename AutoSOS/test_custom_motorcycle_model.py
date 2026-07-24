#!/usr/bin/env python3
"""
Test the custom motorcycle diagnostic YOLOv8 model specifically
"""

import os
import cv2
import numpy as np
from ultralytics import YOLO
import time
import json

def test_custom_models():
    """Test all available custom motorcycle models"""
    print("="*60)
    print("CUSTOM MOTORCYCLE MODEL TEST")
    print("="*60)
    
    # Custom trained models found in your project
    custom_models = [
        "yolo-motorcycle-diagnostic-training/backend/runs/detect/train3/weights/best.pt",
        "yolo-motorcycle-diagnostic-training/runs/detect/train/weights/best.pt",
        "yolo-motorcycle-diagnostic-training/runs/detect/train3/weights/best.pt"
    ]
    
    results = {}
    
    for model_path in custom_models:
        if os.path.exists(model_path):
            print(f"\n🔍 Testing model: {model_path}")
            try:
                # Load model
                model = YOLO(model_path)
                
                # Get model info
                model_info = {
                    "path": model_path,
                    "classes": getattr(model, 'names', {}),
                    "num_classes": len(getattr(model, 'names', {}))
                }
                
                print(f"   ✅ Model loaded successfully")
                print(f"   📊 Number of classes: {model_info['num_classes']}")
                print(f"   📝 Classes: {model_info['classes']}")
                
                # Test on a simple image
                test_image = create_motorcycle_test_image()
                
                # Run detection
                start_time = time.time()
                detections = model(test_image, conf=0.1, verbose=False)
                detection_time = time.time() - start_time
                
                # Process results
                detection_count = 0
                detection_details = []
                
                for result in detections:
                    if hasattr(result, 'boxes') and result.boxes is not None:
                        boxes = result.boxes
                        detection_count += len(boxes)
                        
                        for box in boxes:
                            if hasattr(box, 'xyxy'):
                                bbox = box.xyxy[0].cpu().numpy().tolist()
                                conf = box.conf[0].cpu().numpy().item()
                                cls = int(box.cls[0].cpu().numpy().item())
                                
                                detection_details.append({
                                    "bbox": bbox,
                                    "confidence": conf,
                                    "class": cls,
                                    "class_name": model.names.get(cls, f"class_{cls}")
                                })
                
                model_info.update({
                    "test_detection_time": detection_time,
                    "test_detections": detection_count,
                    "detection_details": detection_details
                })
                
                print(f"   🎯 Test detections: {detection_count}")
                print(f"   ⏱️ Detection time: {detection_time:.3f}s")
                
                results[model_path] = model_info
                
            except Exception as e:
                print(f"   ❌ Error loading model: {e}")
                results[model_path] = {"error": str(e)}
        else:
            print(f"\n❌ Model not found: {model_path}")
    
    return results

def create_motorcycle_test_image():
    """Create a test image that might trigger motorcycle detections"""
    # Create a 640x640 image with motorcycle-like shapes
    img = np.zeros((640, 640, 3), dtype=np.uint8)
    
    # Add some shapes that might resemble motorcycle parts
    # Circular shape (wheel-like)
    cv2.circle(img, (150, 300), 80, (100, 100, 100), -1)
    cv2.circle(img, (490, 300), 80, (100, 100, 100), -1)
    
    # Rectangular shape (body-like)
    cv2.rectangle(img, (200, 250), (450, 350), (80, 80, 80), -1)
    
    # Some bright spots (could be lights)
    cv2.circle(img, (120, 200), 15, (255, 255, 255), -1)
    cv2.circle(img, (520, 200), 15, (255, 255, 255), -1)
    
    # Add some random noise to make it more realistic
    noise = np.random.randint(0, 30, (640, 640, 3), dtype=np.uint8)
    img = cv2.add(img, noise)
    
    return img

def create_local_yolo_server():
    """Create a local YOLOv8 server for testing"""
    print("\n" + "="*60)
    print("CREATING LOCAL YOLO SERVER")
    print("="*60)
    
    # Find the best custom model
    results = test_custom_models()
    
    best_model = None
    best_model_path = None
    
    for model_path, model_info in results.items():
        if "error" not in model_info and model_info.get("num_classes", 0) <= 10:  # Custom models should have fewer classes
            best_model_path = model_path
            best_model = model_info
            break
    
    if best_model_path:
        print(f"\n🎯 Best model found: {best_model_path}")
        print(f"   Classes: {best_model.get('num_classes', 0)}")
        print(f"   Class names: {best_model.get('classes', {})}")
        
        # Create a local server script
        server_code = f'''#!/usr/bin/env python3
"""
Local YOLOv8 Motorcycle Diagnostic Server
Uses your custom trained model: {best_model_path}
"""

import cv2
import numpy as np
from ultralytics import YOLO
import time
import base64
import json

class LocalYOLOServer:
    def __init__(self):
        print("Loading custom motorcycle diagnostic model...")
        self.model = YOLO("{best_model_path}")
        print(f"Model loaded with {{len(self.model.names)}} classes")
        print(f"Classes: {{self.model.names}}")
    
    def detect_from_camera(self, camera_index=0, duration=30):
        """Run real-time detection from camera"""
        cap = cv2.VideoCapture(camera_index)
        if not cap.isOpened():
            print("ERROR: Could not open camera")
            return
        
        print(f"Starting camera detection for {{duration}} seconds...")
        print("Press 'q' to quit early")
        
        start_time = time.time()
        frame_count = 0
        detection_count = 0
        
        while time.time() - start_time < duration:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            # Run detection every 5th frame
            if frame_count % 5 == 0:
                results = self.model(frame, conf=0.3, verbose=False)
                
                # Draw detections
                for result in results:
                    if hasattr(result, 'boxes') and result.boxes is not None:
                        for box in result.boxes:
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                            conf = box.conf[0].cpu().numpy().item()
                            cls = int(box.cls[0].cpu().numpy().item())
                            class_name = self.model.names.get(cls, f"class_{{cls}}")
                            
                            # Draw bounding box
                            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                            
                            # Draw label
                            label = f"{{class_name}}: {{conf:.2f}}"
                            cv2.putText(frame, label, (x1, y1-10), 
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
                            
                            detection_count += 1
                            print(f"Detection: {{class_name}} ({{conf:.2f}})")
            
            # Show frame
            cv2.imshow('Local YOLOv8 Motorcycle Diagnostic', frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()
        
        print(f"\\nDetection completed:")
        print(f"  Total frames: {{frame_count}}")
        print(f"  Total detections: {{detection_count}}")
    
    def detect_from_image(self, image_path):
        """Detect from a single image"""
        if not os.path.exists(image_path):
            print(f"Image not found: {{image_path}}")
            return
        
        img = cv2.imread(image_path)
        results = self.model(img, conf=0.3, verbose=False)
        
        detections = []
        for result in results:
            if hasattr(result, 'boxes') and result.boxes is not None:
                for box in result.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                    conf = box.conf[0].cpu().numpy().item()
                    cls = int(box.cls[0].cpu().numpy().item())
                    class_name = self.model.names.get(cls, f"class_{{cls}}")
                    
                    detections.append({{
                        "bbox": [x1, y1, x2, y2],
                        "confidence": conf,
                        "class": cls,
                        "class_name": class_name
                    }})
                    
                    # Draw on image
                    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    label = f"{{class_name}}: {{conf:.2f}}"
                    cv2.putText(img, label, (x1, y1-10), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        
        # Save result
        output_path = f"detected_{{os.path.basename(image_path)}}"
        cv2.imwrite(output_path, img)
        
        print(f"Found {{len(detections)}} detections in {{image_path}}")
        for det in detections:
            print(f"  - {{det['class_name']}}: {{det['confidence']:.2f}}")
        print(f"Result saved to: {{output_path}}")
        
        return detections

if __name__ == "__main__":
    server = LocalYOLOServer()
    
    print("\\nLocal YOLOv8 Motorcycle Diagnostic Server")
    print("Choose an option:")
    print("1. Test with camera (30 seconds)")
    print("2. Test with sample image")
    
    choice = input("Enter choice (1 or 2): ").strip()
    
    if choice == "1":
        server.detect_from_camera()
    elif choice == "2":
        # Test with generated image
        test_img = np.zeros((640, 480, 3), dtype=np.uint8)
        cv2.rectangle(test_img, (100, 100), (300, 200), (255, 255, 255), -1)
        cv2.imwrite("test_motorcycle.jpg", test_img)
        server.detect_from_image("test_motorcycle.jpg")
    else:
        print("Invalid choice")
'''
        
        with open("local_yolo_server.py", "w") as f:
            f.write(server_code)
        
        print(f"\n✅ Local YOLOv8 server created: local_yolo_server.py")
        print("Run it with: python local_yolo_server.py")
        
    else:
        print("\n❌ No suitable custom model found")
        print("The system is using the generic COCO model instead of your custom motorcycle model")
    
    return results

def main():
    """Main function"""
    print("Custom Motorcycle YOLOv8 Model Diagnostic")
    print("This will test your custom trained models specifically")
    
    # Test all custom models
    results = test_custom_models()
    
    # Save results
    with open("custom_model_test_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n📄 Results saved to: custom_model_test_results.json")
    
    # Create local server
    create_local_yolo_server()

if __name__ == "__main__":
    main()
