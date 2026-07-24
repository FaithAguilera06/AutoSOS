#!/usr/bin/env python3
"""
Retrain YOLOv8 with New Datasets
Processes the NewDatasets folder and retrains the model
"""

import os
import shutil
import yaml
import random
from pathlib import Path
from typing import List, Dict, Any
import cv2
import numpy as np
from sklearn.model_selection import train_test_split

class YOLOv8Retrainer:
    def __init__(self, new_datasets_path: str = "yolo-motorcycle-diagnostic-training/NewDatasets"):
        self.new_datasets_path = Path(new_datasets_path)
        self.output_dir = Path("yolo-motorcycle-diagnostic-training/dataset")
        self.class_mapping = {
            'broken headlights and tail lights': 'broken_headlights_tail_lights',
            'broken side mirror': 'broken_side_mirror',
            'Flat tire': 'flat_tire',
            'oil leaks': 'oil_leak'
        }
        
    def process_new_datasets(self):
        """Process the new datasets and organize them properly"""
        print("Processing New Datasets...")
        print("=" * 50)
        
        if not self.new_datasets_path.exists():
            print(f"ERROR: NewDatasets folder not found: {self.new_datasets_path}")
            return False
        
        # Create organized dataset structure
        organized_dir = Path("yolo-motorcycle-diagnostic-training/organized_dataset")
        organized_dir.mkdir(exist_ok=True)
        
        total_images = 0
        
        for folder_name, class_name in self.class_mapping.items():
            source_folder = self.new_datasets_path / folder_name
            target_folder = organized_dir / class_name
            
            if not source_folder.exists():
                print(f"WARNING: Folder not found: {folder_name}")
                continue
            
            # Create target directory
            target_folder.mkdir(exist_ok=True)
            
            # Copy images
            image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp']
            images = []
            for ext in image_extensions:
                images.extend(source_folder.glob(f"*{ext}"))
                images.extend(source_folder.glob(f"*{ext.upper()}"))
            
            copied_count = 0
            for img_path in images:
                try:
                    # Generate unique filename
                    counter = 1
                    new_name = img_path.name
                    while (target_folder / new_name).exists():
                        name_parts = img_path.stem, counter, img_path.suffix
                        new_name = f"{name_parts[0]}_{name_parts[1]}{name_parts[2]}"
                        counter += 1
                    
                    shutil.copy2(img_path, target_folder / new_name)
                    copied_count += 1
                    
                except Exception as e:
                    print(f"ERROR copying {img_path.name}: {e}")
            
            print(f"✅ {class_name}: {copied_count} images")
            total_images += copied_count
        
        print(f"\nTotal images processed: {total_images}")
        return True
    
    def create_annotations(self):
        """Create placeholder annotations for all images"""
        print("\nCreating Annotations...")
        print("=" * 30)
        
        organized_dir = Path("yolo-motorcycle-diagnostic-training/organized_dataset")
        
        for class_name in self.class_mapping.values():
            class_dir = organized_dir / class_name
            
            if not class_dir.exists():
                continue
            
            images = list(class_dir.glob("*.jpg")) + list(class_dir.glob("*.png")) + list(class_dir.glob("*.jpeg"))
            
            # Get class ID
            class_id = list(self.class_mapping.values()).index(class_name)
            
            annotation_count = 0
            for img_path in images:
                # Create corresponding label file
                label_path = class_dir / f"{img_path.stem}.txt"
                
                if not label_path.exists():
                    try:
                        # Read image to get dimensions
                        img = cv2.imread(str(img_path))
                        if img is not None:
                            height, width = img.shape[:2]
                            
                            # Create a placeholder annotation (center of image, 50% size)
                            x_center = 0.5
                            y_center = 0.5
                            bbox_width = 0.5
                            bbox_height = 0.5
                            
                            # Write YOLO format annotation
                            with open(label_path, 'w') as f:
                                f.write(f"{class_id} {x_center} {y_center} {bbox_width} {bbox_height}\n")
                            
                            annotation_count += 1
                            
                    except Exception as e:
                        print(f"ERROR creating annotation for {img_path.name}: {e}")
            
            print(f"✅ {class_name}: {annotation_count} annotations created")
    
    def prepare_training_dataset(self):
        """Prepare the final training dataset with train/val/test splits"""
        print("\nPreparing Training Dataset...")
        print("=" * 35)
        
        # Create directory structure
        directories = [
            self.output_dir / "images" / "train",
            self.output_dir / "images" / "val",
            self.output_dir / "images" / "test",
            self.output_dir / "labels" / "train",
            self.output_dir / "labels" / "val",
            self.output_dir / "labels" / "test"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
        
        organized_dir = Path("yolo-motorcycle-diagnostic-training/organized_dataset")
        
        # Process each class
        for class_name in self.class_mapping.values():
            class_dir = organized_dir / class_name
            
            if not class_dir.exists():
                continue
            
            # Get all images and labels
            images = list(class_dir.glob("*.jpg")) + list(class_dir.glob("*.png")) + list(class_dir.glob("*.jpeg"))
            labels = list(class_dir.glob("*.txt"))
            
            # Match images with labels
            valid_pairs = []
            for img_path in images:
                label_path = class_dir / f"{img_path.stem}.txt"
                if label_path.exists():
                    valid_pairs.append((img_path, label_path))
            
            if not valid_pairs:
                print(f"WARNING: No valid image-label pairs found for {class_name}")
                continue
            
            # Split into train/val/test (70/20/10)
            random.shuffle(valid_pairs)
            
            train_size = int(0.7 * len(valid_pairs))
            val_size = int(0.2 * len(valid_pairs))
            
            train_pairs = valid_pairs[:train_size]
            val_pairs = valid_pairs[train_size:train_size + val_size]
            test_pairs = valid_pairs[train_size + val_size:]
            
            # Copy files to respective directories
            for split_name, pairs in [("train", train_pairs), ("val", val_pairs), ("test", test_pairs)]:
                for img_path, label_path in pairs:
                    try:
                        # Copy image
                        shutil.copy2(img_path, self.output_dir / "images" / split_name / img_path.name)
                        # Copy label
                        shutil.copy2(label_path, self.output_dir / "labels" / split_name / label_path.name)
                    except Exception as e:
                        print(f"ERROR copying {img_path.name}: {e}")
                
                print(f"✅ {class_name} {split_name}: {len(pairs)} samples")
    
    def create_dataset_yaml(self):
        """Create the dataset configuration YAML file"""
        print("\nCreating Dataset Configuration...")
        print("=" * 40)
        
        yaml_content = {
            'path': str(self.output_dir.absolute()),
            'train': 'images/train',
            'val': 'images/val',
            'test': 'images/test',
            'nc': 4,
            'names': list(self.class_mapping.values())
        }
        
        yaml_path = self.output_dir / "motorcycle_diagnostic.yaml"
        with open(yaml_path, 'w') as f:
            yaml.dump(yaml_content, f, default_flow_style=False)
        
        print(f"✅ Dataset config created: {yaml_path}")
        return yaml_path
    
    def start_training(self, epochs: int = 150, batch_size: int = 32):
        """Start YOLOv8 training"""
        print(f"\nStarting YOLOv8 Training...")
        print("=" * 35)
        print(f"Epochs: {epochs}")
        print(f"Batch Size: {batch_size}")
        print()
        
        try:
            from ultralytics import YOLO
            
            # Load YOLOv8 model
            model = YOLO("yolov8n.pt")  # Start with nano model
            
            # Train the model
            results = model.train(
                data=str(self.output_dir / "motorcycle_diagnostic.yaml"),
                epochs=epochs,
                batch=batch_size,
                imgsz=640,
                device='cpu',  # Use CPU for compatibility
                project='yolo-motorcycle-diagnostic-training/runs',
                name='train_with_new_datasets',
                exist_ok=True
            )
            
            print("✅ Training completed successfully!")
            print(f"Results saved to: yolo-motorcycle-diagnostic-training/runs/train_with_new_datasets")
            
            return True
            
        except Exception as e:
            print(f"ERROR during training: {e}")
            return False
    
    def run_full_retraining(self, epochs: int = 150, batch_size: int = 32):
        """Run the complete retraining process"""
        print("YOLOv8 Retraining with New Datasets")
        print("=" * 50)
        
        # Step 1: Process new datasets
        if not self.process_new_datasets():
            return False
        
        # Step 2: Create annotations
        self.create_annotations()
        
        # Step 3: Prepare training dataset
        self.prepare_training_dataset()
        
        # Step 4: Create dataset config
        self.create_dataset_yaml()
        
        # Step 5: Start training
        return self.start_training(epochs, batch_size)

def main():
    """Main function"""
    print("YOLOv8 Retraining with New Datasets")
    print("=" * 50)
    
    retrainer = YOLOv8Retrainer()
    
    # Get training parameters
    try:
        epochs = int(input("Enter number of epochs (default 150): ") or "150")
        batch_size = int(input("Enter batch size (default 32): ") or "32")
    except ValueError:
        epochs = 150
        batch_size = 32
        print("Using default values: epochs=150, batch_size=32")
    
    print(f"\nStarting retraining with:")
    print(f"  Epochs: {epochs}")
    print(f"  Batch Size: {batch_size}")
    print(f"  New Datasets: yolo-motorcycle-diagnostic-training/NewDatasets")
    
    confirm = input("\nProceed with retraining? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Retraining cancelled.")
        return
    
    # Run retraining
    success = retrainer.run_full_retraining(epochs, batch_size)
    
    if success:
        print("\n🎉 Retraining completed successfully!")
        print("Your new model is ready to use in the AutoSOS system.")
    else:
        print("\n❌ Retraining failed. Check the error messages above.")

if __name__ == "__main__":
    main()
