#!/usr/bin/env python3
"""
Minimal YOLOv8 Detector - Absolute Minimum Settings
Fastest possible detection with lowest quality
"""

import cv2
import numpy as np
import os
import sys
import time
import threading

class MinimalDetector:
    def __init__(self):
        """Initialize minimal detector"""
        self.cap = None
        self.model = None
        self.ready = False
        self.conf = 0.2  # Lower confidence for more detections
        self.skip = 5     # Process every 5th frame
        
    def start_cam(self):
        """Start camera with absolute minimum settings"""
        try:
            print("📹 Starting camera (minimal mode)...")
            self.cap = cv2.VideoCapture(0)
            
            if not self.cap.isOpened():
                return False
            
            # ABSOLUTE MINIMUM RESOLUTION
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 160)   # Tiny
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 120)  # Tiny
            self.cap.set(cv2.CAP_PROP_FPS, 10)            # Low FPS
            
            print("✅ Camera: 160x120 (minimal)")
            return True
            
        except:
            return False
    
    def load_model(self):
        """Load model in background"""
        try:
            print("🔄 Loading model...")
            from ultralytics import YOLO
            
            if os.path.exists("runs/detect/train3/weights/best.pt"):
                self.model = YOLO("runs/detect/train3/weights/best.pt")
                self.ready = True
                print("✅ Model ready!")
            else:
                print("⚠️ No model")
                
        except Exception as e:
            print(f"⚠️ Model error: {e}")
    
    def process(self, frame):
        """Minimal processing"""
        if not self.ready or self.model is None:
            return []
        
        try:
            # Process at 80x60 resolution for maximum speed
            tiny = cv2.resize(frame, (80, 60))
            results = self.model(tiny, conf=self.conf, verbose=False, device='cpu')
            
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        # Scale back to 160x120
                        x1 *= 2; y1 *= 2; x2 *= 2; y2 *= 2
                        
                        detections.append({
                            'bbox': [x1, y1, x2, y2],
                            'conf': float(box.conf[0].cpu().numpy()),
                            'cls': int(box.cls[0].cpu().numpy())
                        })
            
            return detections
            
        except:
            return []
    
    def draw(self, frame, detections):
        """Minimal drawing"""
        colors = [(0, 255, 255), (0, 165, 255), (0, 0, 255), (128, 0, 128)]
        names = ["H", "M", "T", "O"]  # Short names
        
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            cls = det['cls']
            conf = det['conf']
            
            color = colors[cls % len(colors)]
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 1)
            cv2.putText(frame, f"{names[cls % len(names)]}:{conf:.1f}", 
                       (int(x1), int(y1) - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.2, color, 1)
    
    def overlay(self, frame, detections, count):
        """Minimal overlay"""
        if self.ready:
            cv2.putText(frame, f"YOLO:{len(detections)}", (2, 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 255, 0), 1)
        else:
            cv2.putText(frame, "Loading...", (2, 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 255, 255), 1)
        
        cv2.putText(frame, f"F:{count}", (2, 25), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.2, (255, 255, 255), 1)
        cv2.putText(frame, "Q=Quit", (2, frame.shape[0] - 5), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.2, (255, 255, 255), 1)
    
    def run(self):
        """Minimal detection loop"""
        print("⚡ MINIMAL YOLOv8 DETECTOR")
        print("=" * 25)
        print("🚀 Absolute minimum settings")
        print("📹 Resolution: 160x120")
        print("🔄 Process every 5th frame")
        print("⚡ Minimal everything")
        print()
        
        if not self.start_cam():
            return
        
        # Load model in background
        threading.Thread(target=self.load_model, daemon=True).start()
        
        print("🎯 Starting minimal detection...")
        
        count = 0
        processed = 0
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    break
                
                count += 1
                
                # Process every 5th frame
                detections = []
                if count % self.skip == 0:
                    detections = self.process(frame)
                    processed += 1
                
                # Draw and show
                self.draw(frame, detections)
                self.overlay(frame, detections, count)
                cv2.imshow('Minimal YOLOv8', frame)
                
                # Handle keys
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                
        except KeyboardInterrupt:
            print("\n🛑 Stopped")
        finally:
            if self.cap:
                self.cap.release()
            cv2.destroyAllWindows()
            print(f"🧹 Processed {processed} frames")

def main():
    detector = MinimalDetector()
    detector.run()

if __name__ == "__main__":
    main()
