#!/usr/bin/env python3
"""
Script to upload YOLOv8 model to Supabase Storage
"""

import os
from supabase import create_client, Client

def upload_yolo_model():
    """Upload YOLOv8 model to Supabase Storage"""
    
    # Supabase configuration
    supabase_url = "https://atdibhoeaeqfgjswcqwx.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZGliaG9lYWVxZmdqc3djcXd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1NTIzOSwiZXhwIjoyMDcyOTMxMjM5fQ.nJoAQZAcR7VeX-lmbKbtjHTjj5U5gfpavJ8fhgWTPU8"
    
    # Initialize Supabase client
    supabase: Client = create_client(supabase_url, supabase_key)
    
    print("Uploading YOLOv8 model to Supabase Storage...")
    
    # Check for model files in common locations
    possible_paths = [
        "yolo-motorcycle-diagnostic-training/runs/detect/train/weights/best.pt",
        "yolo-motorcycle-diagnostic-training/runs/detect/train/weights/last.pt",
        "models/best.pt",
        "best.pt",
        "motorcycle_diagnostic_v1.pt"
    ]
    
    model_found = False
    for model_path in possible_paths:
        if os.path.exists(model_path):
            print(f"Found model: {model_path}")
            
            try:
                # Read the model file
                with open(model_path, 'rb') as f:
                    model_data = f.read()
                
                # Upload to Supabase Storage
                storage_path = "autosos/models/yolov8/motorcycle_diagnostic_v1.pt"
                response = supabase.storage.from_("autosos").upload(
                    storage_path,
                    model_data,
                    {"content-type": "application/octet-stream"}
                )
                
                print(f"SUCCESS: Model uploaded to {storage_path}")
                print(f"File size: {len(model_data) / (1024*1024):.2f} MB")
                model_found = True
                break
                
            except Exception as e:
                print(f"ERROR uploading {model_path}: {e}")
    
    if not model_found:
        print("ERROR: No model file found in the following locations:")
        for path in possible_paths:
            print(f"  - {path}")
        print("\nPlease make sure your trained model file exists in one of these locations.")

if __name__ == "__main__":
    upload_yolo_model()
