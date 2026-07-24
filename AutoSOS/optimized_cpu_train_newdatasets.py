#!/usr/bin/env python3
"""
Optimized CPU Training Script for NewDatasets
Uses the NewDatasets folder directly for training
"""

import os
import yaml
import torch
from ultralytics import YOLO
from pathlib import Path
import argparse
import shutil
from sklearn.model_selection import train_test_split

def create_yaml_from_newdatasets():
    """Create YAML config from NewDatasets folder"""
    print("Creating YAML config from NewDatasets...")
    
    # Define class mapping
    class_mapping = {
        'broken_headlights_tail_lights': 0,
        'broken_side_mirror': 1,
        'flat_tire': 2,
        'oil_leak': 3
    }
    
    # Create dataset structure
    dataset_dir = Path("dataset")
    dataset_dir.mkdir(exist_ok=True)
    
    # Create subdirectories
    for split in ['train', 'val', 'test']:
        (dataset_dir / split / 'images').mkdir(parents=True, exist_ok=True)
        (dataset_dir / split / 'labels').mkdir(parents=True, exist_ok=True)
    
    # Process each class
    newdatasets_dir = Path("NewDatasets")
    total_images = 0
    
    for class_name, class_id in class_mapping.items():
        class_dir = newdatasets_dir / class_name
        if not class_dir.exists():
            print(f"Warning: {class_name} folder not found")
            continue
            
        # Get all images
        image_files = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.webp']:
            image_files.extend(class_dir.glob(ext))
        
        print(f"Processing {class_name}: {len(image_files)} images")
        
        # Split images: 70% train, 20% val, 10% test
        train_imgs, temp_imgs = train_test_split(image_files, test_size=0.3, random_state=42)
        val_imgs, test_imgs = train_test_split(temp_imgs, test_size=0.33, random_state=42)
        
        # Copy images and labels
        for split, images in [('train', train_imgs), ('val', val_imgs), ('test', test_imgs)]:
            for img_path in images:
                # Copy image
                img_dest = dataset_dir / split / 'images' / img_path.name
                shutil.copy2(img_path, img_dest)
                
                # Copy label if exists
                label_path = img_path.with_suffix('.txt')
                if label_path.exists():
                    label_dest = dataset_dir / split / 'labels' / label_path.name
                    shutil.copy2(label_path, label_dest)
                
                total_images += 1
    
    # Create YAML file
    yaml_content = {
        'path': str(dataset_dir.absolute()),
        'train': 'train/images',
        'val': 'val/images',
        'test': 'test/images',
        'nc': len(class_mapping),
        'names': list(class_mapping.keys())
    }
    
    yaml_path = dataset_dir / 'motorcycle_diagnostic.yaml'
    with open(yaml_path, 'w') as f:
        yaml.dump(yaml_content, f, default_flow_style=False)
    
    print(f"✅ Dataset created: {total_images} images")
    print(f"✅ YAML config: {yaml_path}")
    return yaml_path

def train_yolo_optimized_cpu(epochs=150, batch_size=16, model_size='n'):
    """Train YOLOv8 model with optimized CPU settings"""
    print("========================================")
    print("🚀 Starting Optimized CPU YOLOv8 Training")
    print("========================================")
    
    # Create dataset from NewDatasets
    dataset_path = create_yaml_from_newdatasets()
    
    try:
        # Load YOLOv8 model
        model_name = f"yolov8{model_size}.pt"
        print(f"Loading model: {model_name}")
        model = YOLO(model_name)
        
        # Training parameters
        print(f"Training parameters:")
        print(f"  Epochs: {epochs}")
        print(f"  Batch Size: {batch_size}")
        print(f"  Model Size: {model_size}")
        print(f"  Device: CPU (Optimized)")
        print(f"  Dataset: {dataset_path}")
        print()
        
        # Optimized CPU training configuration
        results = model.train(
            data=str(dataset_path),
            epochs=epochs,
            batch=batch_size,
            imgsz=640,
            device='cpu',
            project='runs',
            name='train_optimized_cpu_newdatasets',
            exist_ok=True,
            save=True,
            save_period=10,
            patience=50,
            verbose=True,
            workers=4,  # Optimized for CPU
            cache=True,  # Cache images for faster training
            amp=False,   # Disable AMP for CPU
            cos_lr=True, # Cosine learning rate scheduler
            close_mosaic=10,  # Close mosaic augmentation in last 10 epochs
            lr0=0.01,    # Initial learning rate
            lrf=0.01,    # Final learning rate
            momentum=0.937,
            weight_decay=0.0005,
            warmup_epochs=3,
            warmup_momentum=0.8,
            warmup_bias_lr=0.1
        )
        
        print("✅ Optimized CPU Training completed successfully!")
        print(f"Results saved to: runs/train_optimized_cpu_newdatasets")
        
        # Copy the best model to models directory
        best_model_path = Path("runs/train_optimized_cpu_newdatasets/weights/best.pt")
        if best_model_path.exists():
            models_dir = Path("models")
            models_dir.mkdir(exist_ok=True)
            
            shutil.copy2(best_model_path, models_dir / "motorcycle_diagnostic_optimized_cpu.pt")
            print(f"✅ Best model copied to: models/motorcycle_diagnostic_optimized_cpu.pt")
        
        return True
        
    except Exception as e:
        print(f"❌ Training failed: {e}")
        return False

def main():
    """Main function"""
    print("Optimized CPU YOLOv8 Training Script for NewDatasets")
    print("=" * 60)
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Train YOLOv8 with optimized CPU using NewDatasets')
    parser.add_argument('--epochs', type=int, default=150, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=16, help='Batch size for training')
    parser.add_argument('--model-size', type=str, default='n', choices=['n', 's', 'm', 'l', 'x'], 
                       help='YOLOv8 model size (n=nano, s=small, m=medium, l=large, x=xlarge)')
    
    args = parser.parse_args()
    
    # Start training
    success = train_yolo_optimized_cpu(
        epochs=args.epochs,
        batch_size=args.batch_size,
        model_size=args.model_size
    )
    
    if success:
        print("\n🎉 Optimized CPU Training completed successfully!")
        print("Your new model is ready to use in the AutoSOS system.")
    else:
        print("\n❌ Training failed. Check the error messages above.")

if __name__ == "__main__":
    main()
