#!/usr/bin/env python3
"""
AutoSOS Local YOLOv8 Service with Supabase Storage Integration
Downloads model from Supabase and runs inference locally

Usage:
    python local_yolo_supabase_service.py
    
This will:
1. Download best.pt from Supabase storage (models/yolov8/best.pt)
2. Start a local FastAPI server on port 8000
3. Provide YOLOv8 inference endpoints
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
from ultralytics import YOLO
import time
import base64
import os
import socket
from typing import List, Dict, Any
import uvicorn
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://atdibhoeaeqfgjswcqwx.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZGlib2VhZXFmZ2pzd2NxeHgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMzY5NDQ0MywiZXhwIjoyMDE5MjcwNDQzfQ.8zVJnEGvFFuBmV-IkwH7aJNk8B_LRdZZWTj_XHTJhLw")
BUCKET_NAME = "autosos"
MODEL_STORAGE_PATH = "models/yolov8/best.pt"
MODEL_LOCAL_PATH = "best.pt"

app = FastAPI(title="AutoSOS Local YOLO Service with Supabase", version="1.0.0")

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LocalYOLOService:
    def __init__(self):
        self.model = None
        self.model_loaded = False
        self.supabase: Client | None = None
        self.local_ip = self.get_local_ip()
        
    def get_local_ip(self):
        """Get the local IP address for network access"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            return local_ip
        except Exception:
            return "127.0.0.1"
    
    def download_model_from_supabase(self) -> bool:
        """Download the YOLOv8 model from Supabase storage"""
        try:
            print("🔗 Connecting to Supabase...")
            self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            
            print(f"📥 Downloading model from Supabase: {MODEL_STORAGE_PATH}")
            
            # Download the model file
            response = self.supabase.storage.from_(BUCKET_NAME).download(MODEL_STORAGE_PATH)
            
            if response and isinstance(response, bytes):
                # Save to local file
                with open(MODEL_LOCAL_PATH, "wb") as f:
                    f.write(response)
                
                file_size = os.path.getsize(MODEL_LOCAL_PATH)
                print(f"✅ Model downloaded successfully: {MODEL_LOCAL_PATH} ({file_size / (1024*1024):.2f} MB)")
                return True
            else:
                print("⚠️  No model data received from Supabase")
                return False
                
        except Exception as e:
            print(f"❌ Error downloading model from Supabase: {e}")
            return False
    
    def load_model(self):
        """Load the YOLOv8 model"""
        try:
            # First try to download from Supabase
            if os.path.exists(MODEL_LOCAL_PATH):
                print(f"📦 Loading model from local file: {MODEL_LOCAL_PATH}")
                self.model = YOLO(MODEL_LOCAL_PATH)
                self.model_loaded = True
                print(f"✅ Model loaded successfully with {len(self.model.names)} classes")
                print(f"Classes: {self.model.names}")
                return True
            else:
                # Try to download from Supabase
                print("📥 Model not found locally, attempting to download from Supabase...")
                if self.download_model_from_supabase():
                    print(f"📦 Loading downloaded model: {MODEL_LOCAL_PATH}")
                    self.model = YOLO(MODEL_LOCAL_PATH)
                    self.model_loaded = True
                    print(f"✅ Model loaded successfully with {len(self.model.names)} classes")
                    print(f"Classes: {self.model.names}")
                    return True
                else:
                    # Fallback to pretrained model
                    print("⚠️  Supabase download failed, loading pretrained YOLOv8n model...")
                    self.model = YOLO("yolov8n.pt")
                    self.model_loaded = True
                    print("✅ Pretrained model loaded as fallback")
                    return True
                    
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            self.model_loaded = False
            return False
    
    def detect_from_image(self, image_data: np.ndarray, confidence: float = 0.25) -> Dict[str, Any]:
        """Run detection on image data"""
        if self.model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        try:
            # Run detection
            results = self.model(image_data, conf=confidence, verbose=False)
            
            detections = []
            for result in results:
                if hasattr(result, 'boxes') and result.boxes is not None:
                    for box in result.boxes:
                        # Get bounding box coordinates
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(float)
                        conf = float(box.conf[0].cpu().numpy().item())
                        cls = int(box.cls[0].cpu().numpy().item())
                        
                        # Get class name
                        class_name = self.model.names.get(cls, f"class_{cls}")
                        
                        detections.append({
                            "class_id": cls,
                            "class_name": class_name,
                            "confidence": conf,
                            "bbox": [float(x1), float(y1), float(x2), float(y2)],
                            "center": {
                                "x": float((x1 + x2) / 2),
                                "y": float((y1 + y2) / 2)
                            }
                        })
            
            return {
                "success": True,
                "detections": detections,
                "total_detections": len(detections),
                "model": "yolov8",
                "timestamp": time.time()
            }
            
        except Exception as e:
            print(f"❌ Detection error: {e}")
            raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

# Initialize the service
yolo_service = LocalYOLOService()

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AutoSOS Local YOLO Service with Supabase",
        "status": "running",
        "model_loaded": yolo_service.model_loaded,
        "ip_address": yolo_service.local_ip,
        "port": 8000
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": yolo_service.model_loaded,
        "ip_address": yolo_service.local_ip,
        "port": 8000,
        "service_type": "local_supabase_yolo",
        "timestamp": time.time()
    }

@app.get("/model-info")
async def model_info():
    """Get model information"""
    if yolo_service.model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    return {
        "model_name": "best.pt",
        "model_type": "yolov8",
        "model_source": "Supabase Storage",
        "input_size": [640, 640],
        "classes": yolo_service.model.names,
        "num_classes": len(yolo_service.model.names),
        "model_path": MODEL_LOCAL_PATH
    }

@app.post("/detect")
async def detect_objects(
    file: UploadFile = File(...),
    confidence: float = Form(0.25)
):
    """Detect objects in uploaded image"""
    try:
        # Read the uploaded file
        contents = await file.read()
        
        # Convert to numpy array
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Run detection
        result = yolo_service.detect_from_image(image, confidence)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"❌ Error in detect endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect-base64")
async def detect_objects_base64(data: Dict[str, Any]):
    """Detect objects from base64 encoded image"""
    try:
        # Decode base64 image
        image_data = data.get("image_data") or data.get("image")
        if not image_data:
            raise HTTPException(status_code=400, detail="No image data provided")
        
        # Handle data URL format
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        confidence = data.get("confidence", 0.25)
        
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Run detection
        result = yolo_service.detect_from_image(image, confidence)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"❌ Error in detect-base64 endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
async def predict_from_file(
    file: UploadFile = File(...),
    confidence_threshold: float = Form(0.25),
    return_image: bool = Form(False)
):
    """Alternative predict endpoint for compatibility"""
    return await detect_objects(file, confidence_threshold)

@app.post("/predict-base64")
async def predict_from_base64(data: Dict[str, Any]):
    """Alternative predict-base64 endpoint for compatibility"""
    return await detect_objects_base64(data)

if __name__ == "__main__":
    try:
        print("=" * 60)
        print("AutoSOS Local YOLOv8 Service with Supabase Storage")
        print("=" * 60)
        print()
        
        # Load model on startup
        print("Loading YOLOv8 model...")
        yolo_service.load_model()
        
        print()
        print("=" * 60)
        print("Service Information")
        print("=" * 60)
        print(f"Local IP: {yolo_service.local_ip}")
        print(f"Port: 8000")
        print(f"Service URL: http://{yolo_service.local_ip}:8000")
        print(f"Health Check: http://{yolo_service.local_ip}:8000/health")
        print(f"Model Info: http://{yolo_service.local_ip}:8000/model-info")
        print(f"Detection: http://{yolo_service.local_ip}:8000/detect")
        print("=" * 60)
        print()
        print("Connect your Android app to this service using the IP above")
        print("Press Ctrl+C to stop the service")
        print()
        
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\nService stopped by user")
    except Exception as e:
        print(f"Error starting service: {e}")
        import traceback
        traceback.print_exc()
        input("\nPress Enter to exit...")

