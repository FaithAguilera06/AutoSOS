#!/usr/bin/env python3
"""
YOLOv8 Motorcycle Diagnostic Inference Service
FastAPI backend service for motorcycle issue detection
Now loads models from Supabase database instead of local files
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
from ultralytics import YOLO
import io
from PIL import Image
import base64
from typing import List, Dict, Any, Optional
import logging
import os
from pathlib import Path
import time
import sys

# Add parent directory to path to import model_download_service
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from model_download_service import ModelDownloadService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AutoSOS Motorcycle Diagnostic API",
    description="YOLOv8-based motorcycle issue detection service",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
model = None
model_download_service = None
current_model_info = None

# Class names for motorcycle issues
CLASS_NAMES = {
    0: "broken_headlights_tail_lights",
    1: "broken_side_mirror", 
    2: "flat_tire",
    3: "oil_leak"
}

# Class display names
CLASS_DISPLAY_NAMES = {
    0: "Broken Headlights/Tail Lights",
    1: "Broken Side Mirror",
    2: "Flat Tire", 
    3: "Oil Leak"
}

# Class colors for visualization
CLASS_COLORS = {
    0: (255, 255, 0),    # Yellow
    1: (255, 165, 0),    # Orange
    2: (0, 0, 255),      # Red
    3: (128, 0, 128)     # Purple
}

@app.on_event("startup")
async def startup_event():
    """Initialize the YOLOv8 model from Supabase database on startup"""
    global model, model_download_service, current_model_info
    
    try:
        # Initialize model download service
        # You'll need to set these environment variables or pass them as config
        supabase_url = os.getenv("SUPABASE_URL", "your_supabase_url")
        supabase_key = os.getenv("SUPABASE_ANON_KEY", "your_supabase_key")
        
        logger.info(f"Supabase URL: {supabase_url[:50]}..." if supabase_url != "your_supabase_url" else "Not set")
        logger.info(f"Supabase Key: {'Set' if supabase_key != 'your_supabase_key' else 'Not set'}")
        
        if supabase_url == "your_supabase_url" or supabase_key == "your_supabase_key":
            logger.warning("Supabase credentials not configured, falling back to local model")
            await load_local_model()
            return
        
        model_download_service = ModelDownloadService(
            supabase_url=supabase_url,
            supabase_key=supabase_key,
            cache_dir="model_cache"
        )
        
        # Load YOLOv8 model from database
        logger.info("Loading YOLOv8 model from Supabase database...")
        model = model_download_service.load_yolo_model('yolov8')
        
        if model is None:
            logger.warning("Failed to load model from database, falling back to local model")
            await load_local_model()
            return
        
        # Get current model info
        current_model_info = model_download_service.get_active_model('yolov8')
        if current_model_info:
            logger.info(f"YOLOv8 model loaded successfully from database: {current_model_info['model_name']} v{current_model_info['version']}")
        else:
            logger.info("YOLOv8 model loaded successfully from database")
        
    except Exception as e:
        logger.error(f"Failed to load YOLOv8 model from database: {e}")
        logger.info("Falling back to local model...")
        await load_local_model()

async def load_local_model():
    """Fallback to load local model if database loading fails"""
    global model, current_model_info
    
    try:
        # Get the script directory and construct the correct path
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, "..", "runs", "detect", "train3", "weights", "best.pt")
        model_path = os.path.normpath(model_path)
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        model = YOLO(model_path)
        current_model_info = {
            'id': 0,
            'model_name': 'Local YOLOv8 Model',
            'version': '1.0.0',
            'description': 'Local fallback model'
        }
        logger.info(f"YOLOv8 model loaded successfully from local file: {model_path}")
        
    except Exception as e:
        logger.error(f"Failed to load local YOLOv8 model: {e}")
        raise

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "AutoSOS Motorcycle Diagnostic API",
        "status": "running",
        "model_loaded": model is not None
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model_info": current_model_info,
        "model_source": "database" if model_download_service else "local",
        "classes": CLASS_DISPLAY_NAMES
    }

@app.post("/predict")
async def predict_motorcycle_issues(
    file: UploadFile = File(...),
    confidence_threshold: float = 0.2,
    return_image: bool = False
):
    """
    Predict motorcycle issues from uploaded image
    
    Args:
        file: Image file (JPEG, PNG, etc.)
        confidence_threshold: Minimum confidence for detections (0.0-1.0)
        return_image: Whether to return annotated image
    
    Returns:
        JSON response with detected issues and optional annotated image
    """
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        image_array = np.array(image)
        
        # Convert RGB to BGR for OpenCV
        if len(image_array.shape) == 3 and image_array.shape[2] == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        # Run inference with timing
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
                    # Extract detection info
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    confidence = box.conf[0].cpu().numpy()
                    class_id = int(box.cls[0].cpu().numpy())
                    
                    # Get class info
                    class_name = CLASS_NAMES.get(class_id, f"unknown_{class_id}")
                    display_name = CLASS_DISPLAY_NAMES.get(class_id, f"Unknown Issue {class_id}")
                    color = CLASS_COLORS.get(class_id, (0, 255, 0))
                    
                    # Create detection object
                    detection = {
                        "class_id": class_id,
                        "class_name": class_name,
                        "display_name": display_name,
                        "confidence": float(confidence),
                        "bbox": {
                            "x1": float(x1),
                            "y1": float(y1),
                            "x2": float(x2),
                            "y2": float(y2)
                        },
                        "center": {
                            "x": float((x1 + x2) / 2),
                            "y": float((y1 + y2) / 2)
                        }
                    }
                    detections.append(detection)
                    
                    # Draw bounding box on annotated image
                    if return_image:
                        cv2.rectangle(annotated_image, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                        label = f"{display_name}: {confidence:.2f}"
                        cv2.putText(annotated_image, label, (int(x1), int(y1) - 10), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        # Prepare response
        response = {
            "success": True,
            "detections": detections,
            "total_detections": len(detections),
            "image_info": {
                "width": image_array.shape[1],
                "height": image_array.shape[0],
                "channels": image_array.shape[2] if len(image_array.shape) == 3 else 1
            },
            "confidence_threshold": confidence_threshold
        }
        
        # Add annotated image if requested
        if return_image and len(detections) > 0:
            # Convert annotated image back to base64
            _, buffer = cv2.imencode('.jpg', annotated_image)
            image_base64 = base64.b64encode(buffer).decode('utf-8')
            response["annotated_image"] = f"data:image/jpeg;base64,{image_base64}"
        
        # Log model usage if we have model info and download service
        if current_model_info and model_download_service and current_model_info.get('id'):
            try:
                avg_confidence = sum(d['confidence'] for d in detections) / len(detections) if detections else 0
                model_download_service.log_model_usage(
                    model_id=current_model_info['id'],
                    inference_time_ms=inference_time_ms,
                    input_size=f"{image_array.shape[1]}x{image_array.shape[0]}",
                    confidence_score=avg_confidence,
                    success=True
                )
            except Exception as e:
                logger.warning(f"Failed to log model usage: {e}")
        
        return response
        
    except Exception as e:
        logger.error(f"Error during prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/predict-base64")
async def predict_from_base64(
    image_data: str,
    confidence_threshold: float = 0.2,
    return_image: bool = False
):
    """
    Predict motorcycle issues from base64 encoded image
    
    Args:
        image_data: Base64 encoded image string
        confidence_threshold: Minimum confidence for detections (0.0-1.0)
        return_image: Whether to return annotated image
    
    Returns:
        JSON response with detected issues and optional annotated image
    """
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
        
        # Run inference with timing
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
                    
                    class_name = CLASS_NAMES.get(class_id, f"unknown_{class_id}")
                    display_name = CLASS_DISPLAY_NAMES.get(class_id, f"Unknown Issue {class_id}")
                    color = CLASS_COLORS.get(class_id, (0, 255, 0))
                    
                    detection = {
                        "class_id": class_id,
                        "class_name": class_name,
                        "display_name": display_name,
                        "confidence": float(confidence),
                        "bbox": {
                            "x1": float(x1),
                            "y1": float(y1),
                            "x2": float(x2),
                            "y2": float(y2)
                        },
                        "center": {
                            "x": float((x1 + x2) / 2),
                            "y": float((y1 + y2) / 2)
                        }
                    }
                    detections.append(detection)
                    
                    if return_image:
                        cv2.rectangle(annotated_image, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                        label = f"{display_name}: {confidence:.2f}"
                        cv2.putText(annotated_image, label, (int(x1), int(y1) - 10), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        response = {
            "success": True,
            "detections": detections,
            "total_detections": len(detections),
            "image_info": {
                "width": image_array.shape[1],
                "height": image_array.shape[0],
                "channels": image_array.shape[2] if len(image_array.shape) == 3 else 1
            },
            "confidence_threshold": confidence_threshold
        }
        
        if return_image and len(detections) > 0:
            _, buffer = cv2.imencode('.jpg', annotated_image)
            image_base64 = base64.b64encode(buffer).decode('utf-8')
            response["annotated_image"] = f"data:image/jpeg;base64,{image_base64}"
        
        # Log model usage if we have model info and download service
        if current_model_info and model_download_service and current_model_info.get('id'):
            try:
                avg_confidence = sum(d['confidence'] for d in detections) / len(detections) if detections else 0
                model_download_service.log_model_usage(
                    model_id=current_model_info['id'],
                    inference_time_ms=inference_time_ms,
                    input_size=f"{image_array.shape[1]}x{image_array.shape[0]}",
                    confidence_score=avg_confidence,
                    success=True
                )
            except Exception as e:
                logger.warning(f"Failed to log model usage: {e}")
        
        return response
        
    except Exception as e:
        logger.error(f"Error during base64 prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/classes")
async def get_classes():
    """Get available class information"""
    return {
        "classes": CLASS_DISPLAY_NAMES,
        "class_names": CLASS_NAMES,
        "colors": CLASS_COLORS
    }

@app.get("/model-info")
async def get_model_info():
    """Get current model information"""
    return {
        "model_loaded": model is not None,
        "model_info": current_model_info,
        "model_source": "database" if model_download_service else "local",
        "cache_stats": model_download_service.get_cache_stats() if model_download_service else None
    }

@app.post("/reload-model")
async def reload_model():
    """Reload model from database (useful for model updates)"""
    global model, current_model_info
    
    if not model_download_service:
        raise HTTPException(status_code=400, detail="Model download service not available")
    
    try:
        # Load latest model from database
        logger.info("Reloading YOLOv8 model from database...")
        new_model = model_download_service.load_yolo_model('yolov8')
        
        if new_model is None:
            raise HTTPException(status_code=500, detail="Failed to load model from database")
        
        # Update global variables
        model = new_model
        current_model_info = model_download_service.get_active_model('yolov8')
        
        return {
            "success": True,
            "message": "Model reloaded successfully",
            "model_info": current_model_info
        }
        
    except Exception as e:
        logger.error(f"Error reloading model: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reload model: {str(e)}")

@app.get("/model-usage-stats")
async def get_model_usage_stats(days: int = 30):
    """Get model usage statistics"""
    if not model_download_service or not current_model_info:
        raise HTTPException(status_code=400, detail="Model service not available")
    
    try:
        stats = model_download_service.get_model_usage_stats(current_model_info['id'], days)
        return {
            "model_id": current_model_info['id'],
            "model_name": current_model_info['model_name'],
            "days": days,
            "usage_stats": stats
        }
    except Exception as e:
        logger.error(f"Error getting usage stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get usage stats: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
