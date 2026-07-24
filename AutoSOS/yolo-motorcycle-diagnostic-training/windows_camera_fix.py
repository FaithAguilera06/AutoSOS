#!/usr/bin/env python3
"""
Windows Camera Fix - Test and Fix Camera Issues
Diagnoses and fixes common Windows camera problems
"""

import cv2
import platform
import time
import os

def test_windows_camera():
    """Test Windows camera with different backends"""
    print("🖥️ WINDOWS CAMERA DIAGNOSTIC")
    print("=" * 35)
    print(f"Platform: {platform.system()} {platform.release()}")
    print()
    
    # Test different camera backends
    backends = [
        (cv2.CAP_DSHOW, "DirectShow (Windows default)"),
        (cv2.CAP_MSMF, "Media Foundation"),
        (cv2.CAP_ANY, "Any available"),
    ]
    
    working_cameras = []
    
    for backend, name in backends:
        print(f"🔍 Testing {name}...")
        
        try:
            cap = cv2.VideoCapture(0, backend)
            
            if cap.isOpened():
                print(f"   ✅ {name} - Camera opened")
                
                # Test frame reading
                ret, frame = cap.read()
                if ret and frame is not None:
                    height, width = frame.shape[:2]
                    print(f"   ✅ Frame read: {width}x{height}")
                    working_cameras.append((backend, name, width, height))
                else:
                    print(f"   ❌ {name} - Cannot read frames")
                
                cap.release()
            else:
                print(f"   ❌ {name} - Cannot open camera")
                
        except Exception as e:
            print(f"   ❌ {name} - Error: {e}")
        
        time.sleep(0.5)  # Small delay between tests
    
    print()
    print("📊 RESULTS:")
    
    if working_cameras:
        print("✅ Working camera configurations:")
        for backend, name, width, height in working_cameras:
            print(f"   • {name}: {width}x{height}")
        
        # Recommend best option
        best_backend, best_name, best_width, best_height = working_cameras[0]
        print(f"\n🎯 Recommended: {best_name}")
        print(f"   Backend code: {best_backend}")
        print(f"   Resolution: {best_width}x{best_height}")
        
        return best_backend, best_name
        
    else:
        print("❌ No working camera configurations found!")
        print("\n💡 Troubleshooting tips:")
        print("   • Close all camera applications (Zoom, Skype, Teams)")
        print("   • Check camera permissions in Windows Settings")
        print("   • Try unplugging and reconnecting camera")
        print("   • Restart your computer")
        print("   • Update camera drivers")
        
        return None, None

def create_optimized_detector(backend, backend_name):
    """Create detector with working backend"""
    print(f"\n🔧 Creating optimized detector with {backend_name}...")
    
    detector_code = f'''#!/usr/bin/env python3
"""
Optimized Windows Detector - Using {backend_name}
"""

import cv2
import numpy as np
import os
import time
import threading

class OptimizedDetector:
    def __init__(self):
        self.cap = None
        self.model = None
        self.model_ready = False
        self.confidence = 0.3
        self.backend = {backend}  # {backend_name}
        
    def start_camera(self):
        """Start camera with optimized backend"""
        try:
            print("📹 Starting camera with {backend_name}...")
            self.cap = cv2.VideoCapture(0, self.backend)
            
            if not self.cap.isOpened():
                print("❌ Camera failed to open")
                return False
            
            # Set 720p resolution
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            
            # Test frame
            ret, frame = self.cap.read()
            if not ret:
                print("❌ Cannot read frames")
                return False
            
            print("✅ Camera ready: 1280x720")
            return True
            
        except Exception as e:
            print(f"❌ Camera error: {{e}}")
            return False
    
    def load_model(self):
        """Load YOLOv8 model"""
        try:
            from ultralytics import YOLO
            model_path = "runs/detect/train3/weights/best.pt"
            if os.path.exists(model_path):
                self.model = YOLO(model_path)
                self.model_ready = True
                print("✅ Model loaded")
        except Exception as e:
            print(f"⚠️ Model error: {{e}}")
    
    def run(self):
        """Run detector"""
        if not self.start_camera():
            return
        
        threading.Thread(target=self.load_model, daemon=True).start()
        
        print("🎯 Starting detection...")
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    break
                
                # Process with YOLOv8 if ready
                if self.model_ready and self.model:
                    results = self.model(frame, conf=self.confidence, verbose=False)
                    for result in results:
                        boxes = result.boxes
                        if boxes is not None:
                            for box in boxes:
                                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                
                # Add status
                status = "YOLOv8 Ready" if self.model_ready else "Loading..."
                cv2.putText(frame, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                cv2.putText(frame, f"Backend: {backend_name}", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
                cv2.imshow('Optimized Detector', frame)
                
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                    
        except KeyboardInterrupt:
            print("\\n🛑 Stopped")
        finally:
            if self.cap:
                self.cap.release()
            cv2.destroyAllWindows()

if __name__ == "__main__":
    detector = OptimizedDetector()
    detector.run()
'''
    
    with open("optimized_detector.py", "w") as f:
        f.write(detector_code)
    
    print("✅ Created optimized_detector.py")
    print("   Run with: python optimized_detector.py")

def main():
    """Main function"""
    backend, backend_name = test_windows_camera()
    
    if backend is not None:
        create_optimized_detector(backend, backend_name)
        print(f"\n🎯 Use optimized_detector.py with {backend_name}")
    else:
        print("\n❌ Cannot create optimized detector - no working camera found")

if __name__ == "__main__":
    main()
