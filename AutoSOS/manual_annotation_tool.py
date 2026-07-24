#!/usr/bin/env python3
"""
Manual Annotation Tool for YOLOv8 Motorcycle Diagnostic Dataset
Allows you to manually draw bounding boxes on images
"""

import cv2
import os
import numpy as np
from pathlib import Path
import json

class AnnotationTool:
    def __init__(self):
        self.classes = [
            'broken_headlights_tail_lights',
            'broken_side_mirror', 
            'flat_tire',
            'oil_leak'
        ]
        self.class_colors = [
            (0, 255, 0),    # Green
            (255, 0, 0),    # Blue
            (0, 0, 255),    # Red
            (255, 255, 0)   # Cyan
        ]
        
        self.current_class = 0
        self.drawing = False
        self.start_point = None
        self.end_point = None
        self.annotations = []
        self.current_image = None
        self.current_image_path = None
        self.image_list = []
        self.current_index = 0
        
    def load_images(self, folder_path):
        """Load all images from a folder"""
        folder = Path(folder_path)
        if not folder.exists():
            print(f"ERROR: Folder not found: {folder_path}")
            return False
        
        # Get all image files
        image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp']
        self.image_list = []
        
        for ext in image_extensions:
            self.image_list.extend(folder.glob(f"*{ext}"))
            self.image_list.extend(folder.glob(f"*{ext.upper()}"))
        
        if not self.image_list:
            print(f"ERROR: No images found in {folder_path}")
            return False
        
        print(f"Found {len(self.image_list)} images")
        return True
    
    def load_annotations(self, image_path):
        """Load existing annotations for an image"""
        label_path = image_path.with_suffix('.txt')
        self.annotations = []
        
        if label_path.exists():
            try:
                with open(label_path, 'r') as f:
                    for line in f:
                        parts = line.strip().split()
                        if len(parts) == 5:
                            class_id = int(parts[0])
                            x_center = float(parts[1])
                            y_center = float(parts[2])
                            width = float(parts[3])
                            height = float(parts[4])
                            
                            self.annotations.append({
                                'class_id': class_id,
                                'x_center': x_center,
                                'y_center': y_center,
                                'width': width,
                                'height': height
                            })
            except Exception as e:
                print(f"Error loading annotations: {e}")
    
    def save_annotations(self, image_path):
        """Save annotations to file"""
        label_path = image_path.with_suffix('.txt')
        
        try:
            with open(label_path, 'w') as f:
                for ann in self.annotations:
                    f.write(f"{ann['class_id']} {ann['x_center']:.6f} {ann['y_center']:.6f} {ann['width']:.6f} {ann['height']:.6f}\n")
            print(f"Saved {len(self.annotations)} annotations to {label_path}")
        except Exception as e:
            print(f"Error saving annotations: {e}")
    
    def mouse_callback(self, event, x, y, flags, param):
        """Handle mouse events for drawing bounding boxes"""
        if event == cv2.EVENT_LBUTTONDOWN:
            self.drawing = True
            self.start_point = (x, y)
            self.end_point = (x, y)
        
        elif event == cv2.EVENT_MOUSEMOVE:
            if self.drawing:
                self.end_point = (x, y)
                # Redraw image with current bounding box
                self.draw_image()
        
        elif event == cv2.EVENT_LBUTTONUP:
            if self.drawing:
                self.drawing = False
                self.end_point = (x, y)
                
                # Add annotation
                if self.start_point and self.end_point:
                    self.add_annotation()
                
                self.draw_image()
    
    def add_annotation(self):
        """Add a new annotation"""
        if not self.start_point or not self.end_point:
            return
        
        # Calculate bounding box coordinates
        x1 = min(self.start_point[0], self.end_point[0])
        y1 = min(self.start_point[1], self.end_point[1])
        x2 = max(self.start_point[0], self.end_point[0])
        y2 = max(self.start_point[1], self.end_point[1])
        
        # Convert to YOLO format (normalized coordinates)
        img_height, img_width = self.current_image.shape[:2]
        
        x_center = (x1 + x2) / 2.0 / img_width
        y_center = (y1 + y2) / 2.0 / img_height
        width = (x2 - x1) / img_width
        height = (y2 - y1) / img_height
        
        # Add annotation
        self.annotations.append({
            'class_id': self.current_class,
            'x_center': x_center,
            'y_center': y_center,
            'width': width,
            'height': height
        })
        
        print(f"Added annotation for {self.classes[self.current_class]}")
    
    def draw_image(self):
        """Draw the image with annotations and current bounding box"""
        display_image = self.current_image.copy()
        
        # Draw existing annotations
        img_height, img_width = display_image.shape[:2]
        
        for ann in self.annotations:
            # Convert normalized coordinates back to pixel coordinates
            x_center = ann['x_center'] * img_width
            y_center = ann['y_center'] * img_height
            width = ann['width'] * img_width
            height = ann['height'] * img_height
            
            x1 = int(x_center - width / 2)
            y1 = int(y_center - height / 2)
            x2 = int(x_center + width / 2)
            y2 = int(y_center + height / 2)
            
            # Draw bounding box
            color = self.class_colors[ann['class_id']]
            cv2.rectangle(display_image, (x1, y1), (x2, y2), color, 2)
            
            # Draw class label
            label = self.classes[ann['class_id']]
            cv2.putText(display_image, label, (x1, y1-10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        # Draw current bounding box being drawn
        if self.drawing and self.start_point and self.end_point:
            color = self.class_colors[self.current_class]
            cv2.rectangle(display_image, self.start_point, self.end_point, color, 2)
        
        # Draw instructions
        cv2.putText(display_image, f"Class: {self.classes[self.current_class]}", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(display_image, f"Image: {self.current_index + 1}/{len(self.image_list)}", 
                   (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(display_image, "Press 1-4 to change class, SPACE for next, S to save", 
                   (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        cv2.imshow('Annotation Tool', display_image)
    
    def run(self, folder_path):
        """Run the annotation tool"""
        if not self.load_images(folder_path):
            return
        
        # Create window
        cv2.namedWindow('Annotation Tool', cv2.WINDOW_NORMAL)
        cv2.setMouseCallback('Annotation Tool', self.mouse_callback)
        
        # Load first image
        self.load_current_image()
        
        while True:
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('q'):
                break
            elif key == ord(' '):  # Space for next image
                self.save_annotations(self.current_image_path)
                self.next_image()
            elif key == ord('s'):  # Save current annotations
                self.save_annotations(self.current_image_path)
            elif key == ord('1'):
                self.current_class = 0
                print(f"Selected class: {self.classes[self.current_class]}")
            elif key == ord('2'):
                self.current_class = 1
                print(f"Selected class: {self.classes[self.current_class]}")
            elif key == ord('3'):
                self.current_class = 2
                print(f"Selected class: {self.classes[self.current_class]}")
            elif key == ord('4'):
                self.current_class = 3
                print(f"Selected class: {self.classes[self.current_class]}")
            elif key == ord('d'):  # Delete last annotation
                if self.annotations:
                    self.annotations.pop()
                    self.draw_image()
                    print("Deleted last annotation")
        
        # Save final annotations
        self.save_annotations(self.current_image_path)
        cv2.destroyAllWindows()
    
    def load_current_image(self):
        """Load the current image"""
        if self.current_index >= len(self.image_list):
            print("No more images to annotate")
            return
        
        self.current_image_path = self.image_list[self.current_index]
        self.current_image = cv2.imread(str(self.current_image_path))
        
        if self.current_image is None:
            print(f"Error loading image: {self.current_image_path}")
            return
        
        # Load existing annotations
        self.load_annotations(self.current_image_path)
        
        # Draw image
        self.draw_image()
        
        print(f"Loaded image: {self.current_image_path.name}")
        print(f"Existing annotations: {len(self.annotations)}")
    
    def next_image(self):
        """Move to next image"""
        self.current_index += 1
        if self.current_index < len(self.image_list):
            self.load_current_image()
        else:
            print("Reached end of images")

def main():
    """Main function"""
    print("Manual Annotation Tool for YOLOv8")
    print("=" * 40)
    print("Classes:")
    print("1. broken_headlights_tail_lights")
    print("2. broken_side_mirror")
    print("3. flat_tire")
    print("4. oil_leak")
    print()
    print("Controls:")
    print("- Click and drag to draw bounding box")
    print("- Press 1-4 to change class")
    print("- Press SPACE for next image")
    print("- Press S to save annotations")
    print("- Press D to delete last annotation")
    print("- Press Q to quit")
    print()
    
    # Get folder path
    folder_path = input("Enter folder path containing images to annotate: ").strip()
    
    if not folder_path:
        print("No folder path provided")
        return
    
    # Create annotation tool
    tool = AnnotationTool()
    tool.run(folder_path)

if __name__ == "__main__":
    main()
