#!/usr/bin/env python3
"""
Fixed Retraining Script for NewDatasets with Correct Folder Names
"""

import os
import shutil
import yaml
import random
from pathlib import Path

def process_newdatasets_fixed():
    """Process the NewDatasets with correct folder names"""
    print("Processing NewDatasets with Fixed Folder Names...")
    
    new_datasets_path = Path("yolo-motorcycle-diagnostic-training/NewDatasets")
    organized_dir = Path("yolo-motorcycle-diagnostic-training/organized_dataset")
    organized_dir.mkdir(exist_ok=True)
    
    # Correct folder name mapping
    class_mapping = {
        'broken_headlights_and_tail_lights': 'broken_headlights_tail_lights',
        'broken_side_mirror': 'broken_side_mirror',
        'flat_tire': 'flat_tire',
        'oil_leak': 'oil_leak'
    }
    
    total_images = 0
    
    for folder_name, class_name in class_mapping.items():
        source_folder = new_datasets_path / folder_name
        target_folder = organized_dir / class_name
        
        if not source_folder.exists():
            print(f"WARNING: Folder not found: {folder_name}")
            continue
        
        target_folder.mkdir(exist_ok=True)
        
        # Copy images and labels
        image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp']
        images = []
        labels = []
        
        for ext in image_extensions:
            images.extend(source_folder.glob(f"*{ext}"))
            images.extend(source_folder.glob(f"*{ext.upper()}"))
        
        labels.extend(source_folder.glob("*.txt"))
        
        copied_images = 0
        copied_labels = 0
        
        # Copy images
        for img_path in images:
            try:
                counter = 1
                new_name = img_path.name
                while (target_folder / new_name).exists():
                    name_parts = img_path.stem, counter, img_path.suffix
                    new_name = f"{name_parts[0]}_{name_parts[1]}{name_parts[2]}"
                    counter += 1
                
                shutil.copy2(img_path, target_folder / new_name)
                copied_images += 1
                
            except Exception as e:
                print(f"ERROR copying {img_path.name}: {e}")
        
        # Copy labels
        for label_path in labels:
            try:
                counter = 1
                new_name = label_path.name
                while (target_folder / new_name).exists():
                    name_parts = label_path.stem, counter, label_path.suffix
                    new_name = f"{name_parts[0]}_{name_parts[1]}{name_parts[2]}"
                    counter += 1
                
                shutil.copy2(label_path, target_folder / new_name)
                copied_labels += 1
                
            except Exception as e:
                print(f"ERROR copying {label_path.name}: {e}")
        
        print(f"✅ {class_name}: {copied_images} images, {copied_labels} labels")
        total_images += copied_images
    
    print(f"\nTotal images processed: {total_images}")
    return True

def prepare_training_dataset():
    """Prepare the final training dataset"""
    print("\nPreparing Training Dataset...")
    
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
            print(f"WARNING: No valid image-label pairs found for {class_name}")
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
            
            print(f"✅ {class_name} {split_name}: {len(pairs)} samples")

def create_dataset_yaml():
    """Create the dataset configuration YAML file"""
    print("\nCreating Dataset Configuration...")
    
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
    
    print(f"✅ Dataset config created: {yaml_path}")
    return yaml_path

def main():
    """Main function"""
    print("Fixed NewDatasets Retraining Script")
    print("=" * 40)
    
    # Step 1: Process NewDatasets with correct folder names
    process_newdatasets_fixed()
    
    # Step 2: Prepare training dataset
    prepare_training_dataset()
    
    # Step 3: Create dataset config
    create_dataset_yaml()
    
    print("\n✅ Dataset preparation completed!")
    print("Now run the training command:")
    print("cd yolo-motorcycle-diagnostic-training")
    print("python ..\\directml_fixed_train.py --epochs 150 --batch-size 32")

if __name__ == "__main__":
    main()
