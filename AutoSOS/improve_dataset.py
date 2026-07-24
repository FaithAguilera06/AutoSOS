#!/usr/bin/env python3
"""
Dataset Improvement Tool for YOLOv8 Motorcycle Diagnostic
Allows you to review, add, and improve your training dataset
"""

import os
import shutil
import cv2
import numpy as np
from pathlib import Path
import json
from typing import List, Dict, Any

class DatasetImprover:
    def __init__(self, dataset_path: str = "yolo-motorcycle-diagnostic-training/organized_dataset"):
        self.dataset_path = Path(dataset_path)
        self.classes = [
            'broken_headlights_tail_lights',
            'broken_side_mirror', 
            'flat_tire',
            'oil_leak'
        ]
        
    def analyze_current_dataset(self):
        """Analyze current dataset quality and distribution"""
        print("📊 Analyzing Current Dataset...")
        print("=" * 50)
        
        stats = {}
        for class_name in self.classes:
            class_dir = self.dataset_path / class_name
            if class_dir.exists():
                images = list(class_dir.glob("*.jpg")) + list(class_dir.glob("*.png")) + list(class_dir.glob("*.jpeg"))
                labels = list(class_dir.glob("*.txt"))
                
                stats[class_name] = {
                    'images': len(images),
                    'labels': len(labels),
                    'has_annotations': len(labels) > 0
                }
                
                print(f"📁 {class_name}:")
                print(f"   Images: {len(images)}")
                print(f"   Labels: {len(labels)}")
                print(f"   Annotated: {'✅' if len(labels) > 0 else '❌'}")
                print()
        
        return stats
    
    def check_image_quality(self, class_name: str, max_samples: int = 10):
        """Check image quality for a specific class"""
        print(f"🔍 Checking image quality for {class_name}...")
        
        class_dir = self.dataset_path / class_name
        if not class_dir.exists():
            print(f"❌ Class directory not found: {class_dir}")
            return
        
        images = list(class_dir.glob("*.jpg")) + list(class_dir.glob("*.png")) + list(class_dir.glob("*.jpeg"))
        
        if not images:
            print(f"❌ No images found in {class_name}")
            return
        
        # Sample random images to check
        sample_images = np.random.choice(images, min(max_samples, len(images)), replace=False)
        
        quality_issues = []
        for img_path in sample_images:
            try:
                img = cv2.imread(str(img_path))
                if img is None:
                    quality_issues.append(f"❌ Cannot read: {img_path.name}")
                    continue
                
                height, width = img.shape[:2]
                
                # Check image size
                if width < 320 or height < 320:
                    quality_issues.append(f"⚠️ Small image: {img_path.name} ({width}x{height})")
                
                # Check if image is too dark
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                mean_brightness = np.mean(gray)
                if mean_brightness < 50:
                    quality_issues.append(f"⚠️ Dark image: {img_path.name} (brightness: {mean_brightness:.1f})")
                
                # Check if image is too bright
                if mean_brightness > 200:
                    quality_issues.append(f"⚠️ Bright image: {img_path.name} (brightness: {mean_brightness:.1f})")
                
            except Exception as e:
                quality_issues.append(f"❌ Error processing {img_path.name}: {e}")
        
        if quality_issues:
            print("Quality Issues Found:")
            for issue in quality_issues:
                print(f"   {issue}")
        else:
            print("✅ No major quality issues found in sample")
    
    def add_new_images(self, class_name: str, source_dir: str):
        """Add new images to a specific class"""
        print(f"📥 Adding new images to {class_name}...")
        
        class_dir = self.dataset_path / class_name
        class_dir.mkdir(parents=True, exist_ok=True)
        
        source_path = Path(source_dir)
        if not source_path.exists():
            print(f"❌ Source directory not found: {source_dir}")
            return
        
        # Find all images in source directory
        image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp']
        new_images = []
        for ext in image_extensions:
            new_images.extend(source_path.glob(f"*{ext}"))
            new_images.extend(source_path.glob(f"*{ext.upper()}"))
        
        if not new_images:
            print(f"❌ No images found in {source_dir}")
            return
        
        print(f"Found {len(new_images)} new images")
        
        # Copy images
        copied_count = 0
        for img_path in new_images:
            try:
                # Generate unique filename
                counter = 1
                new_name = img_path.name
                while (class_dir / new_name).exists():
                    name_parts = img_path.stem, counter, img_path.suffix
                    new_name = f"{name_parts[0]}_{name_parts[1]}{name_parts[2]}"
                    counter += 1
                
                shutil.copy2(img_path, class_dir / new_name)
                copied_count += 1
                
            except Exception as e:
                print(f"❌ Error copying {img_path.name}: {e}")
        
        print(f"✅ Copied {copied_count} images to {class_name}")
    
    def remove_low_quality_images(self, class_name: str, min_size: int = 320, min_brightness: int = 50):
        """Remove low quality images from a class"""
        print(f"🗑️ Removing low quality images from {class_name}...")
        
        class_dir = self.dataset_path / class_name
        if not class_dir.exists():
            print(f"❌ Class directory not found: {class_dir}")
            return
        
        images = list(class_dir.glob("*.jpg")) + list(class_dir.glob("*.png")) + list(class_dir.glob("*.jpeg"))
        
        removed_count = 0
        for img_path in images:
            try:
                img = cv2.imread(str(img_path))
                if img is None:
                    print(f"❌ Removing unreadable image: {img_path.name}")
                    img_path.unlink()
                    removed_count += 1
                    continue
                
                height, width = img.shape[:2]
                
                # Check image size
                if width < min_size or height < min_size:
                    print(f"❌ Removing small image: {img_path.name} ({width}x{height})")
                    img_path.unlink()
                    removed_count += 1
                    continue
                
                # Check brightness
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                mean_brightness = np.mean(gray)
                if mean_brightness < min_brightness:
                    print(f"❌ Removing dark image: {img_path.name} (brightness: {mean_brightness:.1f})")
                    img_path.unlink()
                    removed_count += 1
                    continue
                
            except Exception as e:
                print(f"❌ Error processing {img_path.name}: {e}")
        
        print(f"✅ Removed {removed_count} low quality images")
    
    def create_improvement_report(self):
        """Create a report with improvement suggestions"""
        print("📋 Creating Improvement Report...")
        
        stats = self.analyze_current_dataset()
        
        report = {
            "timestamp": str(Path().cwd()),
            "current_stats": stats,
            "recommendations": []
        }
        
        # Analyze and provide recommendations
        total_images = sum(class_stats['images'] for class_stats in stats.values())
        min_images = min(class_stats['images'] for class_stats in stats.values())
        max_images = max(class_stats['images'] for class_stats in stats.values())
        
        if min_images < 100:
            report["recommendations"].append(f"Add more images to classes with fewer than 100 images (minimum: {min_images})")
        
        if max_images - min_images > 50:
            report["recommendations"].append("Balance dataset - some classes have significantly more images than others")
        
        unannotated_classes = [name for name, stats in stats.items() if not stats['has_annotations']]
        if unannotated_classes:
            report["recommendations"].append(f"Create annotations for: {', '.join(unannotated_classes)}")
        
        if total_images < 400:
            report["recommendations"].append("Consider adding more images for better model performance (target: 100+ per class)")
        
        # Save report
        with open("dataset_improvement_report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        print("✅ Report saved to: dataset_improvement_report.json")
        print("\n📋 Recommendations:")
        for i, rec in enumerate(report["recommendations"], 1):
            print(f"   {i}. {rec}")

def main():
    """Main function"""
    print("🔧 YOLOv8 Dataset Improvement Tool")
    print("=" * 50)
    
    improver = DatasetImprover()
    
    while True:
        print("\nChoose an option:")
        print("1. Analyze current dataset")
        print("2. Check image quality for a class")
        print("3. Add new images to a class")
        print("4. Remove low quality images")
        print("5. Create improvement report")
        print("6. Exit")
        
        choice = input("\nEnter choice (1-6): ").strip()
        
        if choice == "1":
            improver.analyze_current_dataset()
        
        elif choice == "2":
            print("\nAvailable classes:")
            for i, class_name in enumerate(improver.classes, 1):
                print(f"   {i}. {class_name}")
            
            class_choice = input("Enter class number: ").strip()
            try:
                class_idx = int(class_choice) - 1
                if 0 <= class_idx < len(improver.classes):
                    improver.check_image_quality(improver.classes[class_idx])
                else:
                    print("Invalid class number")
            except ValueError:
                print("Invalid input")
        
        elif choice == "3":
            print("\nAvailable classes:")
            for i, class_name in enumerate(improver.classes, 1):
                print(f"   {i}. {class_name}")
            
            class_choice = input("Enter class number: ").strip()
            source_dir = input("Enter source directory path: ").strip()
            
            try:
                class_idx = int(class_choice) - 1
                if 0 <= class_idx < len(improver.classes):
                    improver.add_new_images(improver.classes[class_idx], source_dir)
                else:
                    print("Invalid class number")
            except ValueError:
                print("Invalid input")
        
        elif choice == "4":
            print("\nAvailable classes:")
            for i, class_name in enumerate(improver.classes, 1):
                print(f"   {i}. {class_name}")
            
            class_choice = input("Enter class number: ").strip()
            
            try:
                class_idx = int(class_choice) - 1
                if 0 <= class_idx < len(improver.classes):
                    improver.remove_low_quality_images(improver.classes[class_idx])
                else:
                    print("Invalid class number")
            except ValueError:
                print("Invalid input")
        
        elif choice == "5":
            improver.create_improvement_report()
        
        elif choice == "6":
            print("Goodbye!")
            break
        
        else:
            print("Invalid choice")

if __name__ == "__main__":
    main()
