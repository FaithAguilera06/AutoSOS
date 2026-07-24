#!/usr/bin/env python3
"""
Windows 720p YOLOv8 Detector - Optimized for Windows
High resolution with proper motorcycle diagnostic labels
"""

import cv2
import numpy as np
import os
import sys
import time
import threading
import platform

# Windows-optimized class info for motorcycle diagnostics
CLASS_COLORS = [
    (0, 255, 255),    # Headlights - Yellow
    (0, 165, 255),    # Mirror - Orange  
    (0, 0, 255),      # Tire - Red
    (128, 0, 128),    # Oil - Purple
    (255, 0, 0),      # Brake - Blue
    (0, 255, 0),      # Chain - Green
    (255, 255, 0),    # Exhaust - Cyan
    (255, 0, 255)     # Battery - Magenta
]

CLASS_NAMES = [
    "Headlights", "Mirror", "Tire", "Oil", 
    "Brake", "Chain", "Exhaust", "Battery"
]

DIAGNOSTIC_LABELS = [
    "Check Headlights", "Check Mirror", "Flat Tire", "Low Oil",
    "Brake Issue", "Chain Loose", "Exhaust Problem", "Battery Low"
]

class WindowsDetector:
    def __init__(self):
        """Initialize Windows-optimized detector"""
        self.cap = None
        self.model = None
        self.model_ready = False
        self.confidence = 0.2
        self.frame_skip = 1  # Process every frame for 15 FPS real-time detection
        
        # Windows-specific settings
        self.is_windows = platform.system() == "Windows"
        print(f"🖥️ Platform: {platform.system()}")
        
    def start_camera_windows(self):
        """Start camera with Windows-optimized settings"""
        try:
            print("📹 Starting camera (Windows 720p mode)...")
            print("⏳ Initializing camera for Windows...")
            
            # Windows-specific camera initialization
            if self.is_windows:
                # Try DirectShow backend first (Windows default)
                self.cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
                print("   Trying DirectShow backend...")
            else:
                self.cap = cv2.VideoCapture(0)
                print("   Trying default backend...")
            
            if not self.cap.isOpened():
                print("   DirectShow failed, trying default...")
                self.cap = cv2.VideoCapture(0)
            
            if not self.cap.isOpened():
                print("❌ Camera initialization failed")
                return False
            
            # Test camera with timeout
            print("   Testing camera access...")
            ret, test_frame = self.cap.read()
            if not ret or test_frame is None:
                print("❌ Camera not responding")
                self.cap.release()
                return False
            
            # Set 720p resolution
            print("   Setting 720p resolution...")
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            self.cap.set(cv2.CAP_PROP_FPS, 15)
            
            # Verify resolution
            actual_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            actual_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            actual_fps = int(self.cap.get(cv2.CAP_PROP_FPS))
            
            print(f"✅ Camera ready: {actual_width}x{actual_height} @ {actual_fps}fps")
            return True
            
        except Exception as e:
            print(f"❌ Camera error: {e}")
            return False
    
    def load_model_background(self):
        """Load YOLOv8 model in background thread"""
        try:
            print("🔄 Loading YOLOv8 model...")
            from ultralytics import YOLO
            
            model_path = "runs/detect/train3/weights/best.pt"
            if os.path.exists(model_path):
                self.model = YOLO(model_path)
                self.model_ready = True
                print("✅ YOLOv8 model loaded successfully!")
            else:
                print("⚠️ Model file not found - running camera only")
                
        except Exception as e:
            print(f"⚠️ Model loading failed: {e}")
    
    def process_frame_720p(self, frame):
        """Process 720p frame with YOLOv8"""
        if not self.model_ready or self.model is None:
            return []
        
        try:
            # Resize to 640x360 for faster processing while maintaining quality
            processing_frame = cv2.resize(frame, (640, 360))
            
            # Run YOLOv8 with optimized settings
            results = self.model(processing_frame, conf=self.confidence, verbose=False, device='cpu')
            
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Get coordinates
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        
                        # Scale coordinates back to 720p
                        scale_x = 1280 / 640
                        scale_y = 720 / 360
                        x1 *= scale_x
                        y1 *= scale_y
                        x2 *= scale_x
                        y2 *= scale_y
                        
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
    
    def draw_detections_720p(self, frame, detections):
        """Draw detections with proper motorcycle diagnostic labels"""
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            class_id = det['class_id']
            confidence = det['confidence']
            
            # Get color and labels
            color = CLASS_COLORS[class_id % len(CLASS_COLORS)]
            class_name = CLASS_NAMES[class_id % len(CLASS_NAMES)]
            diagnostic_label = DIAGNOSTIC_LABELS[class_id % len(DIAGNOSTIC_LABELS)]
            
            # Draw bounding box
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 3)
            
            # Prepare label text
            label = f"{class_name}: {confidence:.2f}"
            diagnostic_text = diagnostic_label
            
            # Get text size for background
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.7
            thickness = 2
            
            (label_w, label_h), _ = cv2.getTextSize(label, font, font_scale, thickness)
            (diag_w, diag_h), _ = cv2.getTextSize(diagnostic_text, font, font_scale, thickness)
            
            # Draw background rectangles
            cv2.rectangle(frame, (int(x1), int(y1) - label_h - 10), 
                         (int(x1) + label_w + 10, int(y1)), color, -1)
            cv2.rectangle(frame, (int(x1), int(y1) - label_h - diag_h - 20), 
                         (int(x1) + diag_w + 10, int(y1) - label_h - 10), color, -1)
            
            # Draw text
            cv2.putText(frame, label, (int(x1) + 5, int(y1) - 5), 
                       font, font_scale, (255, 255, 255), thickness)
            cv2.putText(frame, diagnostic_text, (int(x1) + 5, int(y1) - label_h - 15), 
                       font, font_scale, (255, 255, 255), thickness)
    
    def add_status_overlay(self, frame, detections, frame_count, fps):
        """Add comprehensive status overlay"""
        # Status text
        if self.model_ready:
            status = f"YOLOv8 Active: {len(detections)} detections"
            status_color = (0, 255, 0)
        else:
            status = "Loading YOLOv8 model..."
            status_color = (0, 255, 255)
        
        # Platform info
        platform_text = f"Windows 720p Mode"
        
        # FPS counter
        fps_text = f"FPS: {fps:.1f}"
        
        # Instructions
        instructions = "Q=Quit | S=Save Frame | C=Change Confidence"
        
        # Draw overlay background
        overlay_height = 120
        overlay = np.zeros((overlay_height, frame.shape[1], 3), dtype=np.uint8)
        overlay[:] = (0, 0, 0)  # Black background
        
        # Combine frame with overlay
        result_frame = np.vstack([overlay, frame])
        
        # Draw text on overlay
        cv2.putText(result_frame, status, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)
        cv2.putText(result_frame, platform_text, (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(result_frame, fps_text, (10, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(result_frame, instructions, (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
        
        return result_frame
    
    def run_windows_720p(self):
        """Main Windows 720p detection loop"""
        print("🖥️ WINDOWS 720P YOLOv8 DETECTOR")
        print("=" * 40)
        print("🚀 Optimized for Windows")
        print("📹 Resolution: 1280x720 (720p)")
        print("🏍️ Motorcycle diagnostic labels")
        print("⚡ High quality detection")
        print()
        
        # Start camera with Windows optimization
        if not self.start_camera_windows():
            print("❌ Cannot start camera. Try closing other camera applications.")
            return
        
        # Load model in background
        model_thread = threading.Thread(target=self.load_model_background)
        model_thread.daemon = True
        model_thread.start()
        
        print("🎯 Starting Windows 720p detection...")
        print("Controls: Q=Quit, S=Save Frame, C=Change Confidence")
        print()
        
        frame_count = 0
        processed_frames = 0
        fps_counter = 0
        fps_start_time = time.time()
        current_fps = 0
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    break
                
                frame_count += 1
                fps_counter += 1
                
                # Calculate FPS every 30 frames
                if fps_counter >= 30:
                    current_time = time.time()
                    current_fps = fps_counter / (current_time - fps_start_time)
                    fps_start_time = current_time
                    fps_counter = 0
                
                # Process every 2nd frame for 720p
                detections = []
                if frame_count % self.frame_skip == 0:
                    detections = self.process_frame_720p(frame)
                    processed_frames += 1
                
                # Draw detections
                self.draw_detections_720p(frame, detections)
                
                # Add status overlay
                display_frame = self.add_status_overlay(frame, detections, frame_count, current_fps)
                
                # Show frame
                cv2.imshow('Windows 720p YOLOv8 Detector', display_frame)
                
                # Handle keys
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q') or key == ord('Q'):
                    break
                elif key == ord('s') or key == ord('S'):
                    if detections:
                        filename = f"detection_frame_{frame_count}.jpg"
                        cv2.imwrite(filename, frame)
                        print(f"💾 Saved frame with {len(detections)} detections: {filename}")
                elif key == ord('c') or key == ord('C'):
                    # Cycle confidence threshold
                    if self.confidence == 0.3:
                        self.confidence = 0.5
                    elif self.confidence == 0.5:
                        self.confidence = 0.7
                    else:
                        self.confidence = 0.2
                    print(f"🎯 Confidence threshold: {self.confidence}")
                
        except KeyboardInterrupt:
            print("\n🛑 Stopped by user")
        finally:
            if self.cap:
                self.cap.release()
            cv2.destroyAllWindows()
            print(f"🧹 Processed {processed_frames} frames at 720p")

def main():
    """Main function"""
    detector = WindowsDetector()
    detector.run_windows_720p()

if __name__ == "__main__":
    main()
