#!/usr/bin/env python3
"""
AutoSOS YOLOv8 Motorcycle Diagnostic - Hugging Face Space
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
from typing import List, Dict, Any, Tuple

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
                self.model = YOLO(self.model_path)
                logger.info(f"✅ Custom model loaded successfully from {self.model_path}")
            else:
                # Fallback to standard YOLOv8
                self.model = YOLO("yolov8n.pt")
                logger.info("⚠️ Custom model not found, using YOLOv8n as fallback")
            
            logger.info(f"Model loaded on device: {self.device}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False
    
    def detect_motorcycle_issues(self, image: np.ndarray, confidence: float = 0.5) -> List[Dict[str, Any]]:
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
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        return {
            "model_path": self.model_path,
            "device": self.device,
            "class_names": self.class_names,
            "class_display_names": self.class_display_names,
            "num_classes": len(self.class_names),
            "model_loaded": self.model is not None
        }

# Initialize the service
yolo_service = AutoSOSYOLOService()

def detect_motorcycle_issues(image: Image.Image, confidence: float = 0.5) -> Tuple[Image.Image, str]:
    """
    Detect motorcycle issues in the uploaded image
    
    Args:
        image: PIL Image
        confidence: Confidence threshold for detections
    
    Returns:
        Tuple of (annotated_image, results_text)
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

def get_model_info() -> str:
    """Get information about the loaded model"""
    try:
        info = yolo_service.get_model_info()
        
        info_text = "🤖 **AutoSOS YOLOv8 Model Information**\n\n"
        info_text += f"**Model Path**: {info['model_path']}\n"
        info_text += f"**Device**: {info['device']}\n"
        info_text += f"**Model Loaded**: {'✅ Yes' if info['model_loaded'] else '❌ No'}\n"
        info_text += f"**Classes**: {info['num_classes']}\n\n"
        
        info_text += "**Detectable Issues**:\n"
        for class_id, display_name in info['class_display_names'].items():
            info_text += f"- {display_name}\n"
        
        info_text += "\n**Model Features**:\n"
        info_text += "- Custom trained on motorcycle diagnostic data\n"
        info_text += "- Optimized for real-world motorcycle issues\n"
        info_text += "- High accuracy detection with confidence scoring\n"
        info_text += "- Visual annotations with bounding boxes\n"
        
        return info_text
        
    except Exception as e:
        return f"❌ Error getting model info: {str(e)}"

# Initialize model
model_ready = yolo_service.load_model()

# Create Gradio interface
with gr.Blocks(
    title="AutoSOS YOLOv8 Motorcycle Diagnostic",
    theme=gr.themes.Soft(),
    css="""
    .gradio-container {
        max-width: 1200px !important;
        margin: auto !important;
    }
    .detection-result {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .header {
        text-align: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 20px;
    }
    """
) as demo:
    
    gr.HTML("""
    <div class="header">
        <h1>🏍️ AutoSOS YOLOv8 Motorcycle Diagnostic</h1>
        <p>AI-powered motorcycle issue detection using custom trained YOLOv8 model</p>
    </div>
    """)
    
    with gr.Row():
        with gr.Column(scale=1):
            # Input section
            gr.Markdown("### 📸 Upload Motorcycle Image")
            input_image = gr.Image(
                type="pil",
                label="Motorcycle Image",
                height=400
            )
            
            confidence_slider = gr.Slider(
                minimum=0.1,
                maximum=1.0,
                value=0.5,
                step=0.1,
                label="Confidence Threshold",
                info="Higher values = fewer but more confident detections"
            )
            
            detect_btn = gr.Button(
                "🔍 Detect Issues",
                variant="primary",
                size="lg"
            )
            
            # Model info section
            with gr.Accordion("🤖 Model Information", open=False):
                model_info_btn = gr.Button("Get Model Info")
                model_info_output = gr.Markdown()
        
        with gr.Column(scale=1):
            # Output section
            gr.Markdown("### 🎯 Detection Results")
            output_image = gr.Image(
                label="Annotated Image",
                height=400
            )
            
            results_output = gr.Markdown(
                label="Analysis Results",
                elem_classes=["detection-result"]
            )
    
    # Instructions
    with gr.Row():
        gr.Markdown("""
        ### 📋 How to Use
        1. **Upload Image**: Take or upload a clear photo of your motorcycle
        2. **Adjust Confidence**: Set detection sensitivity (0.1 = very sensitive, 1.0 = very strict)
        3. **Click Detect**: Press the "Detect Issues" button
        4. **Review Results**: Check the annotated image and detailed analysis
        
        ### 🎯 What We Detect
        - **💡 Broken Headlights/Tail Lights** - Safety-critical lighting issues
        - **🪞 Broken Side Mirrors** - Visibility and safety concerns  
        - **🛞 Flat Tires** - Tire condition and pressure issues
        - **🛢️ Oil Leaks** - Engine and mechanical problems
        """)
    
    # Event handlers
    detect_btn.click(
        fn=detect_motorcycle_issues,
        inputs=[input_image, confidence_slider],
        outputs=[output_image, results_output]
    )
    
    model_info_btn.click(
        fn=get_model_info,
        outputs=model_info_output
    )
    
    # Status indicator
    if model_ready:
        gr.Markdown("✅ **Model Ready** - Upload a motorcycle image to get started!")
    else:
        gr.Markdown("❌ **Model Loading Failed** - Please refresh the page or contact support.")

# Launch the app
if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
        debug=True
    )
