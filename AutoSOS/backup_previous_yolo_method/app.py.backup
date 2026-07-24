#!/usr/bin/env python3
"""
AutoSOS YOLOv8 Motorcycle Diagnostic - Hugging Face Space
Gradio interface for motorcycle issue detection
"""

import gradio as gr
import cv2
import numpy as np
import torch
from PIL import Image
import time
import logging
from typing import List, Dict, Any, Tuple

# Import our YOLOv8 service
from huggingface_yolo_integration import HuggingFaceYOLOService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the YOLO service
yolo_service = HuggingFaceYOLOService()

# Load model on startup
def initialize_model():
    """Initialize the YOLOv8 model"""
    logger.info("🚀 Initializing AutoSOS YOLOv8 model...")
    
    # Try different model loading strategies
    model_loaded = False
    
    # Strategy 1: Try Hugging Face pipeline
    if not model_loaded:
        try:
            model_loaded = yolo_service.load_huggingface_pipeline("facebook/detr-resnet-50")
            logger.info("✅ Loaded Hugging Face pipeline")
        except Exception as e:
            logger.warning(f"Failed to load HF pipeline: {e}")
    
    # Strategy 2: Try Hugging Face model + processor
    if not model_loaded:
        try:
            model_loaded = yolo_service.load_huggingface_model("facebook/detr-resnet-50")
            logger.info("✅ Loaded Hugging Face model")
        except Exception as e:
            logger.warning(f"Failed to load HF model: {e}")
    
    # Strategy 3: Fallback to Ultralytics YOLOv8
    if not model_loaded:
        try:
            model_loaded = yolo_service.load_ultralytics_yolo("yolov8n.pt")
            logger.info("✅ Loaded Ultralytics YOLOv8")
        except Exception as e:
            logger.warning(f"Failed to load Ultralytics YOLOv8: {e}")
    
    if model_loaded:
        logger.info("🎉 Model loaded successfully!")
        return True
    else:
        logger.error("❌ Failed to load any model")
        return False

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
        
        if yolo_service.model_type == "ultralytics":
            detections = yolo_service.detect_with_ultralytics(image_cv, confidence)
        else:
            detections = yolo_service.detect_with_huggingface(image_cv, confidence)
        
        detection_time = time.time() - start_time
        
        # Create annotated image
        annotated_image = image_cv.copy()
        
        # Generate results text
        results_text = f"🔍 **Detection Results**\n\n"
        results_text += f"⏱️ **Detection Time**: {detection_time:.3f}s\n"
        results_text += f"🎯 **Detections Found**: {len(detections)}\n"
        results_text += f"🤖 **Model**: {yolo_service.model_name}\n"
        results_text += f"📱 **Device**: {yolo_service.device}\n\n"
        
        if detections:
            results_text += "🚨 **Issues Detected**:\n\n"
            for i, detection in enumerate(detections, 1):
                class_name = detection['display_name']
                confidence_score = detection['confidence']
                
                results_text += f"**{i}. {class_name}**\n"
                results_text += f"   - Confidence: {confidence_score:.2%}\n"
                results_text += f"   - Severity: {'🔴 High' if confidence_score > 0.8 else '🟡 Medium' if confidence_score > 0.6 else '🟢 Low'}\n\n"
                
                # Draw bounding box
                bbox = detection['bbox']
                class_id = detection['class_id']
                color = yolo_service.class_colors.get(class_id, (255, 255, 255))
                
                # Draw rectangle
                cv2.rectangle(annotated_image, 
                            (int(bbox[0]), int(bbox[1])), 
                            (int(bbox[2]), int(bbox[3])), 
                            color, 3)
                
                # Draw label
                label = f"{class_name}: {confidence_score:.2%}"
                cv2.putText(annotated_image, label, 
                          (int(bbox[0]), int(bbox[1]) - 10), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            
            # Add recommendations
            results_text += "💡 **Recommendations**:\n"
            results_text += "- Take your motorcycle to a certified mechanic\n"
            results_text += "- Address high-confidence issues immediately\n"
            results_text += "- Regular maintenance can prevent these issues\n"
            
        else:
            results_text += "✅ **No Issues Detected**\n\n"
            results_text += "Your motorcycle appears to be in good condition! "
            results_text += "Continue with regular maintenance to keep it running smoothly."
        
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
        
        info_text = "🤖 **Model Information**\n\n"
        info_text += f"**Model Name**: {info['model_name']}\n"
        info_text += f"**Model Type**: {info['model_type']}\n"
        info_text += f"**Device**: {info['device']}\n"
        info_text += f"**Classes**: {info['num_classes']}\n\n"
        
        info_text += "**Available Classes**:\n"
        for class_id, display_name in info['class_display_names'].items():
            info_text += f"- {display_name}\n"
        
        return info_text
        
    except Exception as e:
        return f"❌ Error getting model info: {str(e)}"

# Initialize model
model_ready = initialize_model()

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
    """
) as demo:
    
    gr.Markdown("""
    # 🏍️ AutoSOS YOLOv8 Motorcycle Diagnostic
    
    **AI-powered motorcycle issue detection using YOLOv8 and Hugging Face models**
    
    Upload an image of your motorcycle to detect common issues like broken headlights, flat tires, oil leaks, and more.
    """)
    
    with gr.Row():
        with gr.Column(scale=1):
            # Input section
            gr.Markdown("### 📸 Upload Image")
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
    
    # Example images
    with gr.Row():
        gr.Markdown("### 📋 Example Images")
        gr.Examples(
            examples=[
                # Add example images here if you have them
            ],
            inputs=input_image,
            label="Try these examples"
        )
    
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
        gr.Markdown("✅ **Model Ready** - Upload an image to get started!")
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
