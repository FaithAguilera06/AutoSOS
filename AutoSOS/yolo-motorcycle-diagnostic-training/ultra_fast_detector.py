#!/usr/bin/env python3
"""
Ultra Fast YOLOv8 Detector - Optimized for Speed
Lowest resolution, fastest processing, minimal quality
"""

import cv2
import numpy as np
import os
import sys
import time
import threading

# Minimal class info for speed
CLASS_COLORS = [(0, 255, 255), (0, 165, 255), (0, 0, 255), (128, 0, 128)]
CLASS_NAMES = ["Headlights", "Mirror", "Tire", "Oil"]

class UltraFastDetector:
    def __init__(self):
        """Initialize ultra-fast detector"""
        self.cap = None
        self.model = None
        self.model_ready = False
        self.confidence = 0.2  # Lower confidence for more detections
        self.frame_skip = 3  # Process every 3rd frame only
        
    def start_camera(self):
        """Start camera with lowest possible resolution"""
        try:
            print("📹 Starting camera (ultra-low resolution)...")
            print("⏳ Attempting to access camera...")
            
            # Try different camera indices
            for camera_index in [0, 1, 2]:
                print(f"   Trying camera {camera_index}...")
                self.cap = cv2.VideoCapture(camera_index)
                
                if self.cap.isOpened():
                    # Test if we can read a frame
                    ret, frame = self.cap.read()
                    if ret and frame is not None:
                        print(f"✅ Camera {camera_index} working!")
                        break
                    else:
                        self.cap.release()
                        print(f"   Camera {camera_index} not responding")
                else:
                    print(f"   Camera {camera_index} not available")
            
            if not self.cap or not self.cap.isOpened():
                print("❌ No working camera found!")
                print("💡 Try closing other camera applications (Zoom, Skype, etc.)")
                return False
            
            # ULTRA LOW RESOLUTION for maximum speed
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)   # Very small
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)  # Very small
            self.cap.set(cv2.CAP_PROP_FPS, 15)            # Lower FPS
            
            print("✅ Camera ready: 320x240 (ultra-fast mode)")
            return True
            
        except Exception as e:
            print(f"❌ Camera error: {e}")
            return False
    
    def load_model_background(self):
        """Load model in background thread"""
        try:
            print("🔄 Loading YOLOv8 model...")
            from ultralytics import YOLO
            
            model_path = "runs/detect/train3/weights/best.pt"
            if os.path.exists(model_path):
                self.model = YOLO(model_path)
                self.model_ready = True
                print("✅ Model ready!")
            else:
                print("⚠️ No model - camera only")
                
        except Exception as e:
            print(f"⚠️ Model failed: {e}")
    
    def process_frame_fast(self, frame):
        """Ultra-fast frame processing"""
        if not self.model_ready or self.model is None:
            return []
        
        try:
            # Resize frame to even smaller for faster processing
            small_frame = cv2.resize(frame, (160, 120))  # Tiny resolution
            
            # Run YOLOv8 with minimal settings
            results = self.model(small_frame, conf=self.confidence, verbose=False, device='cpu')
            
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Scale coordinates back to original frame size
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        x1 *= 2  # Scale up from 160 to 320
                        y1 *= 2  # Scale up from 120 to 240
                        x2 *= 2
                        y2 *= 2
                        
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
    
    def draw_detections_fast(self, frame, detections):
        """Draw detections with minimal graphics"""
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            class_id = det['class_id']
            confidence = det['confidence']
            
            # Simple rectangle
            color = CLASS_COLORS[class_id % len(CLASS_COLORS)]
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 1)
            
            # Simple label
            label = f"{CLASS_NAMES[class_id % len(CLASS_NAMES)]}: {confidence:.1f}"
            cv2.putText(frame, label, (int(x1), int(y1) - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.3, color, 1)
    
    def add_minimal_overlay(self, frame, detections, frame_count):
        """Add minimal status overlay"""
        # Simple status
        if self.model_ready:
            status = f"YOLOv8: {len(detections)} detections"
            color = (0, 255, 0)
        else:
            status = "Loading model..."
            color = (0, 255, 255)
        
        cv2.putText(frame, status, (5, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
        cv2.putText(frame, f"Frame: {frame_count}", (5, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 255), 1)
        cv2.putText(frame, "Q=Quit", (5, frame.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 255), 1)
    
    def run_ultra_fast(self):
        """Ultra-fast detection loop"""
        print("⚡ ULTRA FAST YOLOv8 DETECTOR")
        print("=" * 35)
        print("🚀 Optimized for maximum speed")
        print("📹 Low resolution: 320x240")
        print("🔄 Processing every 3rd frame only")
        print("⚡ Minimal graphics for speed")
        print()
        
        # Start camera immediately
        if not self.start_camera():
            return
        
        # Load model in background
        model_thread = threading.Thread(target=self.load_model_background)
        model_thread.daemon = True
        model_thread.start()
        
        print("🎯 Starting ultra-fast detection...")
        
        frame_count = 0
        processed_frames = 0
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    break
                
                frame_count += 1
                
                # Process only every 3rd frame for speed
                detections = []
                if frame_count % self.frame_skip == 0:
                    detections = self.process_frame_fast(frame)
                    processed_frames += 1
                
                # Draw detections
                self.draw_detections_fast(frame, detections)
                
                # Add minimal overlay
                self.add_minimal_overlay(frame, detections, frame_count)
                
                # Show frame
                cv2.imshow('Ultra Fast YOLOv8', frame)
                
                # Handle keys
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                
        except KeyboardInterrupt:
            print("\n🛑 Stopped")
        finally:
            if self.cap:
                self.cap.release()
            cv2.destroyAllWindows()
            print(f"🧹 Processed {processed_frames} frames")

def main():
    """Main function"""
    detector = UltraFastDetector()
    detector.run_ultra_fast()

if __name__ == "__main__":
    main()

