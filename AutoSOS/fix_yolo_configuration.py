#!/usr/bin/env python3
"""
Fix YOLOv8 Configuration for AutoSOS
This script will update your system to use the correct custom motorcycle model
"""

import os
import shutil
import json
from pathlib import Path

def fix_yolo_configuration():
    """Fix the YOLOv8 configuration to use the custom motorcycle model"""
    print("="*60)
    print("FIXING YOLOV8 CONFIGURATION")
    print("="*60)
    
    # The correct custom model path
    custom_model_path = "yolo-motorcycle-diagnostic-training/backend/runs/detect/train3/weights/best.pt"
    
    if not os.path.exists(custom_model_path):
        print(f"ERROR: Custom model not found at: {custom_model_path}")
        return False
    
    print(f"SUCCESS: Custom model found: {custom_model_path}")
    
    # Create models directory if it doesn't exist
    models_dir = "models"
    os.makedirs(models_dir, exist_ok=True)
    
    # Copy the custom model to the models directory
    custom_model_dest = os.path.join(models_dir, "motorcycle_diagnostic.pt")
    
    try:
        shutil.copy2(custom_model_path, custom_model_dest)
        print(f"SUCCESS: Custom model copied to: {custom_model_dest}")
    except Exception as e:
        print(f"ERROR: Failed to copy model: {e}")
        return False
    
    # Update the cloud deployment service to use the correct model
    cloud_service_path = "cloud-deployment/yolo-service/main.py"
    
    if os.path.exists(cloud_service_path):
        print(f"\nUpdating cloud service configuration...")
        
        # Read the current file
        with open(cloud_service_path, 'r') as f:
            content = f.read()
        
        # Find and replace model loading logic
        old_model_loading = 'yolo_model = YOLO("yolov8n.pt")  # Use nano model for cloud deployment'
        new_model_loading = f'yolo_model = YOLO("{custom_model_dest}")  # Use custom motorcycle diagnostic model'
        
        if old_model_loading in content:
            content = content.replace(old_model_loading, new_model_loading)
            
            # Also update the fallback model loading
            content = content.replace(
                'yolo_model = YOLO("yolov8n.pt")',
                f'yolo_model = YOLO("{custom_model_dest}")'
            )
            
            # Write back
            with open(cloud_service_path, 'w') as f:
                f.write(content)
            
            print(f"SUCCESS: Cloud service updated to use custom model")
        else:
            print(f"WARNING: Could not find model loading code to update")
    
    # Create a configuration file
    config = {
        "model_path": custom_model_dest,
        "model_type": "custom_motorcycle_diagnostic",
        "classes": {
            0: "broken_headlights_tail_lights",
            1: "broken_side_mirror", 
            2: "flat_tire",
            3: "oil_leak"
        },
        "class_display_names": {
            0: "Broken Headlights/Tail Lights",
            1: "Broken Side Mirror",
            2: "Flat Tire", 
            3: "Oil Leak"
        },
        "confidence_threshold": 0.5,
        "fixed_timestamp": "2025-10-02"
    }
    
    with open("yolo_config.json", "w") as f:
        json.dump(config, f, indent=2)
    
    print(f"SUCCESS: Configuration saved to: yolo_config.json")
    
    return True

def create_test_scripts():
    """Create scripts to test the fixed configuration"""
    
    # Create a quick test script
    test_script = '''#!/usr/bin/env python3
"""
Quick test of the fixed YOLOv8 configuration
"""

import cv2
import numpy as np
from ultralytics import YOLO
import json
import os

def test_fixed_model():
    """Test the fixed custom model"""
    
    # Load configuration
    with open("yolo_config.json", "r") as f:
        config = json.load(f)
    
    model_path = config["model_path"]
    
    if not os.path.exists(model_path):
        print(f"❌ Model not found: {model_path}")
        return False
    
    print(f"🔍 Testing fixed model: {model_path}")
    
    # Load model
    model = YOLO(model_path)
    
    print(f"✅ Model loaded successfully")
    print(f"📊 Classes: {model.names}")
    
    # Create a test image with motorcycle-like features
    test_image = np.zeros((640, 480, 3), dtype=np.uint8)
    
    # Add shapes that might trigger detections
    cv2.rectangle(test_image, (100, 100), (300, 200), (150, 150, 150), -1)  # Body
    cv2.circle(test_image, (80, 250), 30, (100, 100, 100), -1)   # Wheel 1
    cv2.circle(test_image, (320, 250), 30, (100, 100, 100), -1)  # Wheel 2
    cv2.circle(test_image, (120, 80), 10, (255, 255, 255), -1)   # Light 1
    cv2.circle(test_image, (280, 80), 10, (255, 255, 255), -1)   # Light 2
    
    # Run detection
    results = model(test_image, conf=0.3, verbose=False)
    
    # Process results
    detections = []
    for result in results:
        if hasattr(result, 'boxes') and result.boxes is not None:
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                conf = box.conf[0].cpu().numpy().item()
                cls = int(box.cls[0].cpu().numpy().item())
                class_name = model.names.get(cls, f"class_{cls}")
                
                detections.append({
                    "bbox": [x1, y1, x2, y2],
                    "confidence": conf,
                    "class": cls,
                    "class_name": class_name
                })
                
                # Draw on image
                cv2.rectangle(test_image, (x1, y1), (x2, y2), (0, 255, 0), 2)
                label = f"{class_name}: {conf:.2f}"
                cv2.putText(test_image, label, (x1, y1-10), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
    
    # Save test image
    cv2.imwrite("test_fixed_model.jpg", test_image)
    
    print(f"🎯 Found {len(detections)} detections")
    for det in detections:
        print(f"   - {det['class_name']}: {det['confidence']:.2f}")
    
    print(f"📸 Test image saved: test_fixed_model.jpg")
    
    return len(detections) > 0

if __name__ == "__main__":
    print("Testing Fixed YOLOv8 Configuration")
    print("-" * 40)
    
    success = test_fixed_model()
    
    if success:
        print("\\n✅ FIXED MODEL IS WORKING!")
        print("Your YOLOv8 system is now configured correctly")
    else:
        print("\\n⚠️ Model loaded but no detections on test image")
        print("This might be normal - try with real motorcycle images")
'''
    
    with open("test_fixed_model.py", "w") as f:
        f.write(test_script)
    
    print(f"SUCCESS: Test script created: test_fixed_model.py")
    
    # Create camera test script
    camera_script = '''#!/usr/bin/env python3
"""
Test camera with fixed YOLOv8 model
"""

import cv2
from ultralytics import YOLO
import json
import time

def test_camera_with_fixed_model():
    """Test camera with the fixed custom model"""
    
    # Load configuration
    with open("yolo_config.json", "r") as f:
        config = json.load(f)
    
    model_path = config["model_path"]
    print(f"Loading model: {model_path}")
    
    # Load model
    model = YOLO(model_path)
    print(f"Model loaded with classes: {model.names}")
    
    # Open camera
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Could not open camera")
        return
    
    print("📹 Camera opened successfully")
    print("Press 'q' to quit, 's' to save detection")
    
    detection_count = 0
    frame_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Could not read frame")
            break
        
        frame_count += 1
        
        # Run detection every 5 frames
        if frame_count % 5 == 0:
            results = model(frame, conf=0.4, verbose=False)
            
            # Draw detections
            for result in results:
                if hasattr(result, 'boxes') and result.boxes is not None:
                    for box in result.boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                        conf = box.conf[0].cpu().numpy().item()
                        cls = int(box.cls[0].cpu().numpy().item())
                        class_name = model.names.get(cls, f"class_{cls}")
                        
                        # Draw bounding box
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        
                        # Draw label
                        label = f"{class_name}: {conf:.2f}"
                        cv2.putText(frame, label, (x1, y1-10), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
                        
                        detection_count += 1
                        print(f"🎯 Detection #{detection_count}: {class_name} ({conf:.2f})")
        
        # Add info overlay
        cv2.putText(frame, f"Frame: {frame_count}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(frame, f"Detections: {detection_count}", (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Show frame
        cv2.imshow('Fixed YOLOv8 Motorcycle Diagnostic', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            filename = f"detection_{int(time.time())}.jpg"
            cv2.imwrite(filename, frame)
            print(f"📸 Saved: {filename}")
    
    cap.release()
    cv2.destroyAllWindows()
    
    print(f"\\n📊 Session complete:")
    print(f"   Total frames: {frame_count}")
    print(f"   Total detections: {detection_count}")

if __name__ == "__main__":
    test_camera_with_fixed_model()
'''
    
    with open("test_camera_fixed.py", "w") as f:
        f.write(camera_script)
    
    print(f"SUCCESS: Camera test script created: test_camera_fixed.py")

def main():
    """Main function to fix YOLOv8 configuration"""
    print("YOLOv8 Configuration Fix for AutoSOS")
    print("This will configure your system to use the custom motorcycle model")
    print()
    
    # Fix configuration
    if fix_yolo_configuration():
        print("\nSUCCESS: CONFIGURATION FIXED SUCCESSFULLY!")
        
        # Create test scripts
        create_test_scripts()
        
        print("\n📋 NEXT STEPS:")
        print("1. Test the fixed model: python test_fixed_model.py")
        print("2. Test with camera: python test_camera_fixed.py")
        print("3. Run local server: python local_yolo_server.py")
        
        print("\nSUCCESS: Your YOLOv8 system should now detect motorcycle issues correctly!")
        
    else:
        print("\nERROR: Configuration fix failed")
        print("Please check the custom model path and try again")

if __name__ == "__main__":
    main()
