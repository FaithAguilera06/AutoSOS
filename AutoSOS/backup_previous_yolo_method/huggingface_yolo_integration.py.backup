#!/usr/bin/env python3
"""
Hugging Face YOLOv8 Integration for AutoSOS
Provides multiple ways to use Hugging Face with YOLOv8 models
"""

import os
import time
import base64
import logging
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager

import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Hugging Face imports
from transformers import pipeline, AutoImageProcessor, AutoModelForObjectDetection
from huggingface_hub import hf_hub_download, list_models, model_info
import torch

# Ultralytics YOLOv8 (for comparison/fallback)
from ultralytics import YOLO

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("autosos-hf-yolo")

class HuggingFaceYOLOService:
    """Service for using Hugging Face models with YOLOv8 functionality"""
    
    def __init__(self):
        self.model = None
        self.processor = None
        self.model_name = None
        self.model_type = "huggingface"  # or "ultralytics"
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Motorcycle diagnostic classes
        self.class_names = {
            0: "broken_headlights_tail_lights",
            1: "broken_side_mirror", 
            2: "flat_tire",
            3: "oil_leak"
        }
        
        self.class_display_names = {
            0: "Broken Headlights/Tail Lights",
            1: "Broken Side Mirror",
            2: "Flat Tire",
            3: "Oil Leak"
        }
        
        self.class_colors = {
            0: (255, 255, 0),    # Yellow
            1: (255, 165, 0),    # Orange
            2: (0, 0, 255),      # Red
            3: (128, 0, 128)     # Purple
        }
    
    def load_huggingface_model(self, model_name: str = "facebook/detr-resnet-50"):
        """Load a Hugging Face object detection model"""
        try:
            logger.info(f"Loading Hugging Face model: {model_name}")
            
            # Load processor and model
            self.processor = AutoImageProcessor.from_pretrained(model_name)
            self.model = AutoModelForObjectDetection.from_pretrained(model_name)
            self.model_name = model_name
            
            # Move to device
            self.model.to(self.device)
            self.model.eval()
            
            logger.info(f"✅ Hugging Face model loaded successfully on {self.device}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load Hugging Face model: {e}")
            return False
    
    def load_huggingface_pipeline(self, model_name: str = "facebook/detr-resnet-50"):
        """Load a Hugging Face object detection pipeline"""
        try:
            logger.info(f"Loading Hugging Face pipeline: {model_name}")
            
            self.model = pipeline(
                "object-detection",
                model=model_name,
                device=0 if self.device == "cuda" else -1
            )
            self.model_name = model_name
            
            logger.info(f"✅ Hugging Face pipeline loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load Hugging Face pipeline: {e}")
            return False
    
    def load_ultralytics_yolo(self, model_path: str = "yolov8n.pt"):
        """Load Ultralytics YOLOv8 model as fallback"""
        try:
            logger.info(f"Loading Ultralytics YOLOv8 model: {model_path}")
            
            self.model = YOLO(model_path)
            self.model_name = model_path
            self.model_type = "ultralytics"
            
            logger.info(f"✅ Ultralytics YOLOv8 model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load Ultralytics YOLOv8 model: {e}")
            return False
    
    def detect_with_huggingface(self, image: np.ndarray, confidence: float = 0.5) -> List[Dict[str, Any]]:
        """Perform object detection using Hugging Face model"""
        try:
            # Convert BGR to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            if self.model_type == "huggingface" and hasattr(self.model, 'predict'):
                # Using pipeline
                results = self.model(image_rgb)
                
                detections = []
                for result in results:
                    if result['score'] >= confidence:
                        # Map COCO classes to our motorcycle classes (simplified mapping)
                        class_id = self._map_coco_to_motorcycle_class(result['label'])
                        if class_id is not None:
                            detections.append({
                                'class_id': class_id,
                                'class_name': self.class_names[class_id],
                                'display_name': self.class_display_names[class_id],
                                'confidence': result['score'],
                                'bbox': result['box']
                            })
                
                return detections
                
            elif self.model_type == "huggingface" and self.processor:
                # Using processor + model
                inputs = self.processor(images=image_rgb, return_tensors="pt")
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                
                with torch.no_grad():
                    outputs = self.model(**inputs)
                
                # Process outputs (simplified)
                results = self.processor.post_process_object_detection(
                    outputs, target_sizes=torch.tensor([image.shape[:2]]).to(self.device)
                )[0]
                
                detections = []
                for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
                    if score >= confidence:
                        class_id = self._map_coco_to_motorcycle_class(label.item())
                        if class_id is not None:
                            detections.append({
                                'class_id': class_id,
                                'class_name': self.class_names[class_id],
                                'display_name': self.class_display_names[class_id],
                                'confidence': score.item(),
                                'bbox': box.tolist()
                            })
                
                return detections
            
            else:
                raise ValueError("Invalid model type or configuration")
                
        except Exception as e:
            logger.error(f"Detection failed with Hugging Face model: {e}")
            return []
    
    def detect_with_ultralytics(self, image: np.ndarray, confidence: float = 0.5) -> List[Dict[str, Any]]:
        """Perform object detection using Ultralytics YOLOv8"""
        try:
            results = self.model(image, conf=confidence, verbose=False)
            
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        class_id = int(box.cls[0])
                        if class_id in self.class_names:
                            detections.append({
                                'class_id': class_id,
                                'class_name': self.class_names[class_id],
                                'display_name': self.class_display_names[class_id],
                                'confidence': float(box.conf[0]),
                                'bbox': box.xyxy[0].tolist()
                            })
            
            return detections
            
        except Exception as e:
            logger.error(f"Detection failed with Ultralytics YOLOv8: {e}")
            return []
    
    def _map_coco_to_motorcycle_class(self, coco_label: int) -> Optional[int]:
        """Map COCO dataset classes to our motorcycle diagnostic classes"""
        # Simplified mapping - you can expand this based on your needs
        coco_to_motorcycle = {
            # COCO class IDs to our motorcycle class IDs
            2: 0,   # car -> broken_headlights_tail_lights (simplified)
            3: 1,   # motorcycle -> broken_side_mirror (simplified)
            5: 2,   # bus -> flat_tire (simplified)
            7: 3,   # truck -> oil_leak (simplified)
        }
        
        return coco_to_motorcycle.get(coco_label)
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        return {
            "model_name": self.model_name,
            "model_type": self.model_type,
            "device": self.device,
            "class_names": self.class_names,
            "class_display_names": self.class_display_names,
            "num_classes": len(self.class_names)
        }

# Global service instance
yolo_service = HuggingFaceYOLOService()

# FastAPI app
app = FastAPI(
    title="AutoSOS Hugging Face YOLOv8 Service",
    description="YOLOv8 motorcycle diagnostic service using Hugging Face models",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize the model on startup"""
    logger.info("🚀 Starting AutoSOS Hugging Face YOLOv8 service")
    
    # Try to load Hugging Face model first, fallback to Ultralytics
    model_loaded = False
    
    # Option 1: Try Hugging Face pipeline
    if not model_loaded:
        model_loaded = yolo_service.load_huggingface_pipeline("facebook/detr-resnet-50")
    
    # Option 2: Try Hugging Face model + processor
    if not model_loaded:
        model_loaded = yolo_service.load_huggingface_model("facebook/detr-resnet-50")
    
    # Option 3: Fallback to Ultralytics YOLOv8
    if not model_loaded:
        model_loaded = yolo_service.load_ultralytics_yolo("yolov8n.pt")
    
    if model_loaded:
        logger.info("✅ Model loaded successfully")
    else:
        logger.error("❌ Failed to load any model")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "model_loaded": yolo_service.model is not None,
        "model_info": yolo_service.get_model_info()
    }

@app.get("/model-info")
async def get_model_info():
    """Get detailed model information"""
    return yolo_service.get_model_info()

@app.post("/detect")
async def detect_objects(
    file: UploadFile = File(...),
    confidence: float = 0.5,
    include_annotated_image: bool = True
):
    """Detect motorcycle issues in uploaded image"""
    
    if yolo_service.model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Read and process image
        image_data = await file.read()
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Perform detection
        start_time = time.time()
        
        if yolo_service.model_type == "ultralytics":
            detections = yolo_service.detect_with_ultralytics(image, confidence)
        else:
            detections = yolo_service.detect_with_huggingface(image, confidence)
        
        detection_time = time.time() - start_time
        
        # Prepare response
        response = {
            "success": True,
            "detection_count": len(detections),
            "detections": detections,
            "detection_time": detection_time,
            "image_size": {"width": image.shape[1], "height": image.shape[0]},
            "model_info": yolo_service.get_model_info()
        }
        
        # Add annotated image if requested
        if include_annotated_image and detections:
            response["annotated_image"] = create_annotated_image(image, detections)
        
        return response
        
    except Exception as e:
        logger.error(f"Detection failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

def create_annotated_image(image: np.ndarray, detections: List[Dict[str, Any]]) -> str:
    """Create annotated image with bounding boxes"""
    annotated = image.copy()
    
    for detection in detections:
        bbox = detection['bbox']
        class_id = detection['class_id']
        confidence = detection['confidence']
        display_name = detection['display_name']
        
        # Draw bounding box
        color = yolo_service.class_colors.get(class_id, (255, 255, 255))
        cv2.rectangle(annotated, (int(bbox[0]), int(bbox[1])), (int(bbox[2]), int(bbox[3])), color, 2)
        
        # Draw label
        label = f"{display_name}: {confidence:.2f}"
        cv2.putText(annotated, label, (int(bbox[0]), int(bbox[1]) - 10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
    
    # Encode as base64
    _, buffer = cv2.imencode('.jpg', annotated)
    return base64.b64encode(buffer).decode('utf-8')

@app.get("/available-models")
async def get_available_models():
    """Get list of available Hugging Face object detection models"""
    try:
        # Get popular object detection models from Hugging Face
        models = list_models(filter="object-detection", limit=20)
        
        model_list = []
        for model in models:
            try:
                info = model_info(model.modelId)
                model_list.append({
                    "id": model.modelId,
                    "downloads": info.downloads,
                    "tags": info.tags,
                    "pipeline_tag": info.pipeline_tag
                })
            except:
                continue
        
        return {
            "available_models": model_list,
            "recommended_models": [
                "facebook/detr-resnet-50",
                "facebook/detr-resnet-101", 
                "microsoft/table-transformer-structure-recognition",
                "hustvl/yolos-tiny",
                "hustvl/yolos-small"
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to get available models: {e}")
        return {"error": "Failed to fetch available models"}

@app.post("/switch-model")
async def switch_model(model_name: str):
    """Switch to a different Hugging Face model"""
    try:
        logger.info(f"Switching to model: {model_name}")
        
        # Try to load the new model
        success = False
        
        if "yolov8" in model_name.lower():
            success = yolo_service.load_ultralytics_yolo(model_name)
        else:
            success = yolo_service.load_huggingface_pipeline(model_name)
            if not success:
                success = yolo_service.load_huggingface_model(model_name)
        
        if success:
            return {
                "success": True,
                "message": f"Successfully switched to {model_name}",
                "model_info": yolo_service.get_model_info()
            }
        else:
            return {
                "success": False,
                "message": f"Failed to load model {model_name}"
            }
            
    except Exception as e:
        logger.error(f"Failed to switch model: {e}")
        return {
            "success": False,
            "message": f"Error switching model: {str(e)}"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
