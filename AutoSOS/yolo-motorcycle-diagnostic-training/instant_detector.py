#!/usr/bin/env python3
"""
Instant YOLOv8 Motorcycle Diagnostic Detector
Loads instantly and shows camera feed immediately
"""

import cv2
import numpy as np
import os
import sys
import time

# Simple class definitions
CLASS_COLORS = {
    0: (0, 255, 255),    # Yellow
    1: (0, 165, 255),    # Orange
    2: (0, 0, 255),      # Red
    3: (128, 0, 128)     # Purple
}

CLASS_NAMES = {
    0: "Broken Headlights",
    1: "Broken Mirror",
    2: "Flat Tire",
    3: "Oil Leak"
}

class InstantDetector:
    def __init__(self):
        """Initialize instant detector"""
        self.cap = None
        self.model = None
        self.model_loaded = False
        self.confidence = 0.3
        
    def initialize_camera(self):
        """Initialize camera immediately"""
        try:
            print("📹 Starting camera...")
            self.cap = cv2.VideoCapture(0)
            
            if not self.cap.isOpened():
                print("❌ Camera not available")
                return False
            
            # Set camera properties
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            
            print("✅ Camera ready!")
            return True
            
        except Exception as e:
            print(f"❌ Camera error: {e}")
            return False
    
    def load_model_async(self):
        """Load model in background"""
        try:
            print("🔄 Loading YOLOv8 model in background...")
            from ultralytics import YOLO
            
            model_path = "runs/detect/train3/weights/best.pt"
            if os.path.exists(model_path):
                self.model = YOLO(model_path)
                self.model_loaded = True
                print("✅ YOLOv8 model loaded!")
            else:
                print("⚠️ Model not found, running in camera-only mode")
                
        except Exception as e:
            print(f"⚠️ Model loading failed: {e}")
            print("📹 Running in camera-only mode")
    
    def process_frame(self, frame):
        """Process frame with YOLOv8 if available"""
        if not self.model_loaded or self.model is None:
            return []
        
        try:
            results = self.model(frame, conf=self.confidence, verbose=False)
            detections = []
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = box.conf[0].cpu().numpy()
                        class_id = int(box.cls[0].cpu().numpy())
                        
                        detections.append({
                            'bbox': [x1, y1, x2, y2],
                            'confidence': float(confidence),
                            'class_id': class_id
                        })
            
            return detections
            
        except Exception as e:
            return []
    
    def draw_detections(self, frame, detections):
        """Draw detections on frame"""
        annotated_frame = frame.copy()
        
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            confidence = det['confidence']
            class_id = det['class_id']
            
            color = CLASS_COLORS.get(class_id, (0, 255, 0))
            class_name = CLASS_NAMES.get(class_id, f"Issue {class_id}")
            
            # Draw bounding box
            cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
            
            # Draw label
            label = f"{class_name}: {confidence:.2f}"
            cv2.putText(annotated_frame, label, (int(x1), int(y1) - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        return annotated_frame
    
    def add_overlay(self, frame, detections, frame_count):
        """Add status overlay"""
        height, width = frame.shape[:2]
        
        # Status
        if self.model_loaded:
            status = f"YOLOv8 Active | Detections: {len(detections)} | Conf: {self.confidence:.2f}"
            color = (0, 255, 0)
        else:
            status = "Loading YOLOv8... | Camera Only Mode"
            color = (0, 255, 255)
        
        cv2.putText(frame, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        cv2.putText(frame, f"Frame: {frame_count} | Q=Quit, S=Save", (10, height - 20), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        
        # Detection list
        if detections:
            y_offset = 60
            for i, det in enumerate(detections[:3]):
                class_name = CLASS_NAMES.get(det['class_id'], f"Issue {det['class_id']}")
                text = f"{i+1}. {class_name}: {det['confidence']:.2f}"
                cv2.putText(frame, text, (10, y_offset + i * 20), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
    
    def run(self):
        """Main detection loop"""
        print("⚡ Instant YOLOv8 Detector")
        print("=" * 30)
        
        # Start camera immediately
        if not self.initialize_camera():
            return
        
        # Start model loading in background
        import threading
        model_thread = threading.Thread(target=self.load_model_async)
        model_thread.daemon = True
        model_thread.start()
        
        print("🎯 Camera started! Model loading in background...")
        print("📋 Controls: Q=Quit, S=Save")
        
        frame_count = 0
        last_detection_time = 0
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    break
                
                frame_count += 1
                current_time = time.time()
                
                # Process frame (limit to 2 FPS for performance)
                detections = []
                if current_time - last_detection_time > 0.5:
                    detections = self.process_frame(frame)
                    last_detection_time = current_time
                
                # Draw detections
                annotated_frame = self.draw_detections(frame, detections)
                
                # Add overlay
                self.add_overlay(annotated_frame, detections, frame_count)
                
                # Show frame
                cv2.imshow('Instant YOLOv8 Detector', annotated_frame)
                
                # Handle keys
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s') and detections:
                    filename = f"detection_{len(detections)}_issues.jpg"
                    cv2.imwrite(filename, annotated_frame)
                    print(f"💾 Saved: {filename}")
                
        except KeyboardInterrupt:
            print("\n🛑 Stopped")
        finally:
            if self.cap:
                self.cap.release()
            cv2.destroyAllWindows()
            print("🧹 Cleanup done")

def main():
    """Main function"""
    detector = InstantDetector()
    detector.run()

if __name__ == "__main__":
    main()

