#!/usr/bin/env python3
"""
Local YOLOv8 Motorcycle Diagnostic Server
Uses your custom trained model: yolo-motorcycle-diagnostic-training/backend/runs/detect/train3/weights/best.pt
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
        self.model = YOLO("yolo-motorcycle-diagnostic-training/backend/runs/detect/train3/weights/best.pt")
        print(f"Model loaded with {len(self.model.names)} classes")
        print(f"Classes: {self.model.names}")
    
    def detect_from_camera(self, camera_index=0, duration=30):
        """Run real-time detection from camera"""
        cap = cv2.VideoCapture(camera_index)
        if not cap.isOpened():
            print("ERROR: Could not open camera")
            return
        
        print(f"Starting camera detection for {duration} seconds...")
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
                            class_name = self.model.names.get(cls, f"class_{cls}")
                            
                            # Draw bounding box
                            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                            
                            # Draw label
                            label = f"{class_name}: {conf:.2f}"
                            cv2.putText(frame, label, (x1, y1-10), 
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
                            
                            detection_count += 1
                            print(f"Detection: {class_name} ({conf:.2f})")
            
            # Show frame
            cv2.imshow('Local YOLOv8 Motorcycle Diagnostic', frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()
        
        print(f"\nDetection completed:")
        print(f"  Total frames: {frame_count}")
        print(f"  Total detections: {detection_count}")
    
    def detect_from_image(self, image_path):
        """Detect from a single image"""
        if not os.path.exists(image_path):
            print(f"Image not found: {image_path}")
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
                    class_name = self.model.names.get(cls, f"class_{cls}")
                    
                    detections.append({
                        "bbox": [x1, y1, x2, y2],
                        "confidence": conf,
                        "class": cls,
                        "class_name": class_name
                    })
                    
                    # Draw on image
                    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    label = f"{class_name}: {conf:.2f}"
                    cv2.putText(img, label, (x1, y1-10), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        
        # Save result
        output_path = f"detected_{os.path.basename(image_path)}"
        cv2.imwrite(output_path, img)
        
        print(f"Found {len(detections)} detections in {image_path}")
        for det in detections:
            print(f"  - {det['class_name']}: {det['confidence']:.2f}")
        print(f"Result saved to: {output_path}")
        
        return detections

if __name__ == "__main__":
    server = LocalYOLOServer()
    
    print("\nLocal YOLOv8 Motorcycle Diagnostic Server")
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
