#!/usr/bin/env python3
"""
AMD GPU YOLOv8 Training Script using ROCm
"""

import os
import yaml
import torch
from ultralytics import YOLO
from pathlib import Path
import argparse
import shutil

def check_amd_gpu_availability():
    """Check if AMD GPU with ROCm is available"""
    try:
        # Check if ROCm is available
        if hasattr(torch.version, 'hip') and torch.version.hip is not None:
            print(f"✅ ROCm Available: {torch.version.hip}")
            return True
        elif torch.cuda.is_available():
            # Sometimes AMD GPUs show up as CUDA devices
            print(f"✅ CUDA Available (might be AMD GPU): {torch.cuda.device_count()} devices")
            return True
        else:
            print("❌ No GPU acceleration available")
            return False
    except Exception as e:
        print(f"❌ Error checking GPU: {e}")
        return False

def check_amd_gpu_info():
    """Get AMD GPU information"""
    try:
        import subprocess
        result = subprocess.run(['wmic', 'path', 'win32_VideoController', 'get', 'name'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if 'amd' in line.lower() or 'radeon' in line.lower():
                    print(f"✅ AMD GPU Found: {line.strip()}")
                    return True
        return False
    except:
        return False

def train_yolo_model_amd_gpu(epochs=150, batch_size=32, model_size='n'):
    """Train YOLOv8 model with AMD GPU"""
    print("Starting AMD GPU YOLOv8 Training...")
    print("=" * 40)
    
    # Check GPU availability
    amd_gpu_available = check_amd_gpu_availability()
    check_amd_gpu_info()
    
    # Determine device
    if amd_gpu_available:
        device = '0'  # Try GPU first
        print("🚀 Using AMD GPU for training")
    else:
        device = 'cpu'
        print("⚠️ Falling back to CPU training")
    
    # Check if dataset exists
    dataset_path = Path("dataset/motorcycle_diagnostic.yaml")
    if not dataset_path.exists():
        print(f"ERROR: Dataset file not found: {dataset_path}")
        print("Please run the dataset preparation script first.")
        return False
    
    try:
        # Load YOLOv8 model
        model_name = f"yolov8{model_size}.pt"
        print(f"Loading model: {model_name}")
        model = YOLO(model_name)
        
        # Start training
        print(f"Training parameters:")
        print(f"  Epochs: {epochs}")
        print(f"  Batch Size: {batch_size}")
        print(f"  Model Size: {model_size}")
        print(f"  Device: {device}")
        print(f"  Dataset: {dataset_path}")
        print()
        
        # Training configuration
        train_config = {
            'data': str(dataset_path),
            'epochs': epochs,
            'batch': batch_size,
            'imgsz': 640,
            'device': device,
            'project': 'runs',
            'name': 'train_amd_gpu',
            'exist_ok': True,
            'save': True,
            'save_period': 10,
            'patience': 50,
            'verbose': True,
            'workers': 8,
            'cache': True
        }
        
        # Add GPU-specific optimizations if available
        if amd_gpu_available:
            train_config['amp'] = True  # Automatic mixed precision
        
        results = model.train(**train_config)
        
        print("✅ Training completed successfully!")
        print(f"Results saved to: runs/train_amd_gpu")
        
        # Copy the best model to models directory
        best_model_path = Path("runs/train_amd_gpu/weights/best.pt")
        if best_model_path.exists():
            models_dir = Path("models")
            models_dir.mkdir(exist_ok=True)
            
            shutil.copy2(best_model_path, models_dir / "motorcycle_diagnostic_amd.pt")
            print(f"✅ Best model copied to: models/motorcycle_diagnostic_amd.pt")
        
        return True
        
    except Exception as e:
        print(f"❌ Training failed: {e}")
        print("Falling back to CPU training...")
        
        # Fallback to CPU
        try:
            results = model.train(
                data=str(dataset_path),
                epochs=epochs,
                batch=batch_size,
                imgsz=640,
                device='cpu',
                project='runs',
                name='train_amd_fallback_cpu',
                exist_ok=True,
                save=True,
                verbose=True
            )
            print("✅ CPU fallback training completed!")
            return True
        except Exception as cpu_error:
            print(f"❌ CPU fallback also failed: {cpu_error}")
            return False

def main():
    """Main function"""
    print("AMD GPU YOLOv8 Training Script")
    print("=" * 40)
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Train YOLOv8 with AMD GPU')
    parser.add_argument('--epochs', type=int, default=150, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size for training')
    parser.add_argument('--model-size', type=str, default='n', choices=['n', 's', 'm', 'l', 'x'], 
                       help='YOLOv8 model size (n=nano, s=small, m=medium, l=large, x=xlarge)')
    
    args = parser.parse_args()
    
    # Start training
    success = train_yolo_model_amd_gpu(
        epochs=args.epochs,
        batch_size=args.batch_size,
        model_size=args.model_size
    )
    
    if success:
        print("\n🎉 AMD GPU Training completed successfully!")
        print("Your new model is ready to use in the AutoSOS system.")
    else:
        print("\n❌ Training failed. Check the error messages above.")

if __name__ == "__main__":
    main()
