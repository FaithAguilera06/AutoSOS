#!/usr/bin/env python3
"""
YOLOv8 Motorcycle Diagnostic Training Script
Trains YOLOv8 model for motorcycle part detection and issue identification
"""

import os
import yaml
import torch
import wandb
from ultralytics import YOLO
from pathlib import Path
import argparse
from datetime import datetime

def setup_training_environment():
    """Setup training environment and check requirements"""
    print("🚀 Setting up YOLOv8 Motorcycle Diagnostic Training Environment")
    
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
    
    print("✅ Environment setup complete")

def load_dataset_config(config_path):
    """Load and validate dataset configuration"""
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    print(f"📊 Dataset Configuration:")
    print(f"   Classes: {config['nc']}")
    print(f"   Train images: {config['train']}")
    print(f"   Validation images: {config['val']}")
    print(f"   Test images: {config['test']}")
    
    return config

def initialize_wandb(project_name="motorcycle-diagnostic", config=None):
    """Initialize Weights & Biases for experiment tracking"""
    try:
        wandb.init(
            project=project_name,
            name=f"yolov8-motorcycle-diagnostic-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            config=config,
            tags=["yolov8", "motorcycle", "diagnostic", "autosos"]
        )
        print("✅ Weights & Biases initialized")
        return True
    except Exception as e:
        print(f"⚠️  Weights & Biases initialization failed: {e}")
        return False

def train_model(model_size="n", config_path="dataset/motorcycle_diagnostic.yaml", 
                epochs=100, batch_size=16, img_size=640, device="auto"):
    """
    Train YOLOv8 model for motorcycle diagnostic
    
    Args:
        model_size: Model size ('n', 's', 'm', 'l', 'x')
        config_path: Path to dataset configuration
        epochs: Number of training epochs
        batch_size: Batch size for training
        img_size: Input image size
        device: Device to use ('auto', 'cpu', 'cuda', or specific GPU)
    """
    
    print(f"🎯 Starting YOLOv8{model_size} training for motorcycle diagnostic")
    
    # Load model
    model_name = f"yolov8{model_size}.pt"
    print(f"📦 Loading model: {model_name}")
    model = YOLO(model_name)
    
    # Load dataset configuration
    config = load_dataset_config(config_path)
    
    # Initialize experiment tracking
    wandb_available = initialize_wandb(config=config)
    
    # Training parameters
    train_params = {
        'data': config_path,
        'epochs': epochs,
        'batch': batch_size,
        'imgsz': img_size,
        'device': device,
        'workers': 8,
        'project': 'runs/train',
        'name': f'motorcycle_diagnostic_yolov8{model_size}',
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
    }
    
    # Add Weights & Biases integration if available
    if wandb_available:
        train_params['wandb'] = True
    
    print("🏋️ Starting training...")
    print(f"   Epochs: {epochs}")
    print(f"   Batch size: {batch_size}")
    print(f"   Image size: {img_size}")
    print(f"   Device: {device}")
    
    # Start training
    try:
        results = model.train(**train_params)
        
        print("✅ Training completed successfully!")
        
        # Print training results
        if hasattr(results, 'results_dict'):
            print("\n📊 Training Results:")
            for key, value in results.results_dict.items():
                print(f"   {key}: {value}")
        
        # Validate the model
        print("\n🔍 Validating model...")
        val_results = model.val()
        
        # Print validation results
        if hasattr(val_results, 'results_dict'):
            print("\n📈 Validation Results:")
            for key, value in val_results.results_dict.items():
                print(f"   {key}: {value}")
        
        # Export model for deployment
        print("\n📦 Exporting model for deployment...")
        export_formats = ['onnx', 'tflite', 'coreml']
        
        for fmt in export_formats:
            try:
                model.export(format=fmt)
                print(f"   ✅ Exported to {fmt.upper()}")
            except Exception as e:
                print(f"   ⚠️  Failed to export to {fmt.upper()}: {e}")
        
        # Save final model
        final_model_path = f"models/motorcycle_diagnostic_yolov8{model_size}.pt"
        os.makedirs("models", exist_ok=True)
        model.save(final_model_path)
        print(f"💾 Final model saved to: {final_model_path}")
        
        return model, results, val_results
        
    except Exception as e:
        print(f"❌ Training failed: {e}")
        raise e
    
    finally:
        if wandb_available:
            wandb.finish()

def main():
    """Main training function"""
    parser = argparse.ArgumentParser(description='Train YOLOv8 for motorcycle diagnostic')
    parser.add_argument('--model', type=str, default='n', choices=['n', 's', 'm', 'l', 'x'],
                        help='Model size (n=nano, s=small, m=medium, l=large, x=xlarge)')
    parser.add_argument('--epochs', type=int, default=100, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=16, help='Batch size')
    parser.add_argument('--img-size', type=int, default=640, help='Input image size')
    parser.add_argument('--device', type=str, default='auto', help='Device to use')
    parser.add_argument('--config', type=str, default='dataset/motorcycle_diagnostic.yaml',
                        help='Path to dataset configuration')
    
    args = parser.parse_args()
    
    try:
        # Setup environment
        setup_training_environment()
        
        # Train model
        model, train_results, val_results = train_model(
            model_size=args.model,
            config_path=args.config,
            epochs=args.epochs,
            batch_size=args.batch_size,
            img_size=args.img_size,
            device=args.device
        )
        
        print("\n🎉 Training pipeline completed successfully!")
        print("📋 Next steps:")
        print("   1. Review training metrics in runs/train/")
        print("   2. Test the model with sample images")
        print("   3. Integrate with AutoSOS diagnostic system")
        print("   4. Deploy to mobile devices")
        
    except Exception as e:
        print(f"\n❌ Training pipeline failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
