#!/usr/bin/env python3
"""
Local YOLOv8 Backend Service for AutoSOS
Provides the same API as the cloud service but runs locally
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
from ultralytics import YOLO
import time
import base64
import json
import os
from typing import List, Dict, Any
import uvicorn

app = FastAPI(title="AutoSOS Local YOLOv8 Service", version="1.0.0")

# Enable CORS for all origins (for local development)
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
        self.model_path = None
        self.load_model()
    
    def load_model(self):
        """Load the YOLOv8 model"""
        try:
            # Try to load the custom motorcycle diagnostic model
            model_paths = [
                "models/motorcycle_diagnostic.pt",
                "yolo-motorcycle-diagnostic-training/backend/runs/detect/train3/weights/best.pt",
                "yolo-motorcycle-diagnostic-training/runs/detect/train3/weights/best.pt"
            ]
            
            for path in model_paths:
                if os.path.exists(path):
                    print(f"Loading model from: {path}")
                    self.model = YOLO(path)
                    self.model_path = path
                    print(f"✅ Model loaded successfully with {len(self.model.names)} classes")
                    print(f"Classes: {self.model.names}")
                    return
            
            # Fallback to pretrained model
            print("Loading pretrained YOLOv8n model...")
            self.model = YOLO("yolov8n.pt")
            self.model_path = "yolov8n.pt"
            print("✅ Pretrained model loaded")
            
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            self.model = None
    
    def detect_from_image(self, image_data: np.ndarray) -> Dict[str, Any]:
        """Run detection on image data"""
        if self.model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        try:
            # Run detection
            results = self.model(image_data, conf=0.1, verbose=False)
            
            detections = []
            for result in results:
                if hasattr(result, 'boxes') and result.boxes is not None:
                    for box in result.boxes:
                        # Get bounding box coordinates
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                        conf = float(box.conf[0].cpu().numpy().item())
                        cls = int(box.cls[0].cpu().numpy().item())
                        
                        # Get class name
                        class_name = self.model.names.get(cls, f"class_{cls}")
                        
                        detections.append({
                            "bbox": [int(x1), int(y1), int(x2), int(y2)],
                            "confidence": conf,
                            "class": cls,
                            "class_name": class_name
                        })
            
            return {
                "success": True,
                "detections": detections,
                "model_path": self.model_path,
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
    return {"message": "AutoSOS Local YOLOv8 Service", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": yolo_service.model is not None,
        "model_path": yolo_service.model_path,
        "model_classes": len(yolo_service.model.names) if yolo_service.model else 0,
        "timestamp": time.time()
    }

@app.get("/model-info")
async def model_info():
    """Get model information"""
    if yolo_service.model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    return {
        "model_name": "motorcycle_diagnostic",
        "model_type": "custom_motorcycle_diagnostic",
        "input_size": [640, 640],
        "classes": yolo_service.model.names,
        "num_classes": len(yolo_service.model.names),
        "model_path": yolo_service.model_path
    }

@app.post("/detect")
async def detect_objects(file: UploadFile = File(...)):
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
        result = yolo_service.detect_from_image(image)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"❌ Error in detect endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect-base64")
async def detect_objects_base64(data: Dict[str, str]):
    """Detect objects from base64 encoded image"""
    try:
        # Decode base64 image
        image_data = base64.b64decode(data["image"])
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Run detection
        result = yolo_service.detect_from_image(image)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"❌ Error in detect-base64 endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("🚀 Starting AutoSOS Local YOLOv8 Service...")
    print("📍 Service will be available at: http://localhost:8002")
    print("🔗 Health check: http://localhost:8002/health")
    print("📊 Model info: http://localhost:8002/model-info")
    print("🎯 Detection: http://localhost:8002/detect")
    print("-" * 50)
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8002,
        log_level="info"
    )
