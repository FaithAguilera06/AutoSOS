#!/usr/bin/env python3
"""
Force GPU Training Script for AMD GPU
Attempts to use GPU as primary training device
"""

import os
import yaml
import torch
from ultralytics import YOLO
from pathlib import Path
import argparse
import shutil

def force_gpu_training(epochs=150, batch_size=32, model_size='n'):
    """Force GPU training with AMD GPU"""
    print("Forcing GPU Training with AMD GPU...")
    print("=" * 45)
    
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
        
        # Try different GPU device configurations
        gpu_configs = [
            '0',  # Standard GPU device
            'cuda:0',  # CUDA device
            'privateuseone:0',  # DirectML device
            'dml:0',  # DirectML alternative
        ]
        
        device_used = None
        for device in gpu_configs:
            try:
                print(f"Trying device: {device}")
                
                # Test if device works
                test_tensor = torch.randn(2, 2).to(device)
                result = test_tensor * 2
                print(f"✅ Device {device} test successful!")
                device_used = device
                break
                
            except Exception as e:
                print(f"❌ Device {device} failed: {e}")
                continue
        
        if device_used is None:
            print("❌ No GPU device available, falling back to CPU")
            device_used = 'cpu'
        
        # Start training
        print(f"Training parameters:")
        print(f"  Epochs: {epochs}")
        print(f"  Batch Size: {batch_size}")
        print(f"  Model Size: {model_size}")
        print(f"  Device: {device_used}")
        print(f"  Dataset: {dataset_path}")
        print()
        
        # Training configuration
        train_config = {
            'data': str(dataset_path),
            'epochs': epochs,
            'batch': batch_size,
            'imgsz': 640,
            'device': device_used,
            'project': 'runs',
            'name': 'train_force_gpu',
            'exist_ok': True,
            'save': True,
            'save_period': 10,
            'patience': 50,
            'verbose': True,
            'workers': 8,
            'cache': True
        }
        
        # Add GPU-specific optimizations
        if device_used != 'cpu':
            train_config['amp'] = True  # Automatic mixed precision
        
        print(f"Starting training with device: {device_used}")
        results = model.train(**train_config)
        
        print("✅ Training completed successfully!")
        print(f"Results saved to: runs/train_force_gpu")
        
        # Copy the best model to models directory
        best_model_path = Path("runs/train_force_gpu/weights/best.pt")
        if best_model_path.exists():
            models_dir = Path("models")
            models_dir.mkdir(exist_ok=True)
            
            shutil.copy2(best_model_path, models_dir / "motorcycle_diagnostic_force_gpu.pt")
            print(f"✅ Best model copied to: models/motorcycle_diagnostic_force_gpu.pt")
        
        return True
        
    except Exception as e:
        print(f"❌ Training failed: {e}")
        return False

def main():
    """Main function"""
    print("Force GPU Training Script")
    print("=" * 30)
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Force GPU training with AMD GPU')
    parser.add_argument('--epochs', type=int, default=150, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size for training')
    parser.add_argument('--model-size', type=str, default='n', choices=['n', 's', 'm', 'l', 'x'], 
                       help='YOLOv8 model size (n=nano, s=small, m=medium, l=large, x=xlarge)')
    
    args = parser.parse_args()
    
    # Start training
    success = force_gpu_training(
        epochs=args.epochs,
        batch_size=args.batch_size,
        model_size=args.model_size
    )
    
    if success:
        print("\n🎉 Force GPU Training completed successfully!")
        print("Your new model is ready to use in the AutoSOS system.")
    else:
        print("\n❌ Training failed. Check the error messages above.")

if __name__ == "__main__":
    main()
