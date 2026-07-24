#!/usr/bin/env python3
"""
No Camera YOLOv8 Detector - Test Model Without Camera
Uses sample images or webcam simulation for testing
"""

import cv2
import numpy as np
import os
import sys
import time
import threading

class NoCameraDetector:
    def __init__(self):
        """Initialize no-camera detector"""
        self.model = None
        self.model_ready = False
        self.confidence = 0.2
        self.sample_images = []
        self.current_image_index = 0
        
    def load_model(self):
        """Load YOLOv8 model"""
        try:
            print("🔄 Loading YOLOv8 model...")
            from ultralytics import YOLO
            
            model_path = "runs/detect/train3/weights/best.pt"
            if os.path.exists(model_path):
                self.model = YOLO(model_path)
                self.model_ready = True
                print("✅ Model loaded successfully!")
                return True
            else:
                print("❌ Model file not found")
                return False
                
        except Exception as e:
            print(f"❌ Model loading failed: {e}")
            return False
    
    def create_sample_images(self):
        """Create sample test images"""
        print("🎨 Creating sample test images...")
        
        # Create different colored rectangles as test images
        colors = [
            (255, 0, 0),    # Red
            (0, 255, 0),    # Green  
            (0, 0, 255),    # Blue
            (255, 255, 0),  # Yellow
            (255, 0, 255),  # Magenta
            (0, 255, 255),  # Cyan
        ]
        
        self.sample_images = []
        for i, color in enumerate(colors):
            # Create 320x240 image
            img = np.full((240, 320, 3), color, dtype=np.uint8)
            
            # Add some text
            cv2.putText(img, f"Sample {i+1}", (50, 120), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            
            self.sample_images.append(img)
        
        print(f"✅ Created {len(self.sample_images)} sample images")
    
    def process_image(self, image):
        """Process image with YOLOv8"""
        if not self.model_ready or self.model is None:
            return []
        
        try:
            # Resize for faster processing
            small_image = cv2.resize(image, (160, 120))
            
            # Run YOLOv8
            results = self.model(small_image, conf=self.confidence, verbose=False, device='cpu')
            
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        # Scale back to original size
                        x1 *= 2; y1 *= 2; x2 *= 2; y2 *= 2
                        
                        detections.append({
                            'bbox': [x1, y1, x2, y2],
                            'confidence': float(box.conf[0].cpu().numpy()),
                            'class_id': int(box.cls[0].cpu().numpy())
                        })
            
            return detections
            
        except Exception as e:
            return []
    
    def draw_detections(self, image, detections):
        """Draw detections on image"""
        colors = [(0, 255, 255), (0, 165, 255), (0, 0, 255), (128, 0, 128)]
        names = ["Headlights", "Mirror", "Tire", "Oil"]
        
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            class_id = det['class_id']
            confidence = det['confidence']
            
            color = colors[class_id % len(colors)]
            cv2.rectangle(image, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
            
            label = f"{names[class_id % len(names)]}: {confidence:.2f}"
            cv2.putText(image, label, (int(x1), int(y1) - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
    
    def add_overlay(self, image, detections, frame_count):
        """Add status overlay"""
        if self.model_ready:
            status = f"YOLOv8: {len(detections)} detections"
            color = (0, 255, 0)
        else:
            status = "Loading model..."
            color = (0, 255, 255)
        
        cv2.putText(image, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        cv2.putText(image, f"Frame: {frame_count}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
        cv2.putText(image, "N=Next Image, Q=Quit", (10, image.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
    
    def run(self):
        """Run no-camera detector"""
        print("🎯 NO CAMERA YOLOv8 DETECTOR")
        print("=" * 35)
        print("🚀 Testing YOLOv8 without camera")
        print("🎨 Using sample images")
        print("⚡ Safe testing mode")
        print()
        
        # Load model
        if not self.load_model():
            print("❌ Cannot proceed without model")
            return
        
        # Create sample images
        self.create_sample_images()
        
        print("🎯 Starting detection test...")
        print("Press 'N' for next image, 'Q' to quit")
        print()
        
        frame_count = 0
        
        try:
            while True:
                # Get current sample image
                current_image = self.sample_images[self.current_image_index].copy()
                
                # Process with YOLOv8
                detections = self.process_image(current_image)
                
                # Draw detections
                self.draw_detections(current_image, detections)
                
                # Add overlay
                self.add_overlay(current_image, detections, frame_count)
                
                # Show image
                cv2.imshow('No Camera YOLOv8 Test', current_image)
                
                # Handle keys
                key = cv2.waitKey(1000) & 0xFF  # 1 second delay
                
                if key == ord('q') or key == ord('Q'):
                    break
                elif key == ord('n') or key == ord('N'):
                    self.current_image_index = (self.current_image_index + 1) % len(self.sample_images)
                    print(f"🔄 Switched to sample image {self.current_image_index + 1}")
                
                frame_count += 1
                
        except KeyboardInterrupt:
            print("\n🛑 Stopped")
        finally:
            cv2.destroyAllWindows()
            print(f"🧹 Test completed. Processed {frame_count} frames")

def main():
    detector = NoCameraDetector()
    detector.run()

if __name__ == "__main__":
    main()
