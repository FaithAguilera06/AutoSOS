#!/usr/bin/env python3
"""
GPU-Optimized YOLOv8 Training Script
"""

import os
import yaml
import torch
from ultralytics import YOLO
from pathlib import Path
import argparse
import shutil

def check_gpu_availability():
    """Check if GPU is available"""
    if torch.cuda.is_available():
        gpu_count = torch.cuda.device_count()
        gpu_name = torch.cuda.get_device_name(0)
        print(f"✅ GPU Available: {gpu_name}")
        print(f"✅ GPU Count: {gpu_count}")
        return True
    else:
        print("❌ GPU not available, will use CPU")
        return False

def train_yolo_model_gpu(epochs=150, batch_size=32, model_size='n'):
    """Train YOLOv8 model with GPU acceleration"""
    print("Starting GPU YOLOv8 Training...")
    print("=" * 40)
    
    # Check GPU availability
    gpu_available = check_gpu_availability()
    device = '0' if gpu_available else 'cpu'
    
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
        
        results = model.train(
            data=str(dataset_path),
            epochs=epochs,
            batch=batch_size,
            imgsz=640,
            device=device,  # Use GPU if available
            project='runs',
            name='train_gpu_new_datasets',
            exist_ok=True,
            save=True,
            save_period=10,  # Save checkpoint every 10 epochs
            patience=50,     # Early stopping patience
            verbose=True,
            workers=8,       # Use multiple workers for data loading
            cache=True,      # Cache images for faster training
            amp=True         # Use automatic mixed precision for GPU
        )
        
        print("✅ Training completed successfully!")
        print(f"Results saved to: runs/train_gpu_new_datasets")
        
        # Copy the best model to models directory
        best_model_path = Path("runs/train_gpu_new_datasets/weights/best.pt")
        if best_model_path.exists():
            models_dir = Path("models")
            models_dir.mkdir(exist_ok=True)
            
            shutil.copy2(best_model_path, models_dir / "motorcycle_diagnostic_gpu.pt")
            print(f"✅ Best model copied to: models/motorcycle_diagnostic_gpu.pt")
        
        return True
        
    except Exception as e:
        print(f"❌ Training failed: {e}")
        return False

def main():
    """Main function"""
    print("GPU YOLOv8 Training Script")
    print("=" * 40)
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Train YOLOv8 with GPU for motorcycle diagnostic')
    parser.add_argument('--epochs', type=int, default=150, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size for training')
    parser.add_argument('--model-size', type=str, default='n', choices=['n', 's', 'm', 'l', 'x'], 
                       help='YOLOv8 model size (n=nano, s=small, m=medium, l=large, x=xlarge)')
    
    args = parser.parse_args()
    
    # Start training
    success = train_yolo_model_gpu(
        epochs=args.epochs,
        batch_size=args.batch_size,
        model_size=args.model_size
    )
    
    if success:
        print("\n🎉 GPU Training completed successfully!")
        print("Your new model is ready to use in the AutoSOS system.")
        print("\nTo use the new model:")
        print("1. Update your local backend service to use the new model")
        print("2. Or copy the model to your models directory")
    else:
        print("\n❌ Training failed. Check the error messages above.")

if __name__ == "__main__":
    main()
