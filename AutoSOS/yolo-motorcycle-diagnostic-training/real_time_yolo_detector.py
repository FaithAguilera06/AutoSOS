#!/usr/bin/env python3
"""
Real-time YOLOv8 Motorcycle Diagnostic Detector
Standalone application that streams camera feed and detects motorcycle issues
"""

import cv2
import numpy as np
from ultralytics import YOLO
import os
import sys
import argparse
from pathlib import Path

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

class RealTimeYOLODetector:
    def __init__(self, model_path, confidence_threshold=0.3):
        """
        Initialize the real-time YOLOv8 detector
        
        Args:
            model_path (str): Path to the trained YOLOv8 model
            confidence_threshold (float): Minimum confidence for detections
        """
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.model = None
        self.cap = None
        
        # Load the model
        self.load_model()
        
    def load_model(self):
        """Load the YOLOv8 model"""
        try:
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Model file not found: {self.model_path}")
            
            print(f"🔄 Loading YOLOv8 model from: {self.model_path}")
            self.model = YOLO(self.model_path)
            print(f"✅ Model loaded successfully!")
            print(f"📊 Model size: {os.path.getsize(self.model_path) / (1024*1024):.1f} MB")
            
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            sys.exit(1)
    
    def initialize_camera(self, camera_index=0):
        """Initialize camera capture"""
        try:
            print(f"📹 Initializing camera (index: {camera_index})...")
            self.cap = cv2.VideoCapture(camera_index)
            
            if not self.cap.isOpened():
                raise Exception(f"Could not open camera {camera_index}")
            
            # Set camera properties for better performance
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            
            # Get actual camera properties
            width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = int(self.cap.get(cv2.CAP_PROP_FPS))
            
            print(f"✅ Camera initialized: {width}x{height} @ {fps} FPS")
            return True
            
        except Exception as e:
            print(f"❌ Error initializing camera: {e}")
            return False
    
    def draw_detections(self, frame, detections):
        """Draw bounding boxes and labels on the frame"""
        annotated_frame = frame.copy()
        
        for detection in detections:
            # Extract detection data
            x1, y1, x2, y2 = detection['bbox']
            confidence = detection['confidence']
            class_id = detection['class_id']
            
            # Get class info
            class_name = CLASS_NAMES.get(class_id, f"unknown_{class_id}")
            display_name = CLASS_DISPLAY_NAMES.get(class_id, f"Unknown Issue {class_id}")
            color = CLASS_COLORS.get(class_id, (0, 255, 0))
            
            # Draw bounding box
            cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
            
            # Draw label background
            label = f"{display_name}: {confidence:.2f}"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
            cv2.rectangle(annotated_frame, (int(x1), int(y1) - label_size[1] - 10), 
                         (int(x1) + label_size[0], int(y1)), color, -1)
            
            # Draw label text
            cv2.putText(annotated_frame, label, (int(x1), int(y1) - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        return annotated_frame
    
    def process_frame(self, frame):
        """Process a single frame with YOLOv8"""
        try:
            # Run YOLOv8 inference
            results = self.model(frame, conf=self.confidence_threshold, verbose=False)
            
            detections = []
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Extract box coordinates
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
            print(f"❌ Error processing frame: {e}")
            return []
    
    def run_detection(self):
        """Main detection loop"""
        if not self.initialize_camera():
            return
        
        print("\n🎯 Starting real-time YOLOv8 detection...")
        print("📋 Controls:")
        print("   - Press 'q' to quit")
        print("   - Press 's' to save current frame")
        print("   - Press 'c' to change confidence threshold")
        print("   - Press 'h' to show/hide help")
        
        frame_count = 0
        show_help = True
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    print("❌ Failed to read frame from camera")
                    break
                
                frame_count += 1
                
                # Process frame with YOLOv8
                detections = self.process_frame(frame)
                
                # Draw detections on frame
                annotated_frame = self.draw_detections(frame, detections)
                
                # Add info overlay
                self.add_info_overlay(annotated_frame, detections, frame_count, show_help)
                
                # Display frame
                cv2.imshow('YOLOv8 Motorcycle Diagnostic - Real-time Detection', annotated_frame)
                
                # Handle key presses
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s'):
                    self.save_frame(annotated_frame, detections)
                elif key == ord('c'):
                    self.change_confidence()
                elif key == ord('h'):
                    show_help = not show_help
                
        except KeyboardInterrupt:
            print("\n🛑 Detection stopped by user")
        except Exception as e:
            print(f"❌ Error in detection loop: {e}")
        finally:
            self.cleanup()
    
    def add_info_overlay(self, frame, detections, frame_count, show_help):
        """Add information overlay to the frame"""
        height, width = frame.shape[:2]
        
        # Detection info
        info_text = f"Detections: {len(detections)} | Confidence: {self.confidence_threshold:.2f} | Frame: {frame_count}"
        cv2.putText(frame, info_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Help text
        if show_help:
            help_lines = [
                "Controls:",
                "Q - Quit",
                "S - Save frame", 
                "C - Change confidence",
                "H - Hide help"
            ]
            
            y_offset = height - 120
            for i, line in enumerate(help_lines):
                cv2.putText(frame, line, (10, y_offset + i * 20), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Detection details
        if detections:
            y_offset = 60
            for i, det in enumerate(detections[:5]):  # Show max 5 detections
                class_name = CLASS_DISPLAY_NAMES.get(det['class_id'], f"Unknown {det['class_id']}")
                text = f"{i+1}. {class_name}: {det['confidence']:.2f}"
                cv2.putText(frame, text, (10, y_offset + i * 25), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    
    def save_frame(self, frame, detections):
        """Save current frame with detections"""
        filename = f"detection_result_{len(detections)}_issues.jpg"
        cv2.imwrite(filename, frame)
        print(f"💾 Frame saved as: {filename}")
    
    def change_confidence(self):
        """Change confidence threshold"""
        try:
            new_conf = float(input(f"\nEnter new confidence threshold (current: {self.confidence_threshold:.2f}): "))
            if 0.0 <= new_conf <= 1.0:
                self.confidence_threshold = new_conf
                print(f"✅ Confidence threshold updated to: {self.confidence_threshold:.2f}")
            else:
                print("❌ Confidence must be between 0.0 and 1.0")
        except ValueError:
            print("❌ Invalid input")
    
    def cleanup(self):
        """Clean up resources"""
        if self.cap:
            self.cap.release()
        cv2.destroyAllWindows()
        print("🧹 Cleanup completed")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Real-time YOLOv8 Motorcycle Diagnostic Detector')
    parser.add_argument('--model', type=str, default='runs/detect/train3/weights/best.pt',
                       help='Path to YOLOv8 model file')
    parser.add_argument('--confidence', type=float, default=0.3,
                       help='Confidence threshold for detections (0.0-1.0)')
    parser.add_argument('--camera', type=int, default=0,
                       help='Camera index (0 for default camera)')
    
    args = parser.parse_args()
    
    print("🤖 YOLOv8 Motorcycle Diagnostic - Real-time Detector")
    print("=" * 60)
    
    # Check if model file exists
    if not os.path.exists(args.model):
        print(f"❌ Model file not found: {args.model}")
        print("💡 Make sure you're running this from the yolo-motorcycle-diagnostic-training directory")
        return
    
    # Create detector instance
    detector = RealTimeYOLODetector(args.model, args.confidence)
    
    # Run detection
    detector.run_detection()

if __name__ == "__main__":
    main()
