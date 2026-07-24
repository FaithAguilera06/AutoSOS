#!/usr/bin/env python3
"""
DirectML AMD GPU YOLOv8 Training Script
Uses torch_directml for proper AMD GPU acceleration
"""

import os
import yaml
import torch
import torch_directml
from ultralytics import YOLO
from pathlib import Path
import argparse
import shutil

def train_yolo_directml_amd(epochs=150, batch_size=32, model_size='n'):
    """Train YOLOv8 model with DirectML AMD GPU"""
    print("========================================")
    print("🚀 Starting YOLOv8 Training with AMD GPU (DirectML)")
    print("========================================")
    
    # 1️⃣ Initialize DirectML device
    dml = torch_directml.device()
    print(f"✅ Using DirectML device: {dml}")
    
    # 2️⃣ Test DirectML functionality
    try:
        test_tensor = torch.randn(2, 2).to(dml)
        result = test_tensor * 2
        print(f"✅ DirectML test successful! Result shape: {result.shape}")
    except Exception as e:
        print(f"❌ DirectML test failed: {e}")
        return False
    
    # 3️⃣ Check if dataset exists
    dataset_path = Path("dataset/motorcycle_diagnostic.yaml")
    if not dataset_path.exists():
        print(f"ERROR: Dataset file not found: {dataset_path}")
        print("Please run the dataset preparation script first.")
        return False
    
    try:
        # 4️⃣ Load YOLOv8 model
        model_name = f"yolov8{model_size}.pt"
        print(f"Loading model: {model_name}")
        model = YOLO(model_name)
        
        # 5️⃣ Move model to DirectML device
        print(f"Moving model to DirectML device: {dml}")
        model.model = model.model.to(dml)
        
        # 6️⃣ Training configuration
        print(f"Training parameters:")
        print(f"  Epochs: {epochs}")
        print(f"  Batch Size: {batch_size}")
        print(f"  Model Size: {model_size}")
        print(f"  Device: {dml}")
        print(f"  Dataset: {dataset_path}")
        print()
        
        # 7️⃣ Start training with DirectML
        results = model.train(
            data=str(dataset_path),
            epochs=epochs,
            batch=batch_size,
            imgsz=640,
            device=dml,  # Use DirectML device
            project='runs',
            name='train_directml_amd',
            exist_ok=True,
            save=True,
            save_period=10,
            patience=50,
            verbose=True,
            workers=8,
            cache=True,
            amp=True  # Automatic mixed precision for GPU
        )
        
        print("✅ DirectML AMD GPU Training completed successfully!")
        print(f"Results saved to: runs/train_directml_amd")
        
        # 8️⃣ Copy the best model to models directory
        best_model_path = Path("runs/train_directml_amd/weights/best.pt")
        if best_model_path.exists():
            models_dir = Path("models")
            models_dir.mkdir(exist_ok=True)
            
            shutil.copy2(best_model_path, models_dir / "motorcycle_diagnostic_directml.pt")
            print(f"✅ Best model copied to: models/motorcycle_diagnostic_directml.pt")
        
        return True
        
    except Exception as e:
        print(f"❌ DirectML training failed: {e}")
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
                name='train_directml_fallback_cpu',
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
    print("DirectML AMD GPU YOLOv8 Training Script")
    print("=" * 50)
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Train YOLOv8 with DirectML AMD GPU')
    parser.add_argument('--epochs', type=int, default=150, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size for training')
    parser.add_argument('--model-size', type=str, default='n', choices=['n', 's', 'm', 'l', 'x'], 
                       help='YOLOv8 model size (n=nano, s=small, m=medium, l=large, x=xlarge)')
    
    args = parser.parse_args()
    
    # Start training
    success = train_yolo_directml_amd(
        epochs=args.epochs,
        batch_size=args.batch_size,
        model_size=args.model_size
    )
    
    if success:
        print("\n🎉 DirectML AMD GPU Training completed successfully!")
        print("Your new model is ready to use in the AutoSOS system.")
    else:
        print("\n❌ Training failed. Check the error messages above.")

if __name__ == "__main__":
    main()
