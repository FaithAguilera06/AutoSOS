#!/usr/bin/env python3
"""
Google Drive Dataset Setup Script for Motorcycle Diagnostic Training
Downloads and organizes images from Google Drive for YOLOv8 training
"""

import os
import shutil
import requests
import zipfile
from pathlib import Path
from typing import List, Dict, Optional
import json
import yaml
from datetime import datetime

class GoogleDriveDatasetOrganizer:
    def __init__(self, download_dir: str = "raw_dataset"):
        self.download_dir = Path(download_dir)
        self.download_dir.mkdir(exist_ok=True)
        
        # Create organized directory structure
        self.organized_dir = Path("organized_dataset")
        self.organized_dir.mkdir(exist_ok=True)
        
        # Class mapping for 4 motorcycle issues
        self.class_names = [
            'broken_headlights_tail_lights',
            'broken_side_mirror', 
            'flat_tire',
            'oil_leak'
        ]
        
        # Create class directories
        for class_name in self.class_names:
            (self.organized_dir / class_name).mkdir(exist_ok=True)
    
    def download_from_google_drive(self, file_id: str, output_path: Path):
        """Download file from Google Drive using file ID"""
        print(f"📥 Downloading from Google Drive: {file_id}")
        
        # Google Drive direct download URL
        url = f"https://drive.google.com/uc?export=download&id={file_id}"
        
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            print(f"✅ Downloaded: {output_path}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to download {file_id}: {e}")
            return False
    
    def extract_zip_file(self, zip_path: Path, extract_to: Path):
        """Extract ZIP file to specified directory"""
        print(f"📦 Extracting: {zip_path}")
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_to)
            
            print(f"✅ Extracted to: {extract_to}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to extract {zip_path}: {e}")
            return False
    
    def organize_images_by_class(self, source_dir: Path, class_mapping: Dict[str, List[str]]):
        """
        Organize images into class directories based on filename patterns
        
        Args:
            source_dir: Directory containing raw images
            class_mapping: Dictionary mapping class names to filename patterns
        """
        print("🗂️ Organizing images by class...")
        
        # Supported image extensions
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
        
        # Find all images
        image_files = []
        for ext in image_extensions:
            image_files.extend(source_dir.rglob(f"*{ext}"))
            image_files.extend(source_dir.rglob(f"*{ext.upper()}"))
        
        print(f"📸 Found {len(image_files)} images")
        
        # Organize images
        organized_count = 0
        for image_file in image_files:
            filename = image_file.name.lower()
            
            # Find matching class
            matched_class = None
            for class_name, patterns in class_mapping.items():
                if any(pattern.lower() in filename for pattern in patterns):
                    matched_class = class_name
                    break
            
            if matched_class:
                # Copy to organized directory
                dest_dir = self.organized_dir / matched_class
                dest_file = dest_dir / image_file.name
                
                # Handle duplicate names
                counter = 1
                while dest_file.exists():
                    name_parts = image_file.stem, counter, image_file.suffix
                    dest_file = dest_dir / f"{name_parts[0]}_{name_parts[1]}{name_parts[2]}"
                    counter += 1
                
                shutil.copy2(image_file, dest_file)
                organized_count += 1
                print(f"   📁 {image_file.name} → {matched_class}/")
            else:
                print(f"   ⚠️  No class match for: {image_file.name}")
        
        print(f"✅ Organized {organized_count} images into class directories")
    
    def create_manual_organization_guide(self):
        """Create a guide for manual image organization"""
        guide_content = f"""# Manual Image Organization Guide

## Class Directories Created:
{chr(10).join([f"- {name}/" for name in self.class_names])}

## How to Organize Your Images:

### 1. Broken Headlights/Tail Lights
- **Directory**: `broken_headlights_tail_lights/`
- **What to include**:
  - Cracked or broken headlight lenses
  - Non-functioning headlights
  - Damaged tail lights
  - Missing light covers
- **Filename patterns**: headlight, head_light, tail_light, taillight, broken_light

### 2. Broken Side Mirror
- **Directory**: `broken_side_mirror/`
- **What to include**:
  - Cracked mirror glass
  - Missing mirrors
  - Damaged mirror housing
  - Loose or hanging mirrors
- **Filename patterns**: mirror, side_mirror, broken_mirror, cracked_mirror

### 3. Flat Tire
- **Directory**: `flat_tire/`
- **What to include**:
  - Visibly deflated tires
  - Completely flat tires
  - Tires with visible damage
  - Tires with low pressure
- **Filename patterns**: flat_tire, deflated, low_pressure, tire_damage

### 4. Oil Leak
- **Directory**: `oil_leak/`
- **What to include**:
  - Oil stains on ground
  - Oil dripping from motorcycle
  - Visible oil on engine/transmission
  - Oil puddles under motorcycle
- **Filename patterns**: oil_leak, oil_stain, oil_drip, oil_puddle

## Organization Steps:

1. **Download your Google Drive images** to the `raw_dataset/` folder
2. **Manually sort images** into the appropriate class directories
3. **Rename files** if needed for clarity
4. **Remove duplicates** and low-quality images
5. **Run the annotation script** to create YOLO format labels

## Tips:
- Aim for at least 100-200 images per class
- Include various angles and lighting conditions
- Mix different motorcycle types and models
- Ensure clear visibility of the issue in each image
- Remove images that are too blurry or unclear

## Next Steps:
After organizing, run:
```bash
python scripts/create_annotations.py --source organized_dataset --output dataset
```
"""
        
        guide_path = self.organized_dir / "ORGANIZATION_GUIDE.md"
        with open(guide_path, 'w') as f:
            f.write(guide_content)
        
        print(f"📋 Organization guide created: {guide_path}")
    
    def generate_dataset_statistics(self):
        """Generate statistics about the organized dataset"""
        stats = {}
        total_images = 0
        
        for class_name in self.class_names:
            class_dir = self.organized_dir / class_name
            if class_dir.exists():
                image_count = len(list(class_dir.glob("*")))
                stats[class_name] = image_count
                total_images += image_count
            else:
                stats[class_name] = 0
        
        stats['total'] = total_images
        
        # Save statistics
        stats_path = self.organized_dir / "dataset_statistics.json"
        with open(stats_path, 'w') as f:
            json.dump(stats, f, indent=2)
        
        # Print statistics
        print("\n📊 Dataset Statistics:")
        print(f"   Total Images: {total_images}")
        for class_name, count in stats.items():
            if class_name != 'total':
                print(f"   {class_name}: {count} images")
        
        print(f"\n📁 Statistics saved to: {stats_path}")
        return stats

def main():
    """Main function for Google Drive dataset setup"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Setup motorcycle diagnostic dataset from Google Drive')
    parser.add_argument('--download', action='store_true', help='Download from Google Drive')
    parser.add_argument('--file-id', type=str, help='Google Drive file ID')
    parser.add_argument('--organize', action='store_true', help='Organize downloaded images')
    parser.add_argument('--source', type=str, help='Source directory for organization')
    parser.add_argument('--auto-organize', action='store_true', help='Auto-organize using filename patterns')
    
    args = parser.parse_args()
    
    organizer = GoogleDriveDatasetOrganizer()
    
    try:
        if args.download and args.file_id:
            # Download from Google Drive
            zip_path = organizer.download_dir / "motorcycle_dataset.zip"
            if organizer.download_from_google_drive(args.file_id, zip_path):
                # Extract the downloaded file
                extract_dir = organizer.download_dir / "extracted"
                extract_dir.mkdir(exist_ok=True)
                organizer.extract_zip_file(zip_path, extract_dir)
        
        if args.organize:
            # Organize images
            source_dir = Path(args.source) if args.source else organizer.download_dir / "extracted"
            
            if args.auto_organize:
                # Auto-organize using filename patterns
                class_mapping = {
                    'broken_headlights_tail_lights': [
                        'headlight', 'head_light', 'tail_light', 'taillight', 
                        'broken_light', 'cracked_light', 'light_damage'
                    ],
                    'broken_side_mirror': [
                        'mirror', 'side_mirror', 'broken_mirror', 
                        'cracked_mirror', 'mirror_damage'
                    ],
                    'flat_tire': [
                        'flat_tire', 'deflated', 'low_pressure', 
                        'tire_damage', 'flat', 'tire'
                    ],
                    'oil_leak': [
                        'oil_leak', 'oil_stain', 'oil_drip', 
                        'oil_puddle', 'leak', 'oil'
                    ]
                }
                organizer.organize_images_by_class(source_dir, class_mapping)
            else:
                print("📋 Manual organization required")
                print("Please organize images into the following directories:")
                for class_name in organizer.class_names:
                    print(f"   - {organizer.organized_dir / class_name}")
        
        # Create organization guide
        organizer.create_manual_organization_guide()
        
        # Generate statistics
        organizer.generate_dataset_statistics()
        
        print("\n✅ Dataset setup completed!")
        print("📋 Next steps:")
        print("   1. Review organized images in each class directory")
        print("   2. Add/remove images as needed")
        print("   3. Run annotation creation script")
        print("   4. Start YOLOv8 training")
        
    except Exception as e:
        print(f"❌ Dataset setup failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
