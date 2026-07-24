#!/usr/bin/env python3
"""
Detection Diagnostic - Find out why YOLOv8 isn't detecting objects
Tests different confidence levels and shows detailed detection info
"""

import cv2
import numpy as np
import os
import time
from ultralytics import YOLO

def test_model_with_different_confidences():
    """Test model with different confidence thresholds"""
    print("🔍 DETECTION DIAGNOSTIC")
    print("=" * 30)
    
    # Load model
    model_path = "runs/detect/train3/weights/best.pt"
    if not os.path.exists(model_path):
        print(f"❌ Model not found: {model_path}")
        return
    
    print(f"✅ Loading model: {model_path}")
    model = YOLO(model_path)
    
    # Get model info
    print(f"📊 Model classes: {model.names}")
    print(f"📊 Number of classes: {len(model.names)}")
    print()
    
    # Test with different confidence levels
    confidence_levels = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
    
    print("🎯 Testing different confidence thresholds:")
    print("=" * 50)
    
    for conf in confidence_levels:
        print(f"\n🔍 Confidence: {conf}")
        
        # Create test images with different colors
        test_images = []
        colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0)]
        
        for i, color in enumerate(colors):
            # Create 640x480 test image
            img = np.full((480, 640, 3), color, dtype=np.uint8)
            
            # Add some shapes to make it more interesting
            cv2.rectangle(img, (100, 100), (300, 200), (255, 255, 255), 2)
            cv2.circle(img, (500, 300), 50, (255, 255, 255), 2)
            cv2.putText(img, f"Test {i+1}", (200, 400), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            
            test_images.append(img)
        
        # Test each image
        total_detections = 0
        for i, img in enumerate(test_images):
            try:
                results = model(img, conf=conf, verbose=False, device='cpu')
                
                detections = 0
                for result in results:
                    boxes = result.boxes
                    if boxes is not None:
                        detections += len(boxes)
                
                total_detections += detections
                print(f"   Test {i+1}: {detections} detections")
                
            except Exception as e:
                print(f"   Test {i+1}: Error - {e}")
        
        print(f"   Total detections at conf={conf}: {total_detections}")
        
        if total_detections > 0:
            print(f"   ✅ Found detections at confidence {conf}!")
            break
    
    print(f"\n📊 Model classes available:")
    for class_id, class_name in model.names.items():
        print(f"   {class_id}: {class_name}")

def test_with_real_camera():
    """Test with real camera feed"""
    print("\n📹 Testing with real camera...")
    
    try:
        # Load model
        model = YOLO("runs/detect/train3/weights/best.pt")
        
        # Start camera
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        if not cap.isOpened():
            print("❌ Camera not available")
            return
        
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        print("✅ Camera ready - Press 'q' to quit, 's' to save frame")
        print("🎯 Testing with very low confidence (0.1)")
        
        frame_count = 0
        detection_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            # Test with very low confidence
            results = model(frame, conf=0.1, verbose=False, device='cpu')
            
            detections = 0
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    detections += len(boxes)
                    
                    # Draw all detections
                    for box in boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = box.conf[0].cpu().numpy()
                        class_id = int(box.cls[0].cpu().numpy())
                        
                        # Draw bounding box
                        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                        
                        # Draw label
                        label = f"{model.names[class_id]}: {confidence:.2f}"
                        cv2.putText(frame, label, (int(x1), int(y1) - 10), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
            if detections > 0:
                detection_count += 1
                print(f"Frame {frame_count}: {detections} detections found!")
            
            # Add status
            status = f"Frame: {frame_count} | Detections: {detections} | Total: {detection_count}"
            cv2.putText(frame, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            cv2.putText(frame, "Confidence: 0.1 (very low)", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            cv2.putText(frame, "Q=Quit, S=Save", (10, frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            cv2.imshow('Detection Diagnostic', frame)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('s') and detections > 0:
                filename = f"detection_frame_{frame_count}.jpg"
                cv2.imwrite(filename, frame)
                print(f"💾 Saved frame with {detections} detections: {filename}")
        
        cap.release()
        cv2.destroyAllWindows()
        
        print(f"\n📊 Results:")
        print(f"   Total frames: {frame_count}")
        print(f"   Frames with detections: {detection_count}")
        print(f"   Detection rate: {(detection_count/frame_count)*100:.1f}%")
        
    except Exception as e:
        print(f"❌ Camera test failed: {e}")

def main():
    """Main diagnostic function"""
    print("🔍 YOLOv8 DETECTION DIAGNOSTIC")
    print("=" * 40)
    print("Finding out why detections aren't working...")
    print()
    
    # Test 1: Model with different confidences
    test_model_with_different_confidences()
    
    # Test 2: Real camera test
    print("\n" + "=" * 40)
    test_with_real_camera()
    
    print("\n🎯 DIAGNOSTIC COMPLETE")
    print("If no detections found:")
    print("• Model might be trained on different objects")
    print("• Try pointing camera at motorcycle parts")
    print("• Check if model classes match what you're looking for")

if __name__ == "__main__":
    main()
