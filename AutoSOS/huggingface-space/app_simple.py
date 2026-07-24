#!/usr/bin/env python3
"""
AutoSOS YOLOv8 Motorcycle Diagnostic - Simplified Version
Gradio interface for motorcycle issue detection using custom trained model
"""

import gradio as gr
import cv2
import numpy as np
import torch
from PIL import Image
import time
import logging
import os
import tempfile

# Import YOLOv8
from ultralytics import YOLO

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AutoSOSYOLOService:
    """Service for AutoSOS YOLOv8 motorcycle diagnostic"""
    
    def __init__(self):
        self.model = None
        self.model_path = "/app/models/best.pt"
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Motorcycle diagnostic classes (from your training)
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
    
    def load_model(self):
        """Load the custom trained YOLOv8 model"""
        try:
            logger.info(f"Loading AutoSOS YOLOv8 model from: {self.model_path}")
            
            if os.path.exists(self.model_path):
                # Set YOLO config to use temp directory
                os.environ['YOLO_CONFIG_DIR'] = tempfile.gettempdir()
                self.model = YOLO(self.model_path)
                logger.info(f"✅ Custom model loaded successfully from {self.model_path}")
            else:
                # Fallback to standard YOLOv8
                os.environ['YOLO_CONFIG_DIR'] = tempfile.gettempdir()
                self.model = YOLO("yolov8n.pt")
                logger.info("⚠️ Custom model not found, using YOLOv8n as fallback")
            
            logger.info(f"Model loaded on device: {self.device}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False
    
    def detect_motorcycle_issues(self, image: np.ndarray, confidence: float = 0.5) -> list:
        """Detect motorcycle issues in the image"""
        try:
            if self.model is None:
                return []
            
            # Perform detection
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
            logger.error(f"Detection failed: {e}")
            return []

# Initialize the service
yolo_service = AutoSOSYOLOService()

def detect_motorcycle_issues(image: Image.Image, confidence: float = 0.5):
    """
    Detect motorcycle issues in the uploaded image
    """
    try:
        # Convert PIL to OpenCV format
        image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Perform detection
        start_time = time.time()
        detections = yolo_service.detect_motorcycle_issues(image_cv, confidence)
        detection_time = time.time() - start_time
        
        # Create annotated image
        annotated_image = image_cv.copy()
        
        # Generate results text
        results_text = f"🔍 **AutoSOS Motorcycle Diagnostic Results**\n\n"
        results_text += f"⏱️ **Detection Time**: {detection_time:.3f}s\n"
        results_text += f"🎯 **Issues Detected**: {len(detections)}\n"
        results_text += f"🤖 **Model**: Custom AutoSOS YOLOv8\n"
        results_text += f"📱 **Device**: {yolo_service.device}\n"
        results_text += f"🎚️ **Confidence Threshold**: {confidence:.1%}\n\n"
        
        if detections:
            results_text += "🚨 **Issues Found**:\n\n"
            for i, detection in enumerate(detections, 1):
                class_name = detection['display_name']
                confidence_score = detection['confidence']
                
                # Determine severity
                if confidence_score > 0.8:
                    severity = "🔴 **CRITICAL**"
                    action = "Immediate attention required"
                elif confidence_score > 0.6:
                    severity = "🟡 **MODERATE**"
                    action = "Schedule repair soon"
                else:
                    severity = "🟢 **MINOR**"
                    action = "Monitor and plan repair"
                
                results_text += f"**{i}. {class_name}**\n"
                results_text += f"   - Confidence: {confidence_score:.1%}\n"
                results_text += f"   - Severity: {severity}\n"
                results_text += f"   - Action: {action}\n\n"
                
                # Draw bounding box
                bbox = detection['bbox']
                class_id = detection['class_id']
                color = yolo_service.class_colors.get(class_id, (255, 255, 255))
                
                # Draw rectangle
                cv2.rectangle(annotated_image, 
                            (int(bbox[0]), int(bbox[1])), 
                            (int(bbox[2]), int(bbox[3])), 
                            color, 3)
                
                # Draw label with confidence
                label = f"{class_name}: {confidence_score:.1%}"
                cv2.putText(annotated_image, label, 
                          (int(bbox[0]), int(bbox[1]) - 10), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            
            # Add recommendations
            results_text += "💡 **Recommendations**:\n"
            results_text += "- Take your motorcycle to a certified mechanic\n"
            results_text += "- Address critical issues immediately for safety\n"
            results_text += "- Keep records of all repairs and maintenance\n"
            results_text += "- Regular inspections can prevent these issues\n"
            
        else:
            results_text += "✅ **No Issues Detected**\n\n"
            results_text += "Your motorcycle appears to be in good condition! 🎉\n\n"
            results_text += "**Maintenance Tips**:\n"
            results_text += "- Continue regular maintenance schedule\n"
            results_text += "- Check lights and mirrors regularly\n"
            results_text += "- Monitor tire pressure and condition\n"
            results_text += "- Watch for oil leaks during routine checks\n"
        
        # Convert back to PIL
        annotated_pil = Image.fromarray(cv2.cvtColor(annotated_image, cv2.COLOR_BGR2RGB))
        
        return annotated_pil, results_text
        
    except Exception as e:
        logger.error(f"Detection failed: {e}")
        error_text = f"❌ **Error**: {str(e)}\n\nPlease try again with a different image."
        return image, error_text

# Initialize model
model_ready = yolo_service.load_model()

# Create simple Gradio interface
with gr.Blocks(title="AutoSOS YOLOv8 Motorcycle Diagnostic") as demo:
    
    gr.Markdown("""
    # 🏍️ AutoSOS YOLOv8 Motorcycle Diagnostic
    
    **AI-powered motorcycle issue detection using custom trained YOLOv8 model**
    """)
    
    with gr.Row():
        with gr.Column():
            input_image = gr.Image(type="pil", label="Upload Motorcycle Image")
            confidence = gr.Slider(0.1, 1.0, 0.5, label="Confidence Threshold")
            detect_btn = gr.Button("🔍 Detect Issues", variant="primary")
        
        with gr.Column():
            output_image = gr.Image(label="Detection Results")
            results = gr.Markdown(label="Analysis")
    
    detect_btn.click(
        fn=detect_motorcycle_issues,
        inputs=[input_image, confidence],
        outputs=[output_image, results]
    )
    
    if model_ready:
        gr.Markdown("✅ **Model Ready** - Upload a motorcycle image to get started!")
    else:
        gr.Markdown("❌ **Model Loading Failed** - Please refresh the page.")

# Launch the app
if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
