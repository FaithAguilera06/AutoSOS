#!/usr/bin/env python3
"""
Data Preparation Script for Motorcycle Diagnostic Dataset
Organizes images and annotations for YOLOv8 training
"""

import os
import shutil
import yaml
import random
from pathlib import Path
from typing import List, Tuple
import cv2
import numpy as np
from sklearn.model_selection import train_test_split

class MotorcycleDatasetPreparator:
    def __init__(self, source_dir: str, output_dir: str = "dataset"):
        self.source_dir = Path(source_dir)
        self.output_dir = Path(output_dir)
        self.class_names = self._get_class_names()
        
    def _get_class_names(self) -> List[str]:
        """Get class names for motorcycle diagnostic - 4 specific issues for Android app"""
        return [
            'broken_headlights_tail_lights',
            'broken_side_mirror', 
            'flat_tire',
            'oil_leak'
        ]
    
    def create_directory_structure(self):
        """Create the required directory structure for YOLOv8 training"""
        print("📁 Creating directory structure...")
        
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
            print(f"   ✅ Created: {directory}")
    
    def validate_image(self, image_path: Path) -> bool:
        """Validate if image is suitable for training"""
        try:
            img = cv2.imread(str(image_path))
            if img is None:
                return False
            
            # Check image dimensions
            height, width = img.shape[:2]
            if height < 100 or width < 100:
                return False
            
            # Check if image is corrupted
            if cv2.Laplacian(img, cv2.CV_64F).var() < 100:
                return False
            
            return True
        except Exception:
            return False
    
    def validate_annotation(self, annotation_path: Path) -> bool:
        """Validate YOLO annotation file"""
        try:
            if not annotation_path.exists():
                return False
            
            with open(annotation_path, 'r') as f:
                lines = f.readlines()
            
            for line in lines:
                parts = line.strip().split()
                if len(parts) != 5:
                    return False
                
                # Check if class ID is valid
                class_id = int(parts[0])
                if class_id < 0 or class_id >= len(self.class_names):
                    return False
                
                # Check if coordinates are valid
                for coord in parts[1:]:
                    coord_val = float(coord)
                    if coord_val < 0 or coord_val > 1:
                        return False
            
            return True
        except Exception:
            return False
    
    def split_dataset(self, train_ratio: float = 0.7, val_ratio: float = 0.2, test_ratio: float = 0.1):
        """Split dataset into train/validation/test sets"""
        print("🔄 Splitting dataset...")
        
        # Find all image files
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
        image_files = []
        
        for ext in image_extensions:
            image_files.extend(self.source_dir.glob(f"**/*{ext}"))
            image_files.extend(self.source_dir.glob(f"**/*{ext.upper()}"))
        
        print(f"   Found {len(image_files)} image files")
        
        # Filter valid images with annotations
        valid_pairs = []
        for img_path in image_files:
            # Look for corresponding annotation file
            annotation_path = img_path.with_suffix('.txt')
            
            if (self.validate_image(img_path) and 
                self.validate_annotation(annotation_path)):
                valid_pairs.append((img_path, annotation_path))
        
        print(f"   Valid image-annotation pairs: {len(valid_pairs)}")
        
        if len(valid_pairs) == 0:
            raise ValueError("No valid image-annotation pairs found!")
        
        # Split the dataset
        train_pairs, temp_pairs = train_test_split(
            valid_pairs, test_size=(val_ratio + test_ratio), random_state=42
        )
        
        val_pairs, test_pairs = train_test_split(
            temp_pairs, test_size=(test_ratio / (val_ratio + test_ratio)), random_state=42
        )
        
        print(f"   Train: {len(train_pairs)} pairs")
        print(f"   Validation: {len(val_pairs)} pairs")
        print(f"   Test: {len(test_pairs)} pairs")
        
        return train_pairs, val_pairs, test_pairs
    
    def copy_files(self, pairs: List[Tuple[Path, Path]], split: str):
        """Copy image and annotation files to the appropriate directories"""
        print(f"📋 Copying {split} files...")
        
        images_dir = self.output_dir / "images" / split
        labels_dir = self.output_dir / "labels" / split
        
        for img_path, ann_path in pairs:
            # Copy image
            img_dest = images_dir / img_path.name
            shutil.copy2(img_path, img_dest)
            
            # Copy annotation
            ann_dest = labels_dir / ann_path.name
            shutil.copy2(ann_path, ann_dest)
        
        print(f"   ✅ Copied {len(pairs)} pairs to {split}")
    
    def create_dataset_yaml(self):
        """Create dataset configuration YAML file"""
        print("📝 Creating dataset configuration...")
        
        config = {
            'path': str(self.output_dir.absolute()),
            'train': 'images/train',
            'val': 'images/val',
            'test': 'images/test',
            'nc': len(self.class_names),
            'names': self.class_names
        }
        
        yaml_path = self.output_dir / "motorcycle_diagnostic.yaml"
        with open(yaml_path, 'w') as f:
            yaml.dump(config, f, default_flow_style=False)
        
        print(f"   ✅ Created: {yaml_path}")
    
    def generate_statistics(self):
        """Generate dataset statistics"""
        print("📊 Generating dataset statistics...")
        
        stats = {}
        for split in ['train', 'val', 'test']:
            images_dir = self.output_dir / "images" / split
            labels_dir = self.output_dir / "labels" / split
            
            if not images_dir.exists():
                continue
            
            image_count = len(list(images_dir.glob("*")))
            label_count = len(list(labels_dir.glob("*.txt")))
            
            # Count annotations per class
            class_counts = {name: 0 for name in self.class_names}
            total_annotations = 0
            
            for label_file in labels_dir.glob("*.txt"):
                with open(label_file, 'r') as f:
                    for line in f:
                        parts = line.strip().split()
                        if len(parts) == 5:
                            class_id = int(parts[0])
                            if 0 <= class_id < len(self.class_names):
                                class_counts[self.class_names[class_id]] += 1
                                total_annotations += 1
            
            stats[split] = {
                'images': image_count,
                'labels': label_count,
                'total_annotations': total_annotations,
                'class_distribution': class_counts
            }
        
        # Save statistics
        stats_path = self.output_dir / "dataset_statistics.yaml"
        with open(stats_path, 'w') as f:
            yaml.dump(stats, f, default_flow_style=False)
        
        print(f"   ✅ Statistics saved to: {stats_path}")
        
        # Print summary
        print("\n📈 Dataset Summary:")
        for split, data in stats.items():
            print(f"   {split.upper()}:")
            print(f"     Images: {data['images']}")
            print(f"     Annotations: {data['total_annotations']}")
            print(f"     Avg annotations per image: {data['total_annotations']/data['images']:.2f}")
    
    def prepare_dataset(self, train_ratio: float = 0.7, val_ratio: float = 0.2, test_ratio: float = 0.1):
        """Main method to prepare the dataset"""
        print("🚀 Starting dataset preparation for motorcycle diagnostic...")
        
        # Validate ratios
        if abs(train_ratio + val_ratio + test_ratio - 1.0) > 1e-6:
            raise ValueError("Train, validation, and test ratios must sum to 1.0")
        
        # Create directory structure
        self.create_directory_structure()
        
        # Split dataset
        train_pairs, val_pairs, test_pairs = self.split_dataset(train_ratio, val_ratio, test_ratio)
        
        # Copy files
        self.copy_files(train_pairs, 'train')
        self.copy_files(val_pairs, 'val')
        self.copy_files(test_pairs, 'test')
        
        # Create configuration
        self.create_dataset_yaml()
        
        # Generate statistics
        self.generate_statistics()
        
        print("✅ Dataset preparation completed successfully!")
        print(f"📁 Dataset saved to: {self.output_dir.absolute()}")

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Prepare motorcycle diagnostic dataset')
    parser.add_argument('--source', type=str, required=True,
                        help='Source directory containing images and annotations')
    parser.add_argument('--output', type=str, default='dataset',
                        help='Output directory for prepared dataset')
    parser.add_argument('--train-ratio', type=float, default=0.7,
                        help='Ratio of data for training')
    parser.add_argument('--val-ratio', type=float, default=0.2,
                        help='Ratio of data for validation')
    parser.add_argument('--test-ratio', type=float, default=0.1,
                        help='Ratio of data for testing')
    
    args = parser.parse_args()
    
    try:
        preparator = MotorcycleDatasetPreparator(args.source, args.output)
        preparator.prepare_dataset(args.train_ratio, args.val_ratio, args.test_ratio)
    except Exception as e:
        print(f"❌ Dataset preparation failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
