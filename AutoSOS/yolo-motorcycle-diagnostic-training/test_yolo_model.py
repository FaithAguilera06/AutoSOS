#!/usr/bin/env python3
"""
Test YOLOv8 Model Without Camera
Simple script to test the trained model with sample images
"""

import os
import cv2
import numpy as np
from ultralytics import YOLO
from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image
import random

# Class names and colors
CLASS_NAMES = {
    0: "broken_headlights_tail_lights",
    1: "broken_side_mirror", 
    2: "flat_tire",
    3: "oil_leak"
}

CLASS_DISPLAY_NAMES = {
    0: "Broken Headlights/Tail Lights",
    1: "Broken Side Mirror",
    2: "Flat Tire", 
    3: "Oil Leak"
}

CLASS_COLORS = {
    0: (255, 255, 0),    # Yellow
    1: (255, 165, 0),    # Orange
    2: (0, 0, 255),      # Red
    3: (128, 0, 128)     # Purple
}

def test_model_with_sample_images():
    """Test the YOLOv8 model with sample images"""
    
    # Load the trained model
    model_path = "runs/detect/train3/weights/best.pt"
    if not os.path.exists(model_path):
        print(f"❌ Model not found: {model_path}")
        return
    
    print(f"✅ Loading YOLOv8 model from: {model_path}")
    model = YOLO(model_path)
    
    # Test with images from the dataset
    test_directories = [
        "organized_dataset/broken_headlights_tail_lights",
        "organized_dataset/broken_side_mirror", 
        "organized_dataset/flat_tire",
        "organized_dataset/oil_leak"
    ]
    
    print("\n🔍 Testing model with sample images...")
    
    for test_dir in test_directories:
        if os.path.exists(test_dir):
            print(f"\n📁 Testing with images from: {test_dir}")
            
            # Get a few random images from each category
            image_files = [f for f in os.listdir(test_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
            
            if image_files:
                # Test with 2-3 random images from each category
                test_images = random.sample(image_files, min(3, len(image_files)))
                
                for img_file in test_images:
                    img_path = os.path.join(test_dir, img_file)
                    test_single_image(model, img_path)
            else:
                print(f"   ⚠️  No images found in {test_dir}")
        else:
            print(f"   ⚠️  Directory not found: {test_dir}")

def test_single_image(model, image_path, confidence_threshold=0.3):
    """Test a single image with the model"""
    
    try:
        # Load and process image
        image = cv2.imread(image_path)
        if image is None:
            print(f"   ❌ Could not load image: {image_path}")
            return
        
        print(f"   🖼️  Testing: {os.path.basename(image_path)}")
        
        # Run inference
        results = model(image, conf=confidence_threshold)
        
        # Process results
        detections = []
        annotated_image = image.copy()
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    confidence = box.conf[0].cpu().numpy()
                    class_id = int(box.cls[0].cpu().numpy())
                    
                    class_name = CLASS_NAMES.get(class_id, f"unknown_{class_id}")
                    display_name = CLASS_DISPLAY_NAMES.get(class_id, f"Unknown Issue {class_id}")
                    color = CLASS_COLORS.get(class_id, (0, 255, 0))
                    
                    detection = {
                        "class_id": class_id,
                        "class_name": class_name,
                        "display_name": display_name,
                        "confidence": float(confidence),
                        "bbox": [float(x1), float(y1), float(x2), float(y2)]
                    }
                    detections.append(detection)
                    
                    # Draw bounding box
                    cv2.rectangle(annotated_image, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                    label = f"{display_name}: {confidence:.2f}"
                    cv2.putText(annotated_image, label, (int(x1), int(y1) - 10), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        # Print results
        if detections:
            print(f"      ✅ Found {len(detections)} detection(s):")
            for det in detections:
                print(f"         - {det['display_name']}: {det['confidence']:.2f} confidence")
        else:
            print(f"      ⚠️  No detections found (confidence threshold: {confidence_threshold})")
        
        # Save annotated image
        output_path = f"test_results_{os.path.basename(image_path)}"
        cv2.imwrite(output_path, annotated_image)
        print(f"      💾 Annotated image saved: {output_path}")
        
    except Exception as e:
        print(f"   ❌ Error testing {image_path}: {e}")

def test_with_random_colors():
    """Test the model with random colored images to see how it behaves"""
    
    print("\n🎨 Testing with random colored images...")
    
    model_path = "runs/detect/train3/weights/best.pt"
    if not os.path.exists(model_path):
        print(f"❌ Model not found: {model_path}")
        return
    
    model = YOLO(model_path)
    
    # Create random test images
    test_images = []
    colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), (255, 0, 255)]
    
    for i, color in enumerate(colors):
        # Create a random colored image
        random_image = np.full((640, 640, 3), color, dtype=np.uint8)
        
        # Add some random noise
        noise = np.random.randint(0, 50, (640, 640, 3), dtype=np.uint8)
        random_image = cv2.add(random_image, noise)
        
        # Save test image
        test_path = f"random_test_{i}.jpg"
        cv2.imwrite(test_path, random_image)
        test_images.append(test_path)
    
    # Test each random image
    for test_path in test_images:
        test_single_image(model, test_path, confidence_threshold=0.1)
        os.remove(test_path)  # Clean up

def test_model_info():
    """Display model information"""
    
    print("📊 YOLOv8 Model Information")
    print("=" * 50)
    
    model_path = "runs/detect/train3/weights/best.pt"
    if not os.path.exists(model_path):
        print(f"❌ Model not found: {model_path}")
        return
    
    model = YOLO(model_path)
    
    # Get model info
    print(f"Model Path: {model_path}")
    print(f"Model Size: {os.path.getsize(model_path) / (1024*1024):.1f} MB")
    
    # Test with a dummy image to get model info
    dummy_image = np.zeros((640, 640, 3), dtype=np.uint8)
    results = model(dummy_image)
    
    print(f"Input Size: 640x640")
    print(f"Classes: {len(CLASS_NAMES)}")
    print("Class Names:")
    for class_id, name in CLASS_NAMES.items():
        print(f"  {class_id}: {CLASS_DISPLAY_NAMES[class_id]}")

def main():
    """Main test function"""
    
    print("🤖 YOLOv8 Motorcycle Diagnostic Model Test")
    print("=" * 60)
    
    # Test 1: Model information
    test_model_info()
    
    # Test 2: Test with sample images
    test_model_with_sample_images()
    
    # Test 3: Test with random images
    test_with_random_colors()
    
    print("\n✅ Testing complete!")
    print("\n📝 Notes:")
    print("- Check the generated 'test_results_*.jpg' files to see detection results")
    print("- If no detections are found, try lowering the confidence threshold")
    print("- The model should detect issues in images from the training dataset")
    print("- Random colored images should typically not trigger detections")

if __name__ == "__main__":
    main()
