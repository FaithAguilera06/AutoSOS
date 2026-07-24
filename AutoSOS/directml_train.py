#!/usr/bin/env python3
"""
DirectML YOLOv8 Training Script for AMD GPU on Windows
"""

import os
import yaml
import torch
from ultralytics import YOLO
from pathlib import Path
import argparse
import shutil

def setup_directml():
    """Setup DirectML for AMD GPU"""
    try:
        import torch_directml
        device = torch_directml.device()
        print(f"✅ DirectML device available: {device}")
        return device
    except ImportError:
        print("❌ DirectML not available. Install with: pip install torch-directml")
        return None
    except Exception as e:
        print(f"❌ DirectML error: {e}")
        return None

def train_yolo_model_directml(epochs=150, batch_size=32, model_size='n'):
    """Train YOLOv8 model with DirectML"""
    print("Starting DirectML YOLOv8 Training...")
    print("=" * 40)
    
    # Setup DirectML
    device = setup_directml()
    if device is None:
        print("Falling back to CPU training...")
        device = 'cpu'
    
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
            'name': 'train_directml',
            'exist_ok': True,
            'save': True,
            'save_period': 10,
            'patience': 50,
            'verbose': True,
            'workers': 8,
            'cache': True
        }
        
        results = model.train(**train_config)
        
        print("✅ Training completed successfully!")
        print(f"Results saved to: runs/train_directml")
        
        # Copy the best model to models directory
        best_model_path = Path("runs/train_directml/weights/best.pt")
        if best_model_path.exists():
            models_dir = Path("models")
            models_dir.mkdir(exist_ok=True)
            
            shutil.copy2(best_model_path, models_dir / "motorcycle_diagnostic_directml.pt")
            print(f"✅ Best model copied to: models/motorcycle_diagnostic_directml.pt")
        
        return True
        
    except Exception as e:
        print(f"❌ Training failed: {e}")
        return False

def main():
    """Main function"""
    print("DirectML YOLOv8 Training Script")
    print("=" * 40)
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Train YOLOv8 with DirectML')
    parser.add_argument('--epochs', type=int, default=150, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size for training')
    parser.add_argument('--model-size', type=str, default='n', choices=['n', 's', 'm', 'l', 'x'], 
                       help='YOLOv8 model size (n=nano, s=small, m=medium, l=large, x=xlarge)')
    
    args = parser.parse_args()
    
    # Start training
    success = train_yolo_model_directml(
        epochs=args.epochs,
        batch_size=args.batch_size,
        model_size=args.model_size
    )
    
    if success:
        print("\n🎉 DirectML Training completed successfully!")
        print("Your new model is ready to use in the AutoSOS system.")
    else:
        print("\n❌ Training failed. Check the error messages above.")

if __name__ == "__main__":
    main()
