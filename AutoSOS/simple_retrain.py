#!/usr/bin/env python3
"""
Simple YOLOv8 Retraining Script - No Interactive Input
"""

import os
import shutil
import yaml
import random
from pathlib import Path

def process_new_datasets():
    """Process the new datasets and organize them properly"""
    print("Processing New Datasets...")
    
    new_datasets_path = Path("yolo-motorcycle-diagnostic-training/NewDatasets")
    organized_dir = Path("yolo-motorcycle-diagnostic-training/organized_dataset")
    organized_dir.mkdir(exist_ok=True)
    
    class_mapping = {
        'broken headlights and tail lights': 'broken_headlights_tail_lights',
        'broken side mirror': 'broken_side_mirror',
        'Flat tire': 'flat_tire',
        'oil leaks': 'oil_leak'
    }
    
    total_images = 0
    
    for folder_name, class_name in class_mapping.items():
        source_folder = new_datasets_path / folder_name
        target_folder = organized_dir / class_name
        
        if not source_folder.exists():
            print(f"WARNING: Folder not found: {folder_name}")
            continue
        
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
        
        print(f"Processed {class_name}: {copied_count} images")
        total_images += copied_count
    
    print(f"Total images processed: {total_images}")
    return True

def create_annotations():
    """Create placeholder annotations for all images"""
    print("Creating Annotations...")
    
    organized_dir = Path("yolo-motorcycle-diagnostic-training/organized_dataset")
    class_names = ['broken_headlights_tail_lights', 'broken_side_mirror', 'flat_tire', 'oil_leak']
    
    for class_id, class_name in enumerate(class_names):
        class_dir = organized_dir / class_name
        
        if not class_dir.exists():
            continue
        
        images = list(class_dir.glob("*.jpg")) + list(class_dir.glob("*.png")) + list(class_dir.glob("*.jpeg"))
        
        annotation_count = 0
        for img_path in images:
            label_path = class_dir / f"{img_path.stem}.txt"
            
            if not label_path.exists():
                try:
                    with open(label_path, 'w') as f:
                        f.write(f"{class_id} 0.5 0.5 0.5 0.5\n")
                    annotation_count += 1
                except Exception as e:
                    print(f"ERROR creating annotation for {img_path.name}: {e}")
        
        print(f"Created {annotation_count} annotations for {class_name}")

def prepare_training_dataset():
    """Prepare the final training dataset"""
    print("Preparing Training Dataset...")
    
    output_dir = Path("yolo-motorcycle-diagnostic-training/dataset")
    
    # Create directories
    directories = [
        output_dir / "images" / "train",
        output_dir / "images" / "val",
        output_dir / "images" / "test",
        output_dir / "labels" / "train",
        output_dir / "labels" / "val",
        output_dir / "labels" / "test"
    ]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
    
    organized_dir = Path("yolo-motorcycle-diagnostic-training/organized_dataset")
    class_names = ['broken_headlights_tail_lights', 'broken_side_mirror', 'flat_tire', 'oil_leak']
    
    for class_name in class_names:
        class_dir = organized_dir / class_name
        
        if not class_dir.exists():
            continue
        
        images = list(class_dir.glob("*.jpg")) + list(class_dir.glob("*.png")) + list(class_dir.glob("*.jpeg"))
        labels = list(class_dir.glob("*.txt"))
        
        # Match images with labels
        valid_pairs = []
        for img_path in images:
            label_path = class_dir / f"{img_path.stem}.txt"
            if label_path.exists():
                valid_pairs.append((img_path, label_path))
        
        if not valid_pairs:
            continue
        
        # Split into train/val/test (70/20/10)
        random.shuffle(valid_pairs)
        
        train_size = int(0.7 * len(valid_pairs))
        val_size = int(0.2 * len(valid_pairs))
        
        train_pairs = valid_pairs[:train_size]
        val_pairs = valid_pairs[train_size:train_size + val_size]
        test_pairs = valid_pairs[train_size + val_size:]
        
        # Copy files
        for split_name, pairs in [("train", train_pairs), ("val", val_pairs), ("test", test_pairs)]:
            for img_path, label_path in pairs:
                try:
                    shutil.copy2(img_path, output_dir / "images" / split_name / img_path.name)
                    shutil.copy2(label_path, output_dir / "labels" / split_name / label_path.name)
                except Exception as e:
                    print(f"ERROR copying {img_path.name}: {e}")
            
            print(f"{class_name} {split_name}: {len(pairs)} samples")

def create_dataset_yaml():
    """Create the dataset configuration YAML file"""
    print("Creating Dataset Configuration...")
    
    output_dir = Path("yolo-motorcycle-diagnostic-training/dataset")
    
    yaml_content = {
        'path': str(output_dir.absolute()),
        'train': 'images/train',
        'val': 'images/val',
        'test': 'images/test',
        'nc': 4,
        'names': ['broken_headlights_tail_lights', 'broken_side_mirror', 'flat_tire', 'oil_leak']
    }
    
    yaml_path = output_dir / "motorcycle_diagnostic.yaml"
    with open(yaml_path, 'w') as f:
        yaml.dump(yaml_content, f, default_flow_style=False)
    
    print(f"Dataset config created: {yaml_path}")
    return yaml_path

def main():
    """Main function - no interactive input"""
    print("YOLOv8 Retraining with New Datasets")
    print("=" * 50)
    
    # Step 1: Process new datasets
    process_new_datasets()
    
    # Step 2: Create annotations
    create_annotations()
    
    # Step 3: Prepare training dataset
    prepare_training_dataset()
    
    # Step 4: Create dataset config
    create_dataset_yaml()
    
    print("\nDataset preparation completed!")
    print("Now run the training command in PowerShell:")
    print("cd yolo-motorcycle-diagnostic-training")
    print("python train_android_yolo.py --epochs 150 --batch-size 32")

if __name__ == "__main__":
    main()
