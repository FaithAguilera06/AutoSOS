#!/usr/bin/env python3
"""
Annotation Tools for Motorcycle Diagnostic Dataset
Provides utilities for creating and managing YOLO format annotations
"""

import os
import cv2
import json
import yaml
from pathlib import Path
from typing import List, Tuple, Dict, Optional
import numpy as np
from dataclasses import dataclass

@dataclass
class BoundingBox:
    """Bounding box in YOLO format (normalized coordinates)"""
    class_id: int
    x_center: float
    y_center: float
    width: float
    height: float
    
    def to_yolo_line(self) -> str:
        """Convert to YOLO format line"""
        return f"{self.class_id} {self.x_center:.6f} {self.y_center:.6f} {self.width:.6f} {self.height:.6f}"
    
    @classmethod
    def from_yolo_line(cls, line: str) -> 'BoundingBox':
        """Create from YOLO format line"""
        parts = line.strip().split()
        return cls(
            class_id=int(parts[0]),
            x_center=float(parts[1]),
            y_center=float(parts[2]),
            width=float(parts[3]),
            height=float(parts[4])
        )
    
    @classmethod
    def from_xyxy(cls, class_id: int, x1: int, y1: int, x2: int, y2: int, 
                  img_width: int, img_height: int) -> 'BoundingBox':
        """Create from absolute coordinates"""
        x_center = (x1 + x2) / 2 / img_width
        y_center = (y1 + y2) / 2 / img_height
        width = (x2 - x1) / img_width
        height = (y2 - y1) / img_height
        
        return cls(class_id, x_center, y_center, width, height)
    
    def to_xyxy(self, img_width: int, img_height: int) -> Tuple[int, int, int, int]:
        """Convert to absolute coordinates"""
        x1 = int((self.x_center - self.width / 2) * img_width)
        y1 = int((self.y_center - self.height / 2) * img_height)
        x2 = int((self.x_center + self.width / 2) * img_width)
        y2 = int((self.y_center + self.height / 2) * img_height)
        
        return x1, y1, x2, y2

class MotorcycleAnnotationTool:
    """Tool for creating and managing motorcycle diagnostic annotations"""
    
    def __init__(self, class_names: List[str]):
        self.class_names = class_names
        self.class_to_id = {name: i for i, name in enumerate(class_names)}
        self.id_to_class = {i: name for i, name in enumerate(class_names)}
    
    def create_annotation_file(self, image_path: Path, annotations: List[BoundingBox]) -> Path:
        """Create YOLO annotation file"""
        annotation_path = image_path.with_suffix('.txt')
        
        with open(annotation_path, 'w') as f:
            for annotation in annotations:
                f.write(annotation.to_yolo_line() + '\n')
        
        return annotation_path
    
    def load_annotation_file(self, annotation_path: Path) -> List[BoundingBox]:
        """Load annotations from YOLO format file"""
        annotations = []
        
        if not annotation_path.exists():
            return annotations
        
        with open(annotation_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line:
                    annotations.append(BoundingBox.from_yolo_line(line))
        
        return annotations
    
    def visualize_annotations(self, image_path: Path, annotation_path: Path, 
                            output_path: Optional[Path] = None) -> np.ndarray:
        """Visualize annotations on image"""
        # Load image
        image = cv2.imread(str(image_path))
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        height, width = image.shape[:2]
        
        # Load annotations
        annotations = self.load_annotation_file(annotation_path)
        
        # Draw annotations
        for annotation in annotations:
            x1, y1, x2, y2 = annotation.to_xyxy(width, height)
            
            # Get class name
            class_name = self.id_to_class.get(annotation.class_id, f"Class_{annotation.class_id}")
            
            # Choose color based on class type for Android app issues
            if "broken_headlights_tail_lights" in class_name:
                color = (255, 255, 0)  # Yellow for lighting issues
            elif "broken_side_mirror" in class_name:
                color = (255, 165, 0)  # Orange for mirror issues
            elif "flat_tire" in class_name:
                color = (0, 0, 255)  # Red for tire issues
            elif "oil_leak" in class_name:
                color = (128, 0, 128)  # Purple for oil leaks
            else:
                color = (0, 255, 0)  # Green for other issues
            
            # Draw bounding box
            cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)
            
            # Draw label
            label = f"{class_name} ({annotation.class_id})"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
            cv2.rectangle(image, (x1, y1 - label_size[1] - 10), 
                         (x1 + label_size[0], y1), color, -1)
            cv2.putText(image, label, (x1, y1 - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
        
        # Save or return image
        if output_path:
            cv2.imwrite(str(output_path), image)
        
        return image
    
    def _get_severity_color(self, severity_class: str) -> Tuple[int, int, int]:
        """Get color for severity level"""
        severity_colors = {
            'low_severity': (0, 255, 255),      # Yellow
            'medium_severity': (0, 165, 255),   # Orange
            'high_severity': (0, 0, 255),       # Red
            'critical_severity': (128, 0, 128)  # Purple
        }
        return severity_colors.get(severity_class, (255, 255, 255))
    
    def validate_annotations(self, annotation_path: Path) -> List[str]:
        """Validate annotation file and return list of issues"""
        issues = []
        
        if not annotation_path.exists():
            issues.append("Annotation file does not exist")
            return issues
        
        try:
            annotations = self.load_annotation_file(annotation_path)
            
            for i, annotation in enumerate(annotations):
                # Check class ID
                if annotation.class_id < 0 or annotation.class_id >= len(self.class_names):
                    issues.append(f"Line {i+1}: Invalid class ID {annotation.class_id}")
                
                # Check coordinates
                if not (0 <= annotation.x_center <= 1):
                    issues.append(f"Line {i+1}: x_center out of range: {annotation.x_center}")
                
                if not (0 <= annotation.y_center <= 1):
                    issues.append(f"Line {i+1}: y_center out of range: {annotation.y_center}")
                
                if not (0 < annotation.width <= 1):
                    issues.append(f"Line {i+1}: width out of range: {annotation.width}")
                
                if not (0 < annotation.height <= 1):
                    issues.append(f"Line {i+1}: height out of range: {annotation.height}")
                
                # Check if bounding box is too small
                if annotation.width < 0.01 or annotation.height < 0.01:
                    issues.append(f"Line {i+1}: Bounding box too small")
                
                # Check if bounding box extends outside image
                if (annotation.x_center - annotation.width/2 < 0 or 
                    annotation.x_center + annotation.width/2 > 1 or
                    annotation.y_center - annotation.height/2 < 0 or 
                    annotation.y_center + annotation.height/2 > 1):
                    issues.append(f"Line {i+1}: Bounding box extends outside image")
        
        except Exception as e:
            issues.append(f"Error reading annotation file: {e}")
        
        return issues
    
    def batch_validate(self, dataset_dir: Path) -> Dict[str, List[str]]:
        """Validate all annotation files in dataset"""
        results = {}
        
        for split in ['train', 'val', 'test']:
            labels_dir = dataset_dir / 'labels' / split
            if not labels_dir.exists():
                continue
            
            split_issues = []
            for annotation_file in labels_dir.glob('*.txt'):
                issues = self.validate_annotations(annotation_file)
                if issues:
                    split_issues.extend([f"{annotation_file.name}: {issue}" for issue in issues])
            
            results[split] = split_issues
        
        return results
    
    def generate_annotation_template(self, output_path: Path):
        """Generate annotation template with class definitions"""
        template = {
            'classes': self.class_names,
            'class_groups': {
                'lighting_issues': ['broken_headlights_tail_lights'],
                'mirror_issues': ['broken_side_mirror'],
                'tire_issues': ['flat_tire'],
                'fluid_issues': ['oil_leak']
            },
            'annotation_guidelines': {
                'broken_headlights_tail_lights': 'Annotate broken, cracked, or non-functioning headlights and tail lights',
                'broken_side_mirror': 'Annotate cracked, missing, or damaged side mirrors',
                'flat_tire': 'Annotate visibly flat, deflated, or damaged tires',
                'oil_leak': 'Annotate visible oil stains, drips, or leaks on the motorcycle'
            },
            'color_coding': {
                'broken_headlights_tail_lights': 'Yellow bounding boxes',
                'broken_side_mirror': 'Orange bounding boxes',
                'flat_tire': 'Red bounding boxes',
                'oil_leak': 'Purple bounding boxes'
            },
            'android_app_notes': {
                'purpose': 'This dataset is specifically designed for AutoSOS Android application',
                'use_case': 'Real-time motorcycle issue detection using mobile camera',
                'deployment': 'YOLOv8n model optimized for Android devices',
                'performance_target': 'Fast inference on mobile hardware'
            }
        }
        
        with open(output_path, 'w') as f:
            yaml.dump(template, f, default_flow_style=False)
    
    def convert_coco_to_yolo(self, coco_json_path: Path, output_dir: Path):
        """Convert COCO format annotations to YOLO format"""
        with open(coco_json_path, 'r') as f:
            coco_data = json.load(f)
        
        # Create category mapping
        category_map = {}
        for category in coco_data['categories']:
            category_map[category['id']] = category['name']
        
        # Group annotations by image
        image_annotations = {}
        for annotation in coco_data['annotations']:
            image_id = annotation['image_id']
            if image_id not in image_annotations:
                image_annotations[image_id] = []
            image_annotations[image_id].append(annotation)
        
        # Create image mapping
        image_map = {}
        for image in coco_data['images']:
            image_map[image['id']] = image
        
        # Convert annotations
        for image_id, annotations in image_annotations.items():
            image_info = image_map[image_id]
            image_width = image_info['width']
            image_height = image_info['height']
            
            yolo_annotations = []
            for annotation in annotations:
                # Get class name and map to our class ID
                category_name = category_map[annotation['category_id']]
                if category_name in self.class_to_id:
                    class_id = self.class_to_id[category_name]
                    
                    # Convert COCO bbox to YOLO format
                    x, y, w, h = annotation['bbox']
                    x_center = (x + w/2) / image_width
                    y_center = (y + h/2) / image_height
                    width = w / image_width
                    height = h / image_height
                    
                    yolo_annotations.append(BoundingBox(class_id, x_center, y_center, width, height))
            
            # Save YOLO annotation file
            if yolo_annotations:
                annotation_file = output_dir / f"{image_info['file_name']}.txt"
                with open(annotation_file, 'w') as f:
                    for annotation in yolo_annotations:
                        f.write(annotation.to_yolo_line() + '\n')

def main():
    """Main function for annotation tools"""
    import argparse
    
    # Define class names - 4 specific motorcycle issues for Android app
    class_names = [
        'broken_headlights_tail_lights',
        'broken_side_mirror', 
        'flat_tire',
        'oil_leak'
    ]
    
    parser = argparse.ArgumentParser(description='Motorcycle diagnostic annotation tools')
    parser.add_argument('--action', type=str, required=True,
                        choices=['validate', 'visualize', 'template', 'convert'],
                        help='Action to perform')
    parser.add_argument('--input', type=str, help='Input file or directory')
    parser.add_argument('--output', type=str, help='Output file or directory')
    parser.add_argument('--image', type=str, help='Image file for visualization')
    
    args = parser.parse_args()
    
    tool = MotorcycleAnnotationTool(class_names)
    
    try:
        if args.action == 'validate':
            if not args.input:
                raise ValueError("Input directory required for validation")
            
            results = tool.batch_validate(Path(args.input))
            for split, issues in results.items():
                print(f"\n{split.upper()} Split:")
                if issues:
                    for issue in issues:
                        print(f"  ❌ {issue}")
                else:
                    print("  ✅ No issues found")
        
        elif args.action == 'visualize':
            if not args.input or not args.image:
                raise ValueError("Input annotation file and image file required")
            
            image_path = Path(args.image)
            annotation_path = Path(args.input)
            output_path = Path(args.output) if args.output else None
            
            tool.visualize_annotations(image_path, annotation_path, output_path)
            print(f"✅ Visualization complete")
        
        elif args.action == 'template':
            output_path = Path(args.output) if args.output else Path('annotation_template.yaml')
            tool.generate_annotation_template(output_path)
            print(f"✅ Template saved to: {output_path}")
        
        elif args.action == 'convert':
            if not args.input or not args.output:
                raise ValueError("Input COCO JSON and output directory required")
            
            coco_path = Path(args.input)
            output_dir = Path(args.output)
            output_dir.mkdir(parents=True, exist_ok=True)
            
            tool.convert_coco_to_yolo(coco_path, output_dir)
            print(f"✅ Conversion complete")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
