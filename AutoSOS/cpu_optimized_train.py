#!/usr/bin/env python3
"""
CPU-Optimized YOLOv8 Training Script
Optimized for systems without GPU acceleration
"""

import os
import yaml
import torch
from ultralytics import YOLO
from pathlib import Path
import argparse
import shutil

def train_yolo_model_cpu_optimized(epochs=100, batch_size=16, model_size='n'):
    """Train YOLOv8 model with CPU optimizations"""
    print("Starting CPU-Optimized YOLOv8 Training...")
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
        
        # Start training with CPU optimizations
        print(f"Training parameters:")
        print(f"  Epochs: {epochs}")
        print(f"  Batch Size: {batch_size}")
        print(f"  Model Size: {model_size}")
        print(f"  Device: CPU (optimized)")
        print(f"  Dataset: {dataset_path}")
        print()
        
        results = model.train(
            data=str(dataset_path),
            epochs=epochs,
            batch=batch_size,
            imgsz=640,
            device='cpu',
            project='runs',
            name='train_cpu_optimized',
            exist_ok=True,
            save=True,
            save_period=20,  # Save checkpoint every 20 epochs
            patience=30,     # Early stopping patience
            verbose=True,
            workers=4,       # Use 4 workers for data loading
            cache=True,      # Cache images for faster training
            close_mosaic=10  # Close mosaic augmentation in last 10 epochs
        )
        
        print("✅ Training completed successfully!")
        print(f"Results saved to: runs/train_cpu_optimized")
        
        # Copy the best model to models directory
        best_model_path = Path("runs/train_cpu_optimized/weights/best.pt")
        if best_model_path.exists():
            models_dir = Path("models")
            models_dir.mkdir(exist_ok=True)
            
            shutil.copy2(best_model_path, models_dir / "motorcycle_diagnostic_cpu.pt")
            print(f"✅ Best model copied to: models/motorcycle_diagnostic_cpu.pt")
        
        return True
        
    except Exception as e:
        print(f"❌ Training failed: {e}")
        return False

def main():
    """Main function"""
    print("CPU-Optimized YOLOv8 Training Script")
    print("=" * 45)
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Train YOLOv8 with optimized CPU settings')
    parser.add_argument('--epochs', type=int, default=100, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=16, help='Batch size for training')
    parser.add_argument('--model-size', type=str, default='n', choices=['n', 's', 'm', 'l', 'x'], 
                       help='YOLOv8 model size (n=nano, s=small, m=medium, l=large, x=xlarge)')
    
    args = parser.parse_args()
    
    # Start training
    success = train_yolo_model_cpu_optimized(
        epochs=args.epochs,
        batch_size=args.batch_size,
        model_size=args.model_size
    )
    
    if success:
        print("\n🎉 CPU Training completed successfully!")
        print("Your new model is ready to use in the AutoSOS system.")
    else:
        print("\n❌ Training failed. Check the error messages above.")

if __name__ == "__main__":
    main()
