#!/usr/bin/env python3
"""
Process ZIP Dataset Script for Motorcycle Diagnostic Training
Processes a ZIP file containing 4 folders for the 4 motorcycle problems
"""

import os
import shutil
import zipfile
from pathlib import Path
from typing import List, Dict, Optional
import json
import yaml
from datetime import datetime

class ZipDatasetProcessor:
    def __init__(self, zip_path: str, output_dir: str = "organized_dataset"):
        self.zip_path = Path(zip_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Expected folder names for 4 motorcycle problems
        self.expected_folders = [
            'broken_headlights_tail_lights',
            'broken_side_mirror', 
            'flat_tire',
            'oil_leak'
        ]
        
        # Alternative folder names that might be used
        self.folder_mappings = {
            # Headlights variations
            'headlights': 'broken_headlights_tail_lights',
            'head_light': 'broken_headlights_tail_lights',
            'tail_light': 'broken_headlights_tail_lights',
            'taillight': 'broken_headlights_tail_lights',
            'broken_light': 'broken_headlights_tail_lights',
            'light_damage': 'broken_headlights_tail_lights',
            'lights': 'broken_headlights_tail_lights',
            'broken headlights and tail lights': 'broken_headlights_tail_lights',
            
            # Mirror variations
            'mirror': 'broken_side_mirror',
            'side_mirror': 'broken_side_mirror',
            'broken_mirror': 'broken_side_mirror',
            'cracked_mirror': 'broken_side_mirror',
            'mirror_damage': 'broken_side_mirror',
            'mirrors': 'broken_side_mirror',
            'broken side mirror': 'broken_side_mirror',
            
            # Tire variations
            'tire': 'flat_tire',
            'tires': 'flat_tire',
            'flat': 'flat_tire',
            'deflated': 'flat_tire',
            'low_pressure': 'flat_tire',
            'tire_damage': 'flat_tire',
            'wheel': 'flat_tire',
            'wheels': 'flat_tire',
            'flat tire': 'flat_tire',
            
            # Oil leak variations
            'oil': 'oil_leak',
            'leak': 'oil_leak',
            'oil_stain': 'oil_leak',
            'oil_drip': 'oil_leak',
            'oil_puddle': 'oil_leak',
            'fluid_leak': 'oil_leak',
            'engine_oil': 'oil_leak',
            'oil leaks': 'oil_leak'
        }
    
    def extract_zip(self) -> bool:
        """Extract the ZIP file"""
        print(f"📦 Extracting ZIP file: {self.zip_path}")
        
        try:
            with zipfile.ZipFile(self.zip_path, 'r') as zip_ref:
                zip_ref.extractall(self.output_dir)
            
            print(f"✅ Extracted to: {self.output_dir}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to extract ZIP: {e}")
            return False
    
    def analyze_folder_structure(self) -> Dict[str, List[str]]:
        """Analyze the folder structure in the extracted ZIP"""
        print("🔍 Analyzing folder structure...")
        
        folder_analysis = {}
        
        # Find all folders in the extracted directory (including nested ones)
        for item in self.output_dir.rglob('*'):
            if item.is_dir():
                folder_name = item.name.lower().replace(' ', '_').replace('-', '_')
                
                # Check if it matches expected folders
                if folder_name in self.expected_folders:
                    folder_analysis[folder_name] = list(item.iterdir())
                else:
                    # Check if it matches any of the alternative names
                    mapped_name = self.folder_mappings.get(folder_name)
                    if mapped_name:
                        folder_analysis[mapped_name] = list(item.iterdir())
                    else:
                        # Also check the original folder name (with spaces)
                        original_name = item.name.lower()
                        mapped_name = self.folder_mappings.get(original_name)
                        if mapped_name:
                            folder_analysis[mapped_name] = list(item.iterdir())
                        else:
                            print(f"⚠️  Unknown folder: {item.name}")
        
        return folder_analysis
    
    def organize_images(self, folder_analysis: Dict[str, List[str]]) -> bool:
        """Organize images into the correct class directories"""
        print("🗂️ Organizing images into class directories...")
        
        # Create class directories
        for class_name in self.expected_folders:
            class_dir = self.output_dir / class_name
            class_dir.mkdir(exist_ok=True)
        
        # Supported image extensions
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
        
        total_images = 0
        organized_images = 0
        
        for class_name, items in folder_analysis.items():
            class_dir = self.output_dir / class_name
            
            for item in items:
                if item.is_file() and item.suffix.lower() in image_extensions:
                    total_images += 1
                    
                    # Copy image to class directory
                    dest_file = class_dir / item.name
                    
                    # Handle duplicate names
                    counter = 1
                    while dest_file.exists():
                        name_parts = item.stem, counter, item.suffix
                        dest_file = class_dir / f"{name_parts[0]}_{name_parts[1]}{name_parts[2]}"
                        counter += 1
                    
                    shutil.copy2(item, dest_file)
                    organized_images += 1
                    print(f"   📁 {item.name} → {class_name}/")
        
        print(f"✅ Organized {organized_images}/{total_images} images")
        return organized_images > 0
    
    def generate_dataset_statistics(self) -> Dict[str, int]:
        """Generate statistics about the organized dataset"""
        print("📊 Generating dataset statistics...")
        
        stats = {}
        total_images = 0
        
        for class_name in self.expected_folders:
            class_dir = self.output_dir / class_name
            if class_dir.exists():
                # Count images
                image_count = len([f for f in class_dir.iterdir() 
                                 if f.is_file() and f.suffix.lower() in {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}])
                stats[class_name] = image_count
                total_images += image_count
            else:
                stats[class_name] = 0
        
        stats['total'] = total_images
        
        # Save statistics
        stats_path = self.output_dir / "dataset_statistics.json"
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
    
    def create_organization_report(self, folder_analysis: Dict[str, List[str]], stats: Dict[str, int]):
        """Create a detailed organization report"""
        report_content = f"""# Dataset Organization Report

## Summary
- **Source ZIP**: {self.zip_path.name}
- **Extraction Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- **Total Images**: {stats['total']}

## Class Distribution
"""
        
        for class_name, count in stats.items():
            if class_name != 'total':
                percentage = (count / stats['total'] * 100) if stats['total'] > 0 else 0
                report_content += f"- **{class_name.replace('_', ' ').title()}**: {count} images ({percentage:.1f}%)\n"
        
        report_content += f"""
## Folder Analysis
"""
        
        for class_name, items in folder_analysis.items():
            report_content += f"### {class_name.replace('_', ' ').title()}\n"
            report_content += f"- **Items found**: {len(items)}\n"
            report_content += f"- **Images**: {stats.get(class_name, 0)}\n"
            report_content += f"- **Directory**: `{self.output_dir / class_name}`\n\n"
        
        report_content += f"""
## Next Steps

1. **Review the organized images** in each class directory
2. **Add more images** if any class has fewer than 100 images
3. **Remove low-quality images** (blurry, unclear, etc.)
4. **Create annotations** using the annotation tool
5. **Start training** with YOLOv8

## Commands to Run Next

```bash
# Create annotations (interactive GUI)
python scripts/create_annotations.py --source organized_dataset --output dataset --mode gui

# Or create placeholder annotations
python scripts/create_annotations.py --source organized_dataset --output dataset --mode auto

# Prepare final dataset
python scripts/data_preparation.py --source organized_dataset --output dataset

# Start training
python train_android_yolo.py --epochs 150 --batch-size 32
```

## Tips for Better Results

- **Minimum 100 images per class** for good training
- **High-quality images** with clear visibility of issues
- **Diverse conditions** (lighting, angles, motorcycle types)
- **Accurate annotations** with tight bounding boxes
"""
        
        report_path = self.output_dir / "ORGANIZATION_REPORT.md"
        with open(report_path, 'w') as f:
            f.write(report_content)
        
        print(f"📋 Organization report created: {report_path}")
    
    def process(self) -> bool:
        """Main processing function"""
        print("🚀 Processing ZIP dataset for motorcycle diagnostic training")
        print("=" * 60)
        
        # Step 1: Extract ZIP
        if not self.extract_zip():
            return False
        
        # Step 2: Analyze folder structure
        folder_analysis = self.analyze_folder_structure()
        
        if not folder_analysis:
            print("❌ No valid folders found in the ZIP file")
            print("Expected folders:")
            for folder in self.expected_folders:
                print(f"   - {folder}")
            print("\nAlternative names that will be mapped:")
            for alt_name, mapped_name in self.folder_mappings.items():
                print(f"   - {alt_name} → {mapped_name}")
            return False
        
        # Step 3: Organize images
        if not self.organize_images(folder_analysis):
            print("❌ No images found to organize")
            return False
        
        # Step 4: Generate statistics
        stats = self.generate_dataset_statistics()
        
        # Step 5: Create report
        self.create_organization_report(folder_analysis, stats)
        
        print("\n✅ ZIP dataset processing completed!")
        print("=" * 60)
        print("📁 Your organized dataset is ready in: organized_dataset/")
        print("📋 Next steps:")
        print("   1. Review the organized images")
        print("   2. Create annotations")
        print("   3. Start training")
        
        return True

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Process ZIP dataset for motorcycle diagnostic training')
    parser.add_argument('zip_path', type=str, help='Path to the ZIP file containing 4 folders')
    parser.add_argument('--output', type=str, default='organized_dataset', 
                        help='Output directory for organized dataset')
    
    args = parser.parse_args()
    
    zip_path = Path(args.zip_path)
    if not zip_path.exists():
        print(f"❌ ZIP file not found: {zip_path}")
        return 1
    
    processor = ZipDatasetProcessor(zip_path, args.output)
    
    try:
        success = processor.process()
        return 0 if success else 1
    except Exception as e:
        print(f"❌ Processing failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
