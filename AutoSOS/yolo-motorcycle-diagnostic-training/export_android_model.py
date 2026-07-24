#!/usr/bin/env python3
"""
Export YOLOv8 model to Android-compatible formats
"""

import os
import sys
import shutil
from pathlib import Path
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def export_model_for_android():
    """Export the trained YOLOv8 model for Android deployment"""
    
    # Paths
    model_path = "runs/detect/train3/weights/best.pt"
    android_assets_dir = "../android/app/src/main/assets"
    
    try:
        from ultralytics import YOLO
        import torch
        
        logger.info("🚀 Starting Android model export...")
        
        # Check if model exists
        if not os.path.exists(model_path):
            logger.error(f"❌ Model not found at {model_path}")
            return False
            
        # Load trained model
        logger.info(f"📋 Loading model from {model_path}")
        model = YOLO(model_path)
        
        # Create export directory
        export_dir = "android_export"
        os.makedirs(export_dir, exist_ok=True)
        
        # Export to TensorFlow Lite
        logger.info("🔄 Exporting to TensorFlow Lite...")
        tflite_path = model.export(
            format="tflite",
            imgsz=640,
            int8=False,  # Use FP16 for better accuracy
            data="dataset/motorcycle_diagnostic.yaml"
        )
        
        # Copy to Android assets
        logger.info("📁 Creating Android assets directory...")
        os.makedirs(android_assets_dir, exist_ok=True)
        
        # Copy TFLite model
        tflite_dest = os.path.join(android_assets_dir, "motorcycle_diagnostic.tflite")
        shutil.copy2(tflite_path, tflite_dest)
        logger.info(f"✅ TFLite model copied to {tflite_dest}")
        
        # Create labels file
        labels_content = """broken_headlights_tail_lights
broken_side_mirror
flat_tire
oil_leak"""
        
        labels_path = os.path.join(android_assets_dir, "labels.txt")
        with open(labels_path, 'w') as f:
            f.write(labels_content)
        logger.info(f"✅ Labels file created at {labels_path}")
        
        # Create model config file
        config_content = f"""# YOLOv8 Motorcycle Diagnostic Model Configuration
model_name: motorcycle_diagnostic
model_version: 1.0.0
input_size: 640
classes: 4
class_names:
  - broken_headlights_tail_lights
  - broken_side_mirror  
  - flat_tire
  - oil_leak
confidence_threshold: 0.7
"""
        
        config_path = os.path.join(android_assets_dir, "model_config.yaml")
        with open(config_path, 'w') as f:
            f.write(config_content)
        logger.info(f"✅ Config file created at {config_path}")
        
        # Print summary
        logger.info("\n🎉 ANDROID EXPORT COMPLETE!")
        logger.info("=" * 50)
        logger.info(f"📱 TFLite Model: {tflite_dest}")
        logger.info(f"📋 Labels File: {labels_path}")
        logger.info(f"⚙️  Config File: {config_path}")
        logger.info("=" * 50)
        logger.info("\n📋 NEXT STEPS:")
        logger.info("1. Build your Android app")
        logger.info("2. Test the diagnostic functionality")
        logger.info("3. The model will run directly on the Android device")
        logger.info("4. No backend service needed for Android!")
        
        return True
        
    except ImportError as e:
        logger.error(f"❌ Required dependencies not installed: {e}")
        logger.error("Run: pip install ultralytics torch")
        return False
    except Exception as e:
        logger.error(f"❌ Export failed: {e}")
        return False

def verify_export():
    """Verify that the exported files exist and are valid"""
    android_assets_dir = "../android/app/src/main/assets"
    
    required_files = [
        "motorcycle_diagnostic.tflite",
        "labels.txt",
        "model_config.yaml"
    ]
    
    logger.info("🔍 Verifying exported files...")
    
    for file_name in required_files:
        file_path = os.path.join(android_assets_dir, file_name)
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path)
            logger.info(f"✅ {file_name}: {file_size} bytes")
        else:
            logger.error(f"❌ Missing: {file_name}")
            return False
    
    logger.info("✅ All files verified successfully!")
    return True

if __name__ == "__main__":
    print("🤖 YOLOv8 Android Model Exporter")
    print("=" * 40)
    
    if export_model_for_android():
        if verify_export():
            print("\n🎉 SUCCESS: Model ready for Android deployment!")
            sys.exit(0)
        else:
            print("\n❌ VERIFICATION FAILED")
            sys.exit(1)
    else:
        print("\n❌ EXPORT FAILED")
        sys.exit(1)
