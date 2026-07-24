#!/usr/bin/env python3
"""
Annotation Creation Script for Motorcycle Diagnostic Dataset
Creates YOLO format annotations for organized images
"""

import os
import cv2
import json
import yaml
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import numpy as np
from dataclasses import dataclass
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from PIL import Image, ImageTk

@dataclass
class BoundingBox:
    """Bounding box in YOLO format"""
    class_id: int
    x_center: float
    y_center: float
    width: float
    height: float
    
    def to_yolo_line(self) -> str:
        return f"{self.class_id} {self.x_center:.6f} {self.y_center:.6f} {self.width:.6f} {self.height:.6f}"

class AnnotationCreator:
    """Interactive annotation creator for motorcycle diagnostic dataset"""
    
    def __init__(self, source_dir: Path, output_dir: Path):
        self.source_dir = source_dir
        self.output_dir = output_dir
        self.output_dir.mkdir(exist_ok=True)
        
        # Class names for 4 motorcycle issues
        self.class_names = [
            'broken_headlights_tail_lights',
            'broken_side_mirror', 
            'flat_tire',
            'oil_leak'
        ]
        
        # Create output directories
        for split in ['train', 'val', 'test']:
            (self.output_dir / 'images' / split).mkdir(parents=True, exist_ok=True)
            (self.output_dir / 'labels' / split).mkdir(parents=True, exist_ok=True)
        
        # Current annotation state
        self.current_image = None
        self.current_annotations = []
        self.current_class_id = 0
        self.drawing = False
        self.start_point = None
        self.end_point = None
        
        # Image list
        self.image_files = []
        self.current_image_index = 0
        
        # Load existing images
        self.load_images()
    
    def load_images(self):
        """Load all images from source directory"""
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
        
        for class_dir in self.source_dir.iterdir():
            if class_dir.is_dir() and class_dir.name in self.class_names:
                class_id = self.class_names.index(class_dir.name)
                
                for image_file in class_dir.iterdir():
                    if image_file.suffix.lower() in image_extensions:
                        self.image_files.append({
                            'path': image_file,
                            'class_id': class_id,
                            'class_name': class_dir.name
                        })
        
        print(f"📸 Loaded {len(self.image_files)} images")
    
    def create_gui(self):
        """Create interactive annotation GUI"""
        self.root = tk.Tk()
        self.root.title("Motorcycle Diagnostic Annotation Tool")
        self.root.geometry("1200x800")
        
        # Create main frame
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Left panel - Image display
        left_frame = ttk.Frame(main_frame)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Image canvas
        self.canvas = tk.Canvas(left_frame, bg='white', cursor='crosshair')
        self.canvas.pack(fill=tk.BOTH, expand=True)
        
        # Bind mouse events
        self.canvas.bind('<Button-1>', self.start_drawing)
        self.canvas.bind('<B1-Motion>', self.draw_rectangle)
        self.canvas.bind('<ButtonRelease-1>', self.end_drawing)
        
        # Right panel - Controls
        right_frame = ttk.Frame(main_frame, width=300)
        right_frame.pack(side=tk.RIGHT, fill=tk.Y, padx=(10, 0))
        right_frame.pack_propagate(False)
        
        # Image info
        info_frame = ttk.LabelFrame(right_frame, text="Image Info")
        info_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.info_label = ttk.Label(info_frame, text="No image loaded")
        self.info_label.pack(padx=10, pady=5)
        
        # Class selection
        class_frame = ttk.LabelFrame(right_frame, text="Select Class")
        class_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.class_var = tk.StringVar(value=self.class_names[0])
        for i, class_name in enumerate(self.class_names):
            ttk.Radiobutton(class_frame, text=class_name.replace('_', ' ').title(), 
                           variable=self.class_var, value=class_name,
                           command=self.on_class_change).pack(anchor=tk.W, padx=10, pady=2)
        
        # Current annotations
        ann_frame = ttk.LabelFrame(right_frame, text="Current Annotations")
        ann_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Annotations listbox
        self.ann_listbox = tk.Listbox(ann_frame, height=8)
        self.ann_listbox.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # Annotation buttons
        ann_btn_frame = ttk.Frame(ann_frame)
        ann_btn_frame.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Button(ann_btn_frame, text="Delete Selected", 
                  command=self.delete_selected_annotation).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(ann_btn_frame, text="Clear All", 
                  command=self.clear_annotations).pack(side=tk.LEFT)
        
        # Navigation
        nav_frame = ttk.LabelFrame(right_frame, text="Navigation")
        nav_frame.pack(fill=tk.X, pady=(0, 10))
        
        nav_btn_frame = ttk.Frame(nav_frame)
        nav_btn_frame.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Button(nav_btn_frame, text="Previous", 
                  command=self.previous_image).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(nav_btn_frame, text="Next", 
                  command=self.next_image).pack(side=tk.LEFT)
        
        # Save/Load
        save_frame = ttk.LabelFrame(right_frame, text="Save/Load")
        save_frame.pack(fill=tk.X, pady=(0, 10))
        
        save_btn_frame = ttk.Frame(save_frame)
        save_btn_frame.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Button(save_btn_frame, text="Save Annotations", 
                  command=self.save_annotations).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(save_btn_frame, text="Load Annotations", 
                  command=self.load_annotations).pack(side=tk.LEFT)
        
        # Instructions
        inst_frame = ttk.LabelFrame(right_frame, text="Instructions")
        inst_frame.pack(fill=tk.X)
        
        instructions = """
1. Click and drag to draw bounding box
2. Select class from radio buttons
3. Use Previous/Next to navigate
4. Save annotations when done
5. Press 'q' to quit
        """
        
        ttk.Label(inst_frame, text=instructions, justify=tk.LEFT).pack(padx=10, pady=5)
        
        # Load first image
        if self.image_files:
            self.load_current_image()
        
        # Bind keyboard shortcuts
        self.root.bind('<Key>', self.on_key_press)
        self.root.focus_set()
    
    def start_drawing(self, event):
        """Start drawing bounding box"""
        self.drawing = True
        self.start_point = (event.x, event.y)
    
    def draw_rectangle(self, event):
        """Draw rectangle while dragging"""
        if self.drawing and self.start_point:
            self.canvas.delete("temp_rect")
            self.canvas.create_rectangle(
                self.start_point[0], self.start_point[1], 
                event.x, event.y, outline="red", width=2, tags="temp_rect"
            )
    
    def end_drawing(self, event):
        """End drawing and create annotation"""
        if self.drawing and self.start_point:
            self.drawing = False
            self.end_point = (event.x, event.y)
            
            # Calculate bounding box in normalized coordinates
            canvas_width = self.canvas.winfo_width()
            canvas_height = self.canvas.winfo_height()
            
            x1, y1 = self.start_point
            x2, y2 = self.end_point
            
            # Normalize coordinates
            x_center = (x1 + x2) / 2 / canvas_width
            y_center = (y1 + y2) / 2 / canvas_height
            width = abs(x2 - x1) / canvas_width
            height = abs(y2 - y1) / canvas_height
            
            # Get current class
            class_name = self.class_var.get()
            class_id = self.class_names.index(class_name)
            
            # Create annotation
            annotation = BoundingBox(class_id, x_center, y_center, width, height)
            self.current_annotations.append(annotation)
            
            # Draw permanent rectangle
            color = self.get_class_color(class_id)
            self.canvas.create_rectangle(
                x1, y1, x2, y2, outline=color, width=2, 
                tags=f"annotation_{len(self.current_annotations)-1}"
            )
            
            # Update annotations list
            self.update_annotations_list()
            
            # Clear temporary rectangle
            self.canvas.delete("temp_rect")
    
    def get_class_color(self, class_id: int) -> str:
        """Get color for class"""
        colors = ['yellow', 'orange', 'red', 'purple']
        return colors[class_id % len(colors)]
    
    def update_annotations_list(self):
        """Update the annotations listbox"""
        self.ann_listbox.delete(0, tk.END)
        for i, ann in enumerate(self.current_annotations):
            class_name = self.class_names[ann.class_id]
            self.ann_listbox.insert(tk.END, f"{i+1}. {class_name}")
    
    def delete_selected_annotation(self):
        """Delete selected annotation"""
        selection = self.ann_listbox.curselection()
        if selection:
            index = selection[0]
            del self.current_annotations[index]
            self.canvas.delete(f"annotation_{index}")
            self.update_annotations_list()
            self.redraw_annotations()
    
    def clear_annotations(self):
        """Clear all annotations"""
        self.current_annotations.clear()
        self.canvas.delete("annotation")
        self.update_annotations_list()
    
    def redraw_annotations(self):
        """Redraw all annotations"""
        self.canvas.delete("annotation")
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        
        for i, ann in enumerate(self.current_annotations):
            x1 = (ann.x_center - ann.width / 2) * canvas_width
            y1 = (ann.y_center - ann.height / 2) * canvas_height
            x2 = (ann.x_center + ann.width / 2) * canvas_width
            y2 = (ann.y_center + ann.height / 2) * canvas_height
            
            color = self.get_class_color(ann.class_id)
            self.canvas.create_rectangle(
                x1, y1, x2, y2, outline=color, width=2, 
                tags=f"annotation_{i}"
            )
    
    def on_class_change(self):
        """Handle class selection change"""
        class_name = self.class_var.get()
        self.current_class_id = self.class_names.index(class_name)
    
    def load_current_image(self):
        """Load current image"""
        if not self.image_files:
            return
        
        image_info = self.image_files[self.current_image_index]
        image_path = image_info['path']
        
        # Load image
        image = Image.open(image_path)
        
        # Resize to fit canvas
        canvas_width = 800
        canvas_height = 600
        
        # Calculate scaling
        img_width, img_height = image.size
        scale = min(canvas_width / img_width, canvas_height / img_height)
        new_width = int(img_width * scale)
        new_height = int(img_height * scale)
        
        # Resize image
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Convert to PhotoImage
        self.current_image = ImageTk.PhotoImage(image)
        
        # Clear canvas and display image
        self.canvas.delete("all")
        self.canvas.create_image(canvas_width//2, canvas_height//2, 
                               image=self.current_image, anchor=tk.CENTER)
        
        # Update info
        self.info_label.config(text=f"Image {self.current_image_index + 1}/{len(self.image_files)}\n"
                                   f"Class: {image_info['class_name']}\n"
                                   f"File: {image_path.name}")
        
        # Load existing annotations
        self.load_annotations_for_image(image_path)
    
    def load_annotations_for_image(self, image_path: Path):
        """Load existing annotations for image"""
        annotation_path = image_path.with_suffix('.txt')
        self.current_annotations.clear()
        
        if annotation_path.exists():
            with open(annotation_path, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) == 5:
                        class_id = int(parts[0])
                        x_center = float(parts[1])
                        y_center = float(parts[2])
                        width = float(parts[3])
                        height = float(parts[4])
                        
                        annotation = BoundingBox(class_id, x_center, y_center, width, height)
                        self.current_annotations.append(annotation)
        
        self.update_annotations_list()
        self.redraw_annotations()
    
    def save_annotations(self):
        """Save current annotations"""
        if not self.image_files:
            return
        
        image_info = self.image_files[self.current_image_index]
        image_path = image_info['path']
        annotation_path = image_path.with_suffix('.txt')
        
        with open(annotation_path, 'w') as f:
            for ann in self.current_annotations:
                f.write(ann.to_yolo_line() + '\n')
        
        messagebox.showinfo("Success", f"Annotations saved to {annotation_path.name}")
    
    def load_annotations(self):
        """Load annotations from file"""
        file_path = filedialog.askopenfilename(
            title="Load Annotations",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")]
        )
        
        if file_path:
            self.current_annotations.clear()
            with open(file_path, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) == 5:
                        class_id = int(parts[0])
                        x_center = float(parts[1])
                        y_center = float(parts[2])
                        width = float(parts[3])
                        height = float(parts[4])
                        
                        annotation = BoundingBox(class_id, x_center, y_center, width, height)
                        self.current_annotations.append(annotation)
            
            self.update_annotations_list()
            self.redraw_annotations()
    
    def previous_image(self):
        """Go to previous image"""
        if self.current_image_index > 0:
            self.current_image_index -= 1
            self.load_current_image()
    
    def next_image(self):
        """Go to next image"""
        if self.current_image_index < len(self.image_files) - 1:
            self.current_image_index += 1
            self.load_current_image()
    
    def on_key_press(self, event):
        """Handle keyboard shortcuts"""
        if event.char == 'q':
            self.root.quit()
        elif event.char == 'n':
            self.next_image()
        elif event.char == 'p':
            self.previous_image()
        elif event.char == 's':
            self.save_annotations()
    
    def run(self):
        """Run the annotation tool"""
        self.create_gui()
        self.root.mainloop()

def create_auto_annotations(source_dir: Path, output_dir: Path):
    """Create automatic annotations for images (placeholder for future AI assistance)"""
    print("🤖 Creating automatic annotations...")
    
    class_names = [
        'broken_headlights_tail_lights',
        'broken_side_mirror', 
        'flat_tire',
        'oil_leak'
    ]
    
    # This is a placeholder - in the future, you could integrate with
    # pre-trained models or other AI tools to automatically generate annotations
    
    for class_dir in source_dir.iterdir():
        if class_dir.is_dir() and class_dir.name in class_names:
            class_id = class_names.index(class_dir.name)
            
            for image_file in class_dir.iterdir():
                if image_file.suffix.lower() in {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}:
                    # Create placeholder annotation (center of image, 20% size)
                    annotation_path = image_file.with_suffix('.txt')
                    
                    if not annotation_path.exists():
                        with open(annotation_path, 'w') as f:
                            f.write(f"{class_id} 0.5 0.5 0.2 0.2\n")
    
    print("✅ Auto-annotations created (placeholder)")

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Create annotations for motorcycle diagnostic dataset')
    parser.add_argument('--source', type=str, required=True, help='Source directory with organized images')
    parser.add_argument('--output', type=str, default='dataset', help='Output directory for dataset')
    parser.add_argument('--mode', type=str, choices=['gui', 'auto'], default='gui',
                        help='Annotation mode: gui (interactive) or auto (placeholder)')
    
    args = parser.parse_args()
    
    source_dir = Path(args.source)
    output_dir = Path(args.output)
    
    if not source_dir.exists():
        print(f"❌ Source directory not found: {source_dir}")
        return 1
    
    try:
        if args.mode == 'gui':
            # Interactive annotation tool
            creator = AnnotationCreator(source_dir, output_dir)
            creator.run()
        else:
            # Automatic annotation creation
            create_auto_annotations(source_dir, output_dir)
        
        print("✅ Annotation creation completed!")
        
    except Exception as e:
        print(f"❌ Annotation creation failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
