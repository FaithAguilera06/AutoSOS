#!/usr/bin/env python3
"""
Standalone YOLOv8 Motorcycle Diagnostic Test App
Real-time camera detection with bounding boxes and labels
"""

import cv2
import requests
import json
import base64
import numpy as np
from typing import Dict, List, Any
import time

class YOLOv8MotorcycleTester:
    def __init__(self, service_url: str = "https://autosos-yolo.onrender.com"):
        self.service_url = service_url
        self.cap = None
        self.detection_history = []
        
        # Test the service connection
        self.test_connection()
    
    def test_connection(self):
        """Test connection to YOLOv8 service"""
        try:
            response = requests.get(f"{self.service_url}/health", timeout=10)
            if response.status_code == 200:
                print("SUCCESS: YOLOv8 Service Connected Successfully!")
                health_data = response.json()
                print(f"Service Status: {health_data.get('status', 'unknown')}")
                print(f"Model: {health_data.get('model_name', 'unknown')}")
            else:
                print(f"WARNING: Service responded with status: {response.status_code}")
        except Exception as e:
            print(f"ERROR: Failed to connect to YOLOv8 service: {e}")
            print("Make sure the service is running and accessible")
    
    def encode_image_to_base64(self, image: np.ndarray) -> str:
        """Convert OpenCV image to base64 string"""
        _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 85])
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        return image_base64
    
    def detect_objects(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Send image to YOLOv8 service for object detection"""
        try:
            # Encode image to base64
            image_base64 = self.encode_image_to_base64(image)
            
            # Prepare request
            payload = {
                "image": image_base64,
                "confidence_threshold": 0.5,
                "return_image": False
            }
            
            # Send request to YOLOv8 service
            response = requests.post(
                f"{self.service_url}/detect-base64",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('detections', [])
            else:
                print(f"ERROR: Detection failed: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"ERROR: Error during detection: {e}")
            return []
    
    def draw_detections(self, image: np.ndarray, detections: List[Dict[str, Any]]) -> np.ndarray:
        """Draw bounding boxes and labels on the image"""
        result_image = image.copy()
        
        for detection in detections:
            # Extract detection data
            bbox = detection.get('bbox', [])
            confidence = detection.get('confidence', 0.0)
            class_name = detection.get('class_name', 'Unknown')
            class_display_name = detection.get('class_display_name', class_name)
            
            if len(bbox) == 4:
                x1, y1, x2, y2 = map(int, bbox)
                
                # Choose color based on class
                color = self.get_class_color(class_name)
                
                # Draw bounding box
                cv2.rectangle(result_image, (x1, y1), (x2, y2), color, 2)
                
                # Prepare label text
                label = f"{class_display_name}: {confidence:.2f}"
                
                # Get text size for background
                (text_width, text_height), baseline = cv2.getTextSize(
                    label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
                )
                
                # Draw label background
                cv2.rectangle(
                    result_image,
                    (x1, y1 - text_height - 10),
                    (x1 + text_width, y1),
                    color,
                    -1
                )
                
                # Draw label text
                cv2.putText(
                    result_image,
                    label,
                    (x1, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (255, 255, 255),
                    2
                )
        
        return result_image
    
    def get_class_color(self, class_name: str) -> tuple:
        """Get color for different motorcycle diagnostic classes"""
        color_map = {
            'engine_problem': (0, 0, 255),      # Red
            'brake_issue': (0, 165, 255),       # Orange
            'tire_problem': (0, 255, 255),      # Yellow
            'electrical_issue': (255, 0, 255),  # Magenta
            'chain_problem': (255, 0, 0),       # Blue
            'oil_leak': (0, 255, 0),            # Green
            'exhaust_issue': (128, 0, 128),     # Purple
            'suspension_problem': (255, 192, 203), # Pink
        }
        return color_map.get(class_name.lower(), (128, 128, 128))  # Gray default
    
    def add_info_overlay(self, image: np.ndarray, detections: List[Dict[str, Any]], fps: float) -> np.ndarray:
        """Add information overlay to the image"""
        overlay = image.copy()
        
        # Semi-transparent background for info
        cv2.rectangle(overlay, (10, 10), (400, 120), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, image, 0.3, 0, image)
        
        # Add text information
        y_offset = 30
        cv2.putText(image, f"YOLOv8 Motorcycle Diagnostic", (20, y_offset), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        y_offset += 25
        
        cv2.putText(image, f"FPS: {fps:.1f}", (20, y_offset), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        y_offset += 20
        
        cv2.putText(image, f"Detections: {len(detections)}", (20, y_offset), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        y_offset += 20
        
        if detections:
            cv2.putText(image, f"Latest: {detections[0].get('class_display_name', 'Unknown')}", 
                       (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        return image
    
    def run_camera_test(self, camera_index: int = 0, resolution: tuple = (1280, 720)):
        """Run real-time camera test with YOLOv8 detection"""
        print("Starting YOLOv8 Motorcycle Diagnostic Camera Test")
        print("Press 'q' to quit, 's' to save image, 'r' to reset detections")
        
        # Initialize camera
        self.cap = cv2.VideoCapture(camera_index)
        if not self.cap.isOpened():
            print(f"ERROR: Could not open camera {camera_index}")
            return
        
        # Set camera resolution
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, resolution[0])
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, resolution[1])
        
        # Get actual resolution
        actual_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"Camera Resolution: {actual_width}x{actual_height}")
        
        # Performance tracking
        frame_count = 0
        start_time = time.time()
        last_detection_time = 0
        detection_interval = 0.5  # Run detection every 0.5 seconds
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    print("ERROR: Could not read frame from camera")
                    break
                
                current_time = time.time()
                
                # Run detection at specified intervals
                if current_time - last_detection_time >= detection_interval:
                    detections = self.detect_objects(frame)
                    last_detection_time = current_time
                    
                    if detections:
                        self.detection_history.extend(detections)
                        print(f"Detected {len(detections)} objects")
                        for det in detections:
                            print(f"   - {det.get('class_display_name', 'Unknown')}: {det.get('confidence', 0):.2f}")
                else:
                    # Use last detections
                    detections = self.detection_history[-10:] if self.detection_history else []
                
                # Draw detections on frame
                frame_with_detections = self.draw_detections(frame, detections)
                
                # Calculate FPS
                frame_count += 1
                if frame_count % 30 == 0:  # Update FPS every 30 frames
                    fps = 30 / (current_time - start_time)
                    start_time = current_time
                else:
                    fps = 30  # Default FPS
                
                # Add info overlay
                frame_with_info = self.add_info_overlay(frame_with_detections, detections, fps)
                
                # Display frame
                cv2.imshow('YOLOv8 Motorcycle Diagnostic', frame_with_info)
                
                # Handle key presses
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    print("Quitting...")
                    break
                elif key == ord('s'):
                    # Save current frame with detections
                    filename = f"motorcycle_detection_{int(time.time())}.jpg"
                    cv2.imwrite(filename, frame_with_detections)
                    print(f"Saved detection image: {filename}")
                elif key == ord('r'):
                    # Reset detection history
                    self.detection_history = []
                    print("Reset detection history")
        
        except KeyboardInterrupt:
            print("\nInterrupted by user")
        
        finally:
            # Cleanup
            if self.cap:
                self.cap.release()
            cv2.destroyAllWindows()
            print("Cleanup completed")

def main():
    """Main function to run the YOLOv8 test"""
    print("YOLOv8 Motorcycle Diagnostic Test App")
    print("=" * 50)
    
    # Initialize tester
    tester = YOLOv8MotorcycleTester()
    
    # Run camera test
    tester.run_camera_test(camera_index=0, resolution=(1280, 720))

if __name__ == "__main__":
    main()
