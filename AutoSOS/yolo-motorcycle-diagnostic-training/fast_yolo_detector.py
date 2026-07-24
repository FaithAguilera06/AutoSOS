#!/usr/bin/env python3
"""
Fast YOLOv8 Motorcycle Diagnostic Detector
Optimized for quick loading and real-time performance
"""

import cv2
import numpy as np
from ultralytics import YOLO
import os
import sys
import time
import threading

# Class names and colors for motorcycle issues
CLASS_NAMES = {
    0: "broken_headlights_tail_lights",
    1: "broken_side_mirror", 
    2: "flat_tire",
    3: "oil_leak"
}

CLASS_DISPLAY_NAMES = {
    0: "Broken Headlights/Tail Lights",
    1: "Broken Side Mirror",
    2: "Flat Tire", 
    3: "Oil Leak"
}

CLASS_COLORS = {
    0: (0, 255, 255),    # Yellow
    1: (0, 165, 255),    # Orange
    2: (0, 0, 255),      # Red
    3: (128, 0, 128)     # Purple
}

class FastYOLODetector:
    def __init__(self, model_path, confidence_threshold=0.3):
        """Initialize the fast YOLOv8 detector"""
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.model = None
        self.cap = None
        self.is_loading = True
        
    def show_loading_screen(self):
        """Show loading screen while model loads"""
        print("🔄 Loading YOLOv8 model... This may take a moment...")
        
        # Create a simple loading window
        loading_img = np.zeros((300, 600, 3), dtype=np.uint8)
        cv2.putText(loading_img, "Loading YOLOv8 Model...", (50, 100), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.putText(loading_img, "Please wait...", (200, 150), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        cv2.imshow('Loading...', loading_img)
        cv2.waitKey(1)
    
    def load_model_async(self):
        """Load model in background thread"""
        try:
            print(f"📦 Loading model from: {self.model_path}")
            start_time = time.time()
            
            self.model = YOLO(self.model_path)
            
            load_time = time.time() - start_time
            print(f"✅ Model loaded in {load_time:.1f} seconds!")
            print(f"📊 Model size: {os.path.getsize(self.model_path) / (1024*1024):.1f} MB")
            
            self.is_loading = False
            
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            self.is_loading = False
    
    def initialize_camera(self, camera_index=0):
        """Initialize camera capture"""
        try:
            print(f"📹 Initializing camera...")
            self.cap = cv2.VideoCapture(camera_index)
            
            if not self.cap.isOpened():
                raise Exception(f"Could not open camera {camera_index}")
            
            # Set camera properties for better performance
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)  # Smaller for faster processing
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            
            # Get actual camera properties
            width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = int(self.cap.get(cv2.CAP_PROP_FPS))
            
            print(f"✅ Camera ready: {width}x{height} @ {fps} FPS")
            return True
            
        except Exception as e:
            print(f"❌ Camera error: {e}")
            return False
    
    def draw_detections(self, frame, detections):
        """Draw bounding boxes and labels on the frame"""
        annotated_frame = frame.copy()
        
        for detection in detections:
            x1, y1, x2, y2 = detection['bbox']
            confidence = detection['confidence']
            class_id = detection['class_id']
            
            # Get class info
            display_name = CLASS_DISPLAY_NAMES.get(class_id, f"Issue {class_id}")
            color = CLASS_COLORS.get(class_id, (0, 255, 0))
            
            # Draw bounding box
            cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
            
            # Draw label
            label = f"{display_name}: {confidence:.2f}"
            cv2.putText(annotated_frame, label, (int(x1), int(y1) - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        return annotated_frame
    
    def process_frame(self, frame):
        """Process a single frame with YOLOv8"""
        if self.model is None or self.is_loading:
            return []
        
        try:
            # Run YOLOv8 inference with optimized settings
            results = self.model(frame, conf=self.confidence_threshold, verbose=False, device='cpu')
            
            detections = []
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = box.conf[0].cpu().numpy()
                        class_id = int(box.cls[0].cpu().numpy())
                        
                        detection = {
                            'bbox': [x1, y1, x2, y2],
                            'confidence': float(confidence),
                            'class_id': class_id
                        }
                        detections.append(detection)
            
            return detections
            
        except Exception as e:
            print(f"❌ Processing error: {e}")
            return []
    
    def run_detection(self):
        """Main detection loop with fast loading"""
        print("🚀 Fast YOLOv8 Detector Starting...")
        
        # Show loading screen
        self.show_loading_screen()
        
        # Start model loading in background
        model_thread = threading.Thread(target=self.load_model_async)
        model_thread.daemon = True
        model_thread.start()
        
        # Initialize camera while model loads
        if not self.initialize_camera():
            cv2.destroyAllWindows()
            return
        
        print("🎯 Starting detection loop...")
        print("📋 Controls: Q=Quit, S=Save, C=Confidence, H=Help")
        
        frame_count = 0
        show_help = True
        last_detection_time = 0
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    print("❌ Failed to read frame")
                    break
                
                frame_count += 1
                current_time = time.time()
                
                # Process frame only if model is loaded
                detections = []
                if not self.is_loading and self.model is not None:
                    # Limit processing to 2 FPS for better performance
                    if current_time - last_detection_time > 0.5:
                        detections = self.process_frame(frame)
                        last_detection_time = current_time
                
                # Draw detections
                annotated_frame = self.draw_detections(frame, detections)
                
                # Add status overlay
                self.add_status_overlay(annotated_frame, detections, frame_count, show_help)
                
                # Display frame
                cv2.imshow('Fast YOLOv8 Motorcycle Detector', annotated_frame)
                
                # Handle key presses
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s') and not self.is_loading:
                    self.save_frame(annotated_frame, detections)
                elif key == ord('c'):
                    self.change_confidence()
                elif key == ord('h'):
                    show_help = not show_help
                
        except KeyboardInterrupt:
            print("\n🛑 Stopped by user")
        except Exception as e:
            print(f"❌ Detection error: {e}")
        finally:
            self.cleanup()
    
    def add_status_overlay(self, frame, detections, frame_count, show_help):
        """Add status overlay to frame"""
        height, width = frame.shape[:2]
        
        # Status text
        if self.is_loading:
            status = "Loading model..."
            color = (0, 255, 255)  # Yellow
        else:
            status = f"Detections: {len(detections)} | Conf: {self.confidence_threshold:.2f}"
            color = (0, 255, 0)  # Green
        
        cv2.putText(frame, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        cv2.putText(frame, f"Frame: {frame_count}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Help text
        if show_help:
            help_lines = ["Q=Quit", "S=Save", "C=Confidence", "H=Help"]
            y_offset = height - 80
            for i, line in enumerate(help_lines):
                cv2.putText(frame, line, (10, y_offset + i * 20), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        
        # Detection details
        if detections and not self.is_loading:
            y_offset = 90
            for i, det in enumerate(detections[:3]):  # Show max 3
                class_name = CLASS_DISPLAY_NAMES.get(det['class_id'], f"Issue {det['class_id']}")
                text = f"{i+1}. {class_name}: {det['confidence']:.2f}"
                cv2.putText(frame, text, (10, y_offset + i * 20), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
    
    def save_frame(self, frame, detections):
        """Save current frame"""
        filename = f"detection_{len(detections)}_issues.jpg"
        cv2.imwrite(filename, frame)
        print(f"💾 Saved: {filename}")
    
    def change_confidence(self):
        """Change confidence threshold"""
        try:
            new_conf = float(input(f"\nNew confidence (current: {self.confidence_threshold:.2f}): "))
            if 0.0 <= new_conf <= 1.0:
                self.confidence_threshold = new_conf
                print(f"✅ Confidence: {self.confidence_threshold:.2f}")
            else:
                print("❌ Must be 0.0-1.0")
        except ValueError:
            print("❌ Invalid input")
    
    def cleanup(self):
        """Clean up resources"""
        if self.cap:
            self.cap.release()
        cv2.destroyAllWindows()
        print("🧹 Cleanup done")

def main():
    """Main function"""
    print("⚡ Fast YOLOv8 Motorcycle Detector")
    print("=" * 40)
    
    model_path = "runs/detect/train3/weights/best.pt"
    
    if not os.path.exists(model_path):
        print(f"❌ Model not found: {model_path}")
        print("💡 Run this from the yolo-motorcycle-diagnostic-training folder")
        return
    
    # Create fast detector
    detector = FastYOLODetector(model_path, 0.3)
    
    # Run detection
    detector.run_detection()

if __name__ == "__main__":
    main()

