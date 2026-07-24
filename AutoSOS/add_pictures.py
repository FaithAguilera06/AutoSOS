#!/usr/bin/env python3
"""
Simple tool to add more pictures to your YOLOv8 motorcycle diagnostic dataset
"""

import os
import shutil
from pathlib import Path

def show_current_dataset():
    """Show current dataset status"""
    print("Current Dataset Status:")
    print("=" * 40)
    
    dataset_path = Path("yolo-motorcycle-diagnostic-training/organized_dataset")
    
    classes = [
        'broken_headlights_tail_lights',
        'broken_side_mirror', 
        'flat_tire',
        'oil_leak'
    ]
    
    for class_name in classes:
        class_dir = dataset_path / class_name
        if class_dir.exists():
            images = list(class_dir.glob("*.jpg")) + list(class_dir.glob("*.png")) + list(class_dir.glob("*.jpeg"))
            print(f"{class_name}: {len(images)} images")
        else:
            print(f"{class_name}: 0 images (directory not found)")

def add_pictures_to_class():
    """Add pictures to a specific class"""
    print("\nAvailable Classes:")
    print("1. broken_headlights_tail_lights")
    print("2. broken_side_mirror")
    print("3. flat_tire")
    print("4. oil_leak")
    
    class_choice = input("\nEnter class number (1-4): ").strip()
    
    class_names = [
        'broken_headlights_tail_lights',
        'broken_side_mirror', 
        'flat_tire',
        'oil_leak'
    ]
    
    try:
        class_idx = int(class_choice) - 1
        if 0 <= class_idx < len(class_names):
            class_name = class_names[class_idx]
        else:
            print("Invalid class number")
            return
    except ValueError:
        print("Invalid input")
        return
    
    # Get source directory
    source_dir = input(f"\nEnter the folder path containing {class_name} images: ").strip()
    source_path = Path(source_dir)
    
    if not source_path.exists():
        print(f"ERROR: Directory not found: {source_dir}")
        return
    
    # Find all images in source directory
    image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp']
    new_images = []
    for ext in image_extensions:
        new_images.extend(source_path.glob(f"*{ext}"))
        new_images.extend(source_path.glob(f"*{ext.upper()}"))
    
    if not new_images:
        print(f"ERROR: No images found in {source_dir}")
        print("Supported formats: .jpg, .jpeg, .png, .bmp, .tiff, .webp")
        return
    
    print(f"\nFound {len(new_images)} images to add")
    
    # Create target directory
    target_dir = Path("yolo-motorcycle-diagnostic-training/organized_dataset") / class_name
    target_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy images
    copied_count = 0
    for img_path in new_images:
        try:
            # Generate unique filename
            counter = 1
            new_name = img_path.name
            while (target_dir / new_name).exists():
                name_parts = img_path.stem, counter, img_path.suffix
                new_name = f"{name_parts[0]}_{name_parts[1]}{name_parts[2]}"
                counter += 1
            
            shutil.copy2(img_path, target_dir / new_name)
            copied_count += 1
            print(f"Copied: {img_path.name} -> {new_name}")
            
        except Exception as e:
            print(f"ERROR copying {img_path.name}: {e}")
    
    print(f"\nSUCCESS: Added {copied_count} images to {class_name}")
    
    # Show updated count
    updated_images = list(target_dir.glob("*.jpg")) + list(target_dir.glob("*.png")) + list(target_dir.glob("*.jpeg"))
    print(f"Total images in {class_name}: {len(updated_images)}")

def main():
    """Main function"""
    print("Add Pictures to YOLOv8 Dataset")
    print("=" * 40)
    
    while True:
        print("\nOptions:")
        print("1. Show current dataset status")
        print("2. Add pictures to a class")
        print("3. Exit")
        
        choice = input("\nEnter choice (1-3): ").strip()
        
        if choice == "1":
            show_current_dataset()
        
        elif choice == "2":
            add_pictures_to_class()
        
        elif choice == "3":
            print("Goodbye!")
            break
        
        else:
            print("Invalid choice")

if __name__ == "__main__":
    main()
