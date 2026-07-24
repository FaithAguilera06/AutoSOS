#!/usr/bin/env python3
"""
AutoSOS Local YOLO v8 Host Service
Simple Python script to host YOLO v8 locally on your laptop
"""

import os
import sys
import socket
import subprocess
import time
from pathlib import Path

def get_local_ip():
    """Get the local IP address"""
    try:
        # Connect to a remote address to determine local IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
        return local_ip
    except Exception:
        return "127.0.0.1"

def check_python_packages():
    """Check if required Python packages are installed"""
    required_packages = ['fastapi', 'uvicorn', 'ultralytics', 'opencv-python', 'numpy', 'pillow']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    return missing_packages

def install_packages(packages):
    """Install missing packages"""
    print(f"📦 Installing missing packages: {', '.join(packages)}")
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install'] + packages)
        print("✅ Packages installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install packages: {e}")
        return False

def check_port_available(port):
    """Check if a port is available"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('', port))
            return True
        except socket.error:
            return False

def create_yolo_service_script(local_ip):
    """Create the YOLO service script"""
    script_content = f'''#!/usr/bin/env python3
"""
AutoSOS Local YOLO v8 Service
Automatically generated service script
"""

import os
import sys
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from ultralytics import YOLO
import io
from PIL import Image
import base64
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="AutoSOS Local YOLO Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variable
model = None

# Class names for motorcycle issues
CLASS_NAMES = {{
    0: "broken_headlights_tail_lights",
    1: "broken_side_mirror", 
    2: "flat_tire",
    3: "oil_leak"
}}

CLASS_DISPLAY_NAMES = {{
    0: "Broken Headlights/Tail Lights",
    1: "Broken Side Mirror",
    2: "Flat Tire", 
    3: "Oil Leak"
}}

CLASS_COLORS = {{
    0: (255, 255, 0),    # Yellow
    1: (255, 165, 0),    # Orange
    2: (0, 0, 255),      # Red
    3: (128, 0, 128)     # Purple
}}

@app.on_event("startup")
async def startup_event():
    global model
    try:
        # Try to load local model first
        model_path = os.path.join("yolo-motorcycle-diagnostic-training", "runs", "detect", "train3", "weights", "best.pt")
        if os.path.exists(model_path):
            model = YOLO(model_path)
            logger.info(f"✅ Loaded local model: {{model_path}}")
        else:
            # Fallback to default YOLOv8 model
            model = YOLO("yolov8n.pt")
            logger.info("✅ Loaded default YOLOv8 model")
    except Exception as e:
        logger.error(f"❌ Failed to load model: {{e}}")
        # Try default model as last resort
        try:
            model = YOLO("yolov8n.pt")
            logger.info("✅ Loaded default YOLOv8 model as fallback")
        except Exception as e2:
            logger.error(f"❌ Failed to load any model: {{e2}}")

@app.get("/health")
async def health_check():
    return {{
        "status": "healthy",
        "model_loaded": model is not None,
        "service_type": "local_yolo_host",
        "ip_address": "{local_ip}",
        "port": 8000,
        "classes": CLASS_DISPLAY_NAMES
    }}

@app.post("/predict")
async def predict_motorcycle_issues(
    file: UploadFile = File(...),
    confidence_threshold: float = 0.2,
    return_image: bool = False
):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # Read and process image
        image_bytes = await file.read()
        image = Image.open(io.BytesIOBLE(image_bytes))
        image_array = np.array(image)
        
        # Convert RGB to BGR for OpenCV
        if len(image_array.shape) == 3 and image_array.shape[2] == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        # Run inference
        start_time = time.time()
        results = model(image_array, conf=confidence_threshold)
        inference_time_ms = int((time.time() - start_time) * 1000)
        
        # Process results
        detections = []
        annotated_image = image_array.copy()
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    confidence = box.conf[0].cpu().numpy()
                    class_id = int(box.cls[0].cpu().numpy())
                    
                    class_name = CLASS_NAMES.get(class_id, f"unknown_{{class_id}}")
                    display_name = CLASS_DISPLAY_NAMES.get(class_id, f"Unknown Issue {{class_id}}")
                    color = CLASS_COLORS.get(class_id, (0, 255, 0))
                    
                    detection = {{
                        "class_id": class_id,
                        "class_name": class_name,
                        "display_name": display_name,
                        "confidence": float(confidence),
                        "bbox": {{
                            "x1": float(x1),
                            "y1": float(y1),
                            "x2": float(x2),
                            "y2": float(y2)
                        }},
                        "center": {{
                            "x": float((x1 + x2) / 2),
                            "y": float((y1 + y2) / 2)
                        }}
                    }}
                    detections.append(detection)
                    
                    if return_image:
                        cv2.rectangle(annotated_image, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                        label = f"{{display_name}}: {{confidence:.2f}}"
                        cv2.putText(annotated_image, label, (int(x1), int(y1) - 10), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        response = {{
            "success": True,
            "detections": detections,
            "total_detections": len(detections),
            "inference_time_ms": inference_time_ms,
            "image_info": {{
                "width": image_array.shape[1],
                "height": image_array.shape[0],
                "channels": image_array.shape[2] if len(image_array.shape) == 3 else 1
            }},
            "confidence_threshold": confidence_threshold
        }}
        
        if return_image and len(detections) > 0:
            _, buffer = cv2.imencode('.jpg', annotated_image)
            image_base64 = base64.b64encode(buffer).decode('utf-8')
            response["annotated_image"] = f"data:image/jpeg;base64,{{image_base64}}"
        
        return response
        
    except Exception as e:
        logger.error(f"Error during prediction: {{e}}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {{str(e)}}")

@app.post("/predict-base64")
async def predict_from_base64(
    image_data: str,
    confidence_threshold: float = 0.2,
    return_image: bool = False
):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # Decode base64 image
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        image_array = np.array(image)
        
        # Convert RGB to BGR for OpenCV
        if len(image_array.shape) == 3 and image_array.shape[2] == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        # Run inference
        start_time = time.time()
        results = model(image_array, conf=confidence_threshold)
        inference_time_ms = int((time.time() - start_time) * 1000)
        
        # Process results (same as predict endpoint)
        detections = []
        annotated_image = image_array.copy()
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    confidence = box.conf[0].cpu().numpy()
                    class_id = int(box.cls[0].cpu().numpy())
                    
                    class_name = CLASS_NAMES.get(class_id, f"unknown_{{class_id}}")
                    display_name = CLASS_DISPLAY_NAMES.get(class_id, f"Unknown Issue {{class_id}}")
                    color = CLASS_COLORS.get(class_id, (0, 255, 0))
                    
                    detection = {{
                        "class_id": class_id,
                        "class_name": class_name,
                        "display_name": display_name,
                        "confidence": float(confidence),
                        "bbox": {{
                            "x1": float(x1),
                            "y1": float(y1),
                            "x2": float(x2),
                            "y2": float(y2)
                        }},
                        "center": {{
                            "x": float((x1 + x2) / 2),
                            "y": float((y1 + y2) / 2)
                        }}
                    }}
                    detections.append(detection)
                    
                    if return_image:
                        cv2.rectangle(annotated_image, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                        label = f"{{display_name}}: {{confidence:.2f}}"
                        cv2.putText(annotated_image, label, (int(x1), int(y1) - 10), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        response = {{
            "success": True,
            "detections": detections,
            "total_detections": len(detections),
            "inference_time_ms": inference_time_ms,
            "image_info": {{
                "width": image_array.shape[1],
                "height": image_array.shape[0],
                "channels": image_array.shape[2] if len(image_array.shape) == 3 else 1
            }},
            "confidence_threshold": confidence_threshold
        }}
        
        if return_image and len(detections) > 0:
            _, buffer = cv2.imencode('.jpg', annotated_image)
            image_base64 = base64.b64encode(buffer).decode('utf-8')
            response["annotated_image"] = f"data:image/jpeg;base64,{{image_base64}}"
        
        return response
        
    except Exception as e:
        logger.error(f"Error during base64 prediction: {{e}}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {{str(e)}}")

@app.get("/classes")
async def get_classes():
    return {{
        "classes": CLASS_DISPLAY_NAMES,
        "class_names": CLASS_NAMES,
        "colors": CLASS_COLORS
    }}

if __name__ == "__main__":
    import uvicorn
    print(f"🚀 Starting AutoSOS Local YOLO Service on {local_ip}:8000")
    print(f"📱 Your app can connect to: http://{local_ip}:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
'''
    
    return script_content

def main():
    print("=" * 50)
    print("🏍️ AutoSOS Local YOLO v8 Host Service")
    print("=" * 50)
    print()
    
    # Get local IP
    local_ip = get_local_ip()
    print(f"📍 Local IP Address: {local_ip}")
    
    # Check Python packages
    print("🔍 Checking required packages...")
    missing_packages = check_python_packages()
    
    if missing_packages:
        print(f"❌ Missing packages: {', '.join(missing_packages)}")
        if not install_packages(missing_packages):
            print("❌ Failed to install packages. Please install them manually:")
            print(f"pip install {' '.join(missing_packages)}")
            return False
    else:
        print("✅ All required packages are installed")
    
    # Check if port 8000 is available
    print("🔍 Checking if port 8000 is available...")
    if not check_port_available(8000):
        print("❌ Port 8000 is already in use")
        print("Please close any other services using port 8000")
        return False
    else:
        print("✅ Port 8000 is available")
    
    # Create and run the service
    print("📝 Creating YOLO service script...")
    script_content = create_yolo_service_script(local_ip)
    
    script_path = "temp_yolo_service.py"
    try:
        with open(script_path, 'w') as f:
            f.write(script_content)
        
        print("✅ YOLO service script created")
        print()
        print("=" * 50)
        print("🌐 Service Information")
        print("=" * 50)
        print(f"📍 Local IP: {local_ip}")
        print("🔌 Port: 8000")
        print(f"🔗 Service URL: http://{local_ip}:8000")
        print(f"📱 Health Check: http://{local_ip}:8000/health")
        print("=" * 50)
        print()
        print("📱 Your AutoSOS app will automatically detect this service")
        print("   when running on the same network!")
        print()
        print("⏹️  Press Ctrl+C to stop the service")
        print()
        
        # Run the service
        subprocess.run([sys.executable, script_path])
        
    except KeyboardInterrupt:
        print("\n👋 Service stopped by user")
    except Exception as e:
        print(f"❌ Error running service: {e}")
    finally:
        # Cleanup
        if os.path.exists(script_path):
            os.remove(script_path)
            print("🧹 Cleaned up temporary files")
    
    return True

if __name__ == "__main__":
    main()
