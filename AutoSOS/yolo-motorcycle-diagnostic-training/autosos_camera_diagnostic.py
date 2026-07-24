#!/usr/bin/env python3
"""
AutoSOS Camera Diagnostic - 720p Mode
Integrated with AutoSOS backend services and Supabase
"""

import cv2
import numpy as np
import os
import sys
import time
import threading
import platform
import requests
import base64
import json
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# AutoSOS-specific class info for motorcycle diagnostics
CLASS_COLORS = [
    (0, 255, 255),    # Broken Headlights/Tail Lights - Yellow
    (0, 165, 255),    # Broken Side Mirror - Orange  
    (0, 0, 255),      # Flat Tire - Red
    (128, 0, 128),    # Oil Leak - Purple
]

CLASS_NAMES = [
    "Broken Headlights/Tail Lights", 
    "Broken Side Mirror", 
    "Flat Tire", 
    "Oil Leak"
]

DIAGNOSTIC_LABELS = [
    "Check Headlights & Tail Lights", 
    "Inspect Side Mirror", 
    "Flat Tire - Immediate Attention", 
    "Oil Leak - Critical Issue"
]

SEVERITY_LEVELS = [
    "Medium",  # Headlights
    "Low",     # Mirror
    "High",    # Flat Tire
    "Critical" # Oil Leak
]

class AutoSOSCameraDiagnostic:
    def __init__(self):
        """Initialize AutoSOS camera diagnostic"""
        self.cap = None
        self.model = None
        self.model_ready = False
        self.confidence = 0.2
        self.frame_skip = 1
        
        # Backend service URLs
        self.yolo_backend_url = "http://localhost:8000"
        self.facenet_backend_url = "http://localhost:8001"
        
        # AutoSOS settings
        self.is_windows = platform.system() == "Windows"
        self.backend_connected = False
        self.detection_history = []
        self.max_history = 50
        
        print(f"🖥️ Platform: {platform.system()}")
        print(f"🌐 AutoSOS Backend: {self.yolo_backend_url}")
        
    def check_backend_connection(self):
        """Check if AutoSOS backend services are running"""
        try:
            response = requests.get(f"{self.yolo_backend_url}/health", timeout=2)
            if response.status_code == 200:
                self.backend_connected = True
                print("✅ AutoSOS YOLOv8 backend connected")
                return True
        except:
            pass
        
        print("⚠️ AutoSOS backend not available - using local model")
        return False
    
    def start_camera_autosos(self):
        """Start camera with AutoSOS-optimized settings"""
        try:
            print("📹 Starting AutoSOS camera diagnostic (720p mode)...")
            print("⏳ Initializing camera for Windows...")
            
            # Windows-specific camera initialization
            if self.is_windows:
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
            print("🔄 Loading AutoSOS YOLOv8 model...")
            from ultralytics import YOLO
            
            model_path = "runs/detect/train3/weights/best.pt"
            if os.path.exists(model_path):
                self.model = YOLO(model_path)
                self.model_ready = True
                print("✅ AutoSOS YOLOv8 model loaded successfully!")
            else:
                print("⚠️ Model file not found - using backend service only")
                
        except Exception as e:
            print(f"⚠️ Model loading failed: {e}")
    
    def send_to_backend(self, frame):
        """Send frame to AutoSOS backend for processing"""
        if not self.backend_connected:
            return []
        
        try:
            # Encode frame to base64
            _, buffer = cv2.imencode('.jpg', frame)
            image_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Send to backend
            payload = {
                "image_data": image_base64,
                "confidence_threshold": self.confidence,
                "return_image": False
            }
            
            response = requests.post(
                f"{self.yolo_backend_url}/predict-base64",
                json=payload,
                timeout=5
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('detections', [])
            else:
                print(f"⚠️ Backend error: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"⚠️ Backend communication error: {e}")
            return []
    
    def process_frame_autosos(self, frame):
        """Process frame with AutoSOS YOLOv8"""
        detections = []
        
        # Try backend first if connected
        if self.backend_connected:
            detections = self.send_to_backend(frame)
            if detections:
                return detections
        
        # Fallback to local model
        if not self.model_ready or self.model is None:
            return []
        
        try:
            # Resize for processing
            processing_frame = cv2.resize(frame, (640, 360))
            
            # Run YOLOv8
            results = self.model(processing_frame, conf=self.confidence, verbose=False, device='cpu')
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
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
                            'class_id': class_id,
                            'class_name': CLASS_NAMES[class_id] if class_id < len(CLASS_NAMES) else f"Unknown_{class_id}",
                            'severity': SEVERITY_LEVELS[class_id] if class_id < len(SEVERITY_LEVELS) else "Unknown"
                        })
            
            return detections
            
        except Exception as e:
            return []
    
    def draw_detections_autosos(self, frame, detections):
        """Draw AutoSOS detections with diagnostic information"""
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            class_id = det['class_id']
            confidence = det['confidence']
            class_name = det.get('class_name', CLASS_NAMES[class_id % len(CLASS_NAMES)])
            severity = det.get('severity', SEVERITY_LEVELS[class_id % len(SEVERITY_LEVELS)])
            
            # Get color based on severity
            if severity == "Critical":
                color = (0, 0, 255)  # Red
            elif severity == "High":
                color = (0, 165, 255)  # Orange
            elif severity == "Medium":
                color = (0, 255, 255)  # Yellow
            else:
                color = (0, 255, 0)  # Green
            
            # Draw bounding box with thickness based on severity
            thickness = 4 if severity in ["Critical", "High"] else 2
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, thickness)
            
            # Prepare labels
            label = f"{class_name}: {confidence:.2f}"
            severity_text = f"Severity: {severity}"
            
            # Get text size
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.6
            thickness_text = 2
            
            (label_w, label_h), _ = cv2.getTextSize(label, font, font_scale, thickness_text)
            (severity_w, severity_h), _ = cv2.getTextSize(severity_text, font, font_scale, thickness_text)
            
            # Draw background rectangles
            cv2.rectangle(frame, (int(x1), int(y1) - label_h - severity_h - 20), 
                         (int(x1) + max(label_w, severity_w) + 10, int(y1)), color, -1)
            
            # Draw text
            cv2.putText(frame, label, (int(x1) + 5, int(y1) - severity_h - 10), 
                       font, font_scale, (255, 255, 255), thickness_text)
            cv2.putText(frame, severity_text, (int(x1) + 5, int(y1) - 5), 
                       font, font_scale, (255, 255, 255), thickness_text)
    
    def add_autosos_overlay(self, frame, detections, frame_count, fps):
        """Add AutoSOS status overlay"""
        # Status text
        if self.backend_connected:
            status = f"AutoSOS Backend: {len(detections)} detections"
            status_color = (0, 255, 0)
        elif self.model_ready:
            status = f"Local Model: {len(detections)} detections"
            status_color = (0, 255, 255)
        else:
            status = "Loading AutoSOS model..."
            status_color = (255, 0, 0)
        
        # AutoSOS branding
        autosos_text = "AutoSOS Motorcycle Diagnostic - 720p"
        
        # FPS counter
        fps_text = f"FPS: {fps:.1f}"
        
        # Instructions
        instructions = "Q=Quit | S=Save Frame | C=Change Confidence | R=Report Issue"
        
        # Draw overlay background
        overlay_height = 120
        overlay = np.zeros((overlay_height, frame.shape[1], 3), dtype=np.uint8)
        overlay[:] = (0, 0, 0)  # Black background
        
        # Combine frame with overlay
        result_frame = np.vstack([overlay, frame])
        
        # Draw text on overlay
        cv2.putText(result_frame, status, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)
        cv2.putText(result_frame, autosos_text, (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(result_frame, fps_text, (10, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(result_frame, instructions, (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
        
        return result_frame
    
    def save_detection_report(self, detections, frame):
        """Save detection report for AutoSOS"""
        if not detections:
            return
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"autosos_detection_{timestamp}.jpg"
        
        # Save frame with detections
        cv2.imwrite(filename, frame)
        
        # Create report
        report = {
            "timestamp": timestamp,
            "detections": detections,
            "total_issues": len(detections),
            "critical_issues": len([d for d in detections if d.get('severity') == 'Critical']),
            "high_issues": len([d for d in detections if d.get('severity') == 'High']),
            "image_file": filename
        }
        
        # Save JSON report
        report_filename = f"autosos_report_{timestamp}.json"
        with open(report_filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"📋 AutoSOS report saved: {report_filename}")
        print(f"📸 Detection image saved: {filename}")
    
    def run_autosos_diagnostic(self):
        """Main AutoSOS camera diagnostic loop"""
        print("🖥️ AUTOSOS CAMERA DIAGNOSTIC - 720P MODE")
        print("=" * 50)
        print("🚀 Optimized for Windows")
        print("📹 Resolution: 1280x720 (720p)")
        print("🏍️ Motorcycle diagnostic detection")
        print("⚡ Real-time YOLOv8 inference")
        print("🌐 Integrated with AutoSOS backend")
        print()
        
        # Check backend connection
        self.check_backend_connection()
        
        # Start camera
        if not self.start_camera_autosos():
            print("❌ Cannot start camera. Try closing other camera applications.")
            return
        
        # Load model in background
        model_thread = threading.Thread(target=self.load_model_background)
        model_thread.daemon = True
        model_thread.start()
        
        print("🎯 Starting AutoSOS camera diagnostic...")
        print("Controls: Q=Quit, S=Save Frame, C=Change Confidence, R=Report Issue")
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
                
                # Process frame
                detections = []
                if frame_count % self.frame_skip == 0:
                    detections = self.process_frame_autosos(frame)
                    processed_frames += 1
                    
                    # Add to history
                    if detections:
                        self.detection_history.extend(detections)
                        if len(self.detection_history) > self.max_history:
                            self.detection_history = self.detection_history[-self.max_history:]
                
                # Draw detections
                self.draw_detections_autosos(frame, detections)
                
                # Add AutoSOS overlay
                display_frame = self.add_autosos_overlay(frame, detections, frame_count, current_fps)
                
                # Show frame
                cv2.imshow('AutoSOS Camera Diagnostic - 720p', display_frame)
                
                # Handle keys
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q') or key == ord('Q'):
                    break
                elif key == ord('s') or key == ord('S'):
                    if detections:
                        self.save_detection_report(detections, frame)
                elif key == ord('c') or key == ord('C'):
                    # Cycle confidence threshold
                    if self.confidence == 0.3:
                        self.confidence = 0.5
                    elif self.confidence == 0.5:
                        self.confidence = 0.7
                    else:
                        self.confidence = 0.2
                    print(f"🎯 Confidence threshold: {self.confidence}")
                elif key == ord('r') or key == ord('R'):
                    # Generate comprehensive report
                    if self.detection_history:
                        self.save_detection_report(self.detection_history, frame)
                        print("📋 Comprehensive AutoSOS report generated")
                
        except KeyboardInterrupt:
            print("\n🛑 Stopped by user")
        finally:
            if self.cap:
                self.cap.release()
            cv2.destroyAllWindows()
            print(f"🧹 Processed {processed_frames} frames at 720p")
            print(f"📊 Total detections: {len(self.detection_history)}")

def main():
    """Main function"""
    diagnostic = AutoSOSCameraDiagnostic()
    diagnostic.run_autosos_diagnostic()

if __name__ == "__main__":
    main()
