#!/usr/bin/env python3
"""
Android-Optimized YOLOv8 Training Script for Motorcycle Diagnostic
Specifically designed for AutoSOS Android application with 4 issue categories
"""

import os
import yaml
import torch
import wandb
from ultralytics import YOLO
from pathlib import Path
import argparse
from datetime import datetime
import numpy as np

def setup_android_training_environment():
    """Setup training environment optimized for Android deployment"""
    print("🤖 Setting up Android-Optimized YOLOv8 Training Environment")
    
    # Check CUDA availability
    if torch.cuda.is_available():
        print(f"✅ CUDA available: {torch.cuda.get_device_name(0)}")
        print(f"   GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    else:
        print("⚠️  CUDA not available, using CPU (training will be slow)")
    
    # Check dataset structure
    dataset_path = Path("dataset")
    if not dataset_path.exists():
        raise FileNotFoundError("Dataset directory not found. Please run data preparation first.")
    
    config_path = dataset_path / "motorcycle_diagnostic.yaml"
    if not config_path.exists():
        raise FileNotFoundError("Dataset configuration file not found.")
    
    print("✅ Android training environment setup complete")

def load_android_dataset_config(config_path):
    """Load and validate Android-specific dataset configuration"""
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    print(f"📱 Android Dataset Configuration:")
    print(f"   Classes: {config['nc']} (optimized for mobile)")
    print(f"   Class names: {config['names']}")
    print(f"   Train images: {config['train']}")
    print(f"   Validation images: {config['val']}")
    print(f"   Test images: {config['test']}")
    
    # Validate Android-specific config
    if 'android_config' in config:
        android_config = config['android_config']
        print(f"   Target device: {android_config.get('target_device', 'Android')}")
        print(f"   Model size: {android_config.get('model_size', 'nano')}")
        print(f"   Input size: {android_config.get('input_size', 640)}")
    
    return config

def train_android_model(model_size="n", config_path="dataset/motorcycle_diagnostic.yaml", 
                       epochs=150, batch_size=32, img_size=640, device="auto"):
    """
    Train YOLOv8 model optimized for Android deployment
    
    Args:
        model_size: Model size ('n' for nano - best for mobile)
        config_path: Path to dataset configuration
        epochs: Number of training epochs (increased for better accuracy)
        batch_size: Batch size for training (increased for 4 classes)
        img_size: Input image size
        device: Device to use ('auto', 'cpu', 'cuda', or specific GPU)
    """
    
    print(f"📱 Starting Android-Optimized YOLOv8{model_size} training")
    print(f"   Target: AutoSOS Android App")
    print(f"   Classes: 4 motorcycle issues")
    
    # Load model (always use nano for Android)
    model_name = f"yolov8{model_size}.pt"
    print(f"📦 Loading model: {model_name}")
    model = YOLO(model_name)
    
    # Load dataset configuration
    config = load_android_dataset_config(config_path)
    
    # Android-optimized training parameters
    train_params = {
        'data': config_path,
        'epochs': epochs,
        'batch': batch_size,
        'imgsz': img_size,
        'device': device,
        'workers': 8,
        'project': 'runs/train',
        'name': f'android_motorcycle_diagnostic_yolov8{model_size}',
        'exist_ok': True,
        'pretrained': True,
        'optimizer': 'AdamW',
        'lr0': 0.01,
        'lrf': 0.01,
        'momentum': 0.937,
        'weight_decay': 0.0005,
        'warmup_epochs': 3,
        'warmup_momentum': 0.8,
        'warmup_bias_lr': 0.1,
        'box': 7.5,
        'cls': 0.5,
        'dfl': 1.5,
        'pose': 12.0,
        'kobj': 2.0,
        'label_smoothing': 0.0,
        'nbs': 64,
        'overlap_mask': True,
        'mask_ratio': 4,
        'drop_path': 0.0,
        'copy_paste': 0.3,
        'mosaic': 1.0,
        'mixup': 0.15,
        'degrees': 0.0,
        'translate': 0.1,
        'scale': 0.5,
        'shear': 0.0,
        'perspective': 0.0,
        'flipud': 0.0,
        'fliplr': 0.5,
        'hsv_h': 0.015,
        'hsv_s': 0.7,
        'hsv_v': 0.4,
        'save': True,
        'save_period': 10,
        'cache': False,
        'rect': False,
        'cos_lr': False,
        'close_mosaic': 10,
        'resume': False,
        'amp': True,
        'fraction': 1.0,
        'profile': False,
        'freeze': None,
        'multi_scale': False,
        'overlap_mask': True,
        'mask_ratio': 4,
        'drop_path': 0.0,
        'copy_paste': 0.3,
        'auto_augment': 'randaugment',
        'erasing': 0.4,
        'crop_fraction': 1.0,
        # Android-specific optimizations
        'patience': 50,  # Early stopping patience
        'save_json': True,  # Save results in JSON format
        'plots': True,  # Generate training plots
    }
    
    print("🏋️ Starting Android-optimized training...")
    print(f"   Epochs: {epochs}")
    print(f"   Batch size: {batch_size}")
    print(f"   Image size: {img_size}")
    print(f"   Device: {device}")
    print(f"   Classes: {config['nc']}")
    
    # Start training
    try:
        results = model.train(**train_params)
        
        print("✅ Android training completed successfully!")
        
        # Print training results
        if hasattr(results, 'results_dict'):
            print("\n📊 Training Results:")
            for key, value in results.results_dict.items():
                print(f"   {key}: {value}")
        
        # Validate the model
        print("\n🔍 Validating Android model...")
        val_results = model.val()
        
        # Print validation results
        if hasattr(val_results, 'results_dict'):
            print("\n📈 Validation Results:")
            for key, value in val_results.results_dict.items():
                print(f"   {key}: {value}")
        
        # Export models for Android deployment
        print("\n📦 Exporting models for Android deployment...")
        android_formats = ['onnx', 'tflite', 'coreml']
        
        for fmt in android_formats:
            try:
                if fmt == 'tflite':
                    # TensorFlow Lite for Android
                    model.export(format=fmt, int8=True, dynamic=True)
                    print(f"   ✅ Exported to {fmt.upper()} (quantized for Android)")
                elif fmt == 'onnx':
                    # ONNX for cross-platform
                    model.export(format=fmt, dynamic=True, simplify=True)
                    print(f"   ✅ Exported to {fmt.upper()} (optimized)")
                else:
                    model.export(format=fmt)
                    print(f"   ✅ Exported to {fmt.upper()}")
            except Exception as e:
                print(f"   ⚠️  Failed to export to {fmt.upper()}: {e}")
        
        # Save final Android-optimized model
        android_model_path = f"models/android_motorcycle_diagnostic_yolov8{model_size}.pt"
        os.makedirs("models", exist_ok=True)
        model.save(android_model_path)
        print(f"💾 Android model saved to: {android_model_path}")
        
        # Generate Android integration code
        generate_android_integration_code(model, config)
        
        return model, results, val_results
        
    except Exception as e:
        print(f"❌ Android training failed: {e}")
        raise e

def generate_android_integration_code(model, config):
    """Generate Android integration code for the trained model"""
    print("\n📱 Generating Android integration code...")
    
    # Create Android integration directory
    android_dir = Path("android_integration")
    android_dir.mkdir(exist_ok=True)
    
    # Generate class mapping
    class_mapping = {}
    for i, class_name in enumerate(config['names']):
        class_mapping[i] = class_name
    
    # Generate Android Java code
    java_code = f'''package com.autosos.diagnostic;

import android.graphics.Bitmap;
import android.graphics.RectF;
import java.util.List;
import java.util.ArrayList;

/**
 * Motorcycle Diagnostic Model Integration for AutoSOS Android App
 * Generated from YOLOv8 training results
 */
public class MotorcycleDiagnosticModel {{
    
    // Class mapping for 4 motorcycle issues
    private static final String[] CLASS_NAMES = {{
        "broken_headlights_tail_lights",
        "broken_side_mirror", 
        "flat_tire",
        "oil_leak"
    }};
    
    // Color coding for bounding boxes
    private static final int[] CLASS_COLORS = {{
        0xFFFFFF00,  // Yellow for lighting issues
        0xFFFFA500,  // Orange for mirror issues
        0xFFFF0000,  // Red for tire issues
        0xFF800080   // Purple for oil leaks
    }};
    
    // Severity levels for each issue
    private static final String[] SEVERITY_LEVELS = {{
        "Medium",    // broken_headlights_tail_lights
        "Low",       // broken_side_mirror
        "High",      // flat_tire
        "Critical"   // oil_leak
    }};
    
    // Repair recommendations
    private static final String[] REPAIR_RECOMMENDATIONS = {{
        "Replace broken headlights/tail lights immediately for safety",
        "Replace or repair side mirror for better visibility",
        "Repair or replace flat tire before riding",
        "Fix oil leak immediately - check engine and transmission"
    }};
    
    /**
     * Detection result class
     */
    public static class Detection {{
        public String className;
        public float confidence;
        public RectF boundingBox;
        public String severity;
        public String recommendation;
        public int color;
        
        public Detection(String className, float confidence, RectF boundingBox) {{
            this.className = className;
            this.confidence = confidence;
            this.boundingBox = boundingBox;
            
            // Find class index
            int classIndex = -1;
            for (int i = 0; i < CLASS_NAMES.length; i++) {{
                if (CLASS_NAMES[i].equals(className)) {{
                    classIndex = i;
                    break;
                }}
            }}
            
            if (classIndex >= 0) {{
                this.severity = SEVERITY_LEVELS[classIndex];
                this.recommendation = REPAIR_RECOMMENDATIONS[classIndex];
                this.color = CLASS_COLORS[classIndex];
            }}
        }}
    }}
    
    /**
     * Process image and detect motorcycle issues
     * @param bitmap Input image bitmap
     * @return List of detected issues
     */
    public List<Detection> detectIssues(Bitmap bitmap) {{
        // TODO: Implement YOLOv8 inference
        // This is a placeholder - integrate with your YOLOv8 Android implementation
        
        List<Detection> detections = new ArrayList<>();
        
        // Example detection (replace with actual model inference)
        // Detection detection = new Detection("flat_tire", 0.95f, new RectF(100, 200, 300, 400));
        // detections.add(detection);
        
        return detections;
    }}
    
    /**
     * Get class name by index
     */
    public static String getClassName(int classIndex) {{
        if (classIndex >= 0 && classIndex < CLASS_NAMES.length) {{
            return CLASS_NAMES[classIndex];
        }}
        return "unknown";
    }}
    
    /**
     * Get severity level by class name
     */
    public static String getSeverityLevel(String className) {{
        for (int i = 0; i < CLASS_NAMES.length; i++) {{
            if (CLASS_NAMES[i].equals(className)) {{
                return SEVERITY_LEVELS[i];
            }}
        }}
        return "Unknown";
    }}
    
    /**
     * Get repair recommendation by class name
     */
    public static String getRepairRecommendation(String className) {{
        for (int i = 0; i < CLASS_NAMES.length; i++) {{
            if (CLASS_NAMES[i].equals(className)) {{
                return REPAIR_RECOMMENDATIONS[i];
            }}
        }}
        return "Consult a mechanic";
    }}
}}'''
    
    # Save Java code
    java_file = android_dir / "MotorcycleDiagnosticModel.java"
    with open(java_file, 'w') as f:
        f.write(java_code)
    
    # Generate Kotlin code
    kotlin_code = f'''package com.autosos.diagnostic

import android.graphics.Bitmap
import android.graphics.RectF

/**
 * Motorcycle Diagnostic Model Integration for AutoSOS Android App (Kotlin)
 * Generated from YOLOv8 training results
 */
class MotorcycleDiagnosticModel {{
    
    companion object {{
        // Class mapping for 4 motorcycle issues
        val CLASS_NAMES = arrayOf(
            "broken_headlights_tail_lights",
            "broken_side_mirror", 
            "flat_tire",
            "oil_leak"
        )
        
        // Color coding for bounding boxes
        val CLASS_COLORS = intArrayOf(
            0xFFFFFF00,  // Yellow for lighting issues
            0xFFFFA500,  // Orange for mirror issues
            0xFFFF0000,  // Red for tire issues
            0xFF800080   // Purple for oil leaks
        )
        
        // Severity levels for each issue
        val SEVERITY_LEVELS = arrayOf(
            "Medium",    // broken_headlights_tail_lights
            "Low",       // broken_side_mirror
            "High",      // flat_tire
            "Critical"   // oil_leak
        )
        
        // Repair recommendations
        val REPAIR_RECOMMENDATIONS = arrayOf(
            "Replace broken headlights/tail lights immediately for safety",
            "Replace or repair side mirror for better visibility",
            "Repair or replace flat tire before riding",
            "Fix oil leak immediately - check engine and transmission"
        )
    }}
    
    /**
     * Detection result data class
     */
    data class Detection(
        val className: String,
        val confidence: Float,
        val boundingBox: RectF,
        val severity: String,
        val recommendation: String,
        val color: Int
    ) {{
        constructor(className: String, confidence: Float, boundingBox: RectF) : this(
            className = className,
            confidence = confidence,
            boundingBox = boundingBox,
            severity = getSeverityLevel(className),
            recommendation = getRepairRecommendation(className),
            color = getClassColor(className)
        )
    }}
    
    /**
     * Process image and detect motorcycle issues
     */
    fun detectIssues(bitmap: Bitmap): List<Detection> {{
        // TODO: Implement YOLOv8 inference
        // This is a placeholder - integrate with your YOLOv8 Android implementation
        
        return emptyList()
    }}
    
    /**
     * Get class name by index
     */
    fun getClassName(classIndex: Int): String {{
        return if (classIndex in CLASS_NAMES.indices) {{
            CLASS_NAMES[classIndex]
        }} else {{
            "unknown"
        }}
    }}
    
    /**
     * Get severity level by class name
     */
    fun getSeverityLevel(className: String): String {{
        val index = CLASS_NAMES.indexOf(className)
        return if (index >= 0) SEVERITY_LEVELS[index] else "Unknown"
    }}
    
    /**
     * Get repair recommendation by class name
     */
    fun getRepairRecommendation(className: String): String {{
        val index = CLASS_NAMES.indexOf(className)
        return if (index >= 0) REPAIR_RECOMMENDATIONS[index] else "Consult a mechanic"
    }}
    
    /**
     * Get color by class name
     */
    fun getClassColor(className: String): Int {{
        val index = CLASS_NAMES.indexOf(className)
        return if (index >= 0) CLASS_COLORS[index] else 0xFF000000
    }}
}}'''
    
    # Save Kotlin code
    kotlin_file = android_dir / "MotorcycleDiagnosticModel.kt"
    with open(kotlin_file, 'w') as f:
        f.write(kotlin_code)
    
    # Generate model configuration
    model_config = {
        'model_info': {
            'name': 'Motorcycle Diagnostic Model',
            'version': '1.0',
            'classes': config['names'],
            'num_classes': config['nc'],
            'input_size': 640,
            'model_size': 'nano'
        },
        'android_config': {
            'target_device': 'Android',
            'optimization': 'Mobile-optimized',
            'inference_engine': 'TensorFlow Lite / ONNX Runtime',
            'recommended_formats': ['tflite', 'onnx'],
            'performance_target': '< 100ms inference time'
        },
        'class_details': {
            'broken_headlights_tail_lights': {
                'severity': 'Medium',
                'color': 'Yellow',
                'description': 'Broken, cracked, or non-functioning headlights and tail lights'
            },
            'broken_side_mirror': {
                'severity': 'Low',
                'color': 'Orange', 
                'description': 'Cracked, missing, or damaged side mirrors'
            },
            'flat_tire': {
                'severity': 'High',
                'color': 'Red',
                'description': 'Visibly flat, deflated, or damaged tires'
            },
            'oil_leak': {
                'severity': 'Critical',
                'color': 'Purple',
                'description': 'Visible oil stains, drips, or leaks on the motorcycle'
            }
        }
    }
    
    # Save model configuration
    config_file = android_dir / "model_config.yaml"
    with open(config_file, 'w') as f:
        yaml.dump(model_config, f, default_flow_style=False)
    
    print(f"   ✅ Android integration code generated in: {android_dir}")
    print(f"   📁 Files created:")
    print(f"      - MotorcycleDiagnosticModel.java")
    print(f"      - MotorcycleDiagnosticModel.kt") 
    print(f"      - model_config.yaml")

def main():
    """Main Android training function"""
    parser = argparse.ArgumentParser(description='Train YOLOv8 for Android motorcycle diagnostic')
    parser.add_argument('--model', type=str, default='n', choices=['n'],
                        help='Model size (n=nano for Android)')
    parser.add_argument('--epochs', type=int, default=150, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size')
    parser.add_argument('--img-size', type=int, default=640, help='Input image size')
    parser.add_argument('--device', type=str, default='auto', help='Device to use')
    parser.add_argument('--config', type=str, default='dataset/motorcycle_diagnostic.yaml',
                        help='Path to dataset configuration')
    
    args = parser.parse_args()
    
    try:
        # Setup environment
        setup_android_training_environment()
        
        # Train model
        model, train_results, val_results = train_android_model(
            model_size=args.model,
            config_path=args.config,
            epochs=args.epochs,
            batch_size=args.batch_size,
            img_size=args.img_size,
            device=args.device
        )
        
        print("\n🎉 Android training pipeline completed successfully!")
        print("📋 Next steps for Android integration:")
        print("   1. Use the exported .tflite or .onnx model in your Android app")
        print("   2. Integrate the generated Java/Kotlin code")
        print("   3. Test on Android devices")
        print("   4. Optimize for your specific hardware")
        print("   5. Deploy to AutoSOS Android app")
        
    except Exception as e:
        print(f"\n❌ Android training pipeline failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
