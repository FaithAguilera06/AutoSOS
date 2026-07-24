#!/usr/bin/env python3
"""
Upload FaceNet models to Supabase storage
"""

import os
import hashlib
from supabase import create_client, Client
import requests

# Supabase configuration
SUPABASE_URL = "https://atdibhoeaeqfgjswcqwx.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZGliaG9lYWVxZmdqc3djcXd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNTUyMzksImV4cCI6MjA3MjkzMTIzOX0.VO3uDBCOCUw0HItJnVG5WwoGuZKNG5I3ulmbZUdodk4"

def calculate_file_hash(file_path):
    """Calculate SHA256 hash of a file"""
    hash_sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_sha256.update(chunk)
    return hash_sha256.hexdigest()

def get_file_size(file_path):
    """Get file size in bytes"""
    return os.path.getsize(file_path)

def upload_model_to_storage(supabase: Client, file_path: str, model_name: str, model_type: str):
    """Upload model file to Supabase storage"""
    try:
        # Read the file
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        # Upload to storage
        file_name = os.path.basename(file_path)
        storage_path = f"models/{model_name}/{file_name}"
        
        print(f"Uploading {file_name} to {storage_path}...")
        
        result = supabase.storage.from_("ml_models").upload(
            path=storage_path,
            file=file_data,
            file_options={"content-type": "application/octet-stream"}
        )
        
        if result:
            print(f"✅ Successfully uploaded {file_name}")
            return storage_path
        else:
            print(f"❌ Failed to upload {file_name}")
            return None
            
    except Exception as e:
        print(f"❌ Error uploading {file_name}: {e}")
        return None

def update_database_record(supabase: Client, model_name: str, model_type: str, file_path: str, storage_path: str):
    """Update or create database record for the model"""
    try:
        file_size = get_file_size(file_path)
        file_hash = calculate_file_hash(file_path)
        
        model_data = {
            "model_name": model_name,
            "model_type": model_type,
            "version": "1.0.0",
            "file_path": storage_path,
            "file_size": file_size,
            "file_hash": file_hash,
            "is_active": True,
            "description": f"FaceNet {model_type} model for facial recognition",
            "created_by": "system"
        }
        
        print(f"Updating database record for {model_name}...")
        
        # Try to update existing record first
        result = supabase.table("ml_models").upsert(
            model_data,
            on_conflict="model_name,model_type"
        ).execute()
        
        if result.data:
            print(f"✅ Database record updated for {model_name}")
            return True
        else:
            print(f"❌ Failed to update database record for {model_name}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating database record: {e}")
        return False

def main():
    print("🚀 Starting FaceNet model upload to Supabase...")
    
    # Initialize Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Define models to upload
    models_to_upload = [
        {
            "file_path": "facial_recognition/models/facenet_mobile.h5",
            "model_name": "facenet_mobile",
            "model_type": "h5"
        },
        {
            "file_path": "facial_recognition/models/facenet_mobile.tflite",
            "model_name": "facenet_mobile",
            "model_type": "tflite"
        }
    ]
    
    success_count = 0
    
    for model_info in models_to_upload:
        file_path = model_info["file_path"]
        model_name = model_info["model_name"]
        model_type = model_info["model_type"]
        
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            continue
        
        print(f"\n📁 Processing {model_name} ({model_type})...")
        
        # Upload to storage
        storage_path = upload_model_to_storage(supabase, file_path, model_name, model_type)
        
        if storage_path:
            # Update database record
            if update_database_record(supabase, model_name, model_type, file_path, storage_path):
                success_count += 1
                print(f"✅ {model_name} ({model_type}) uploaded successfully!")
            else:
                print(f"❌ Failed to update database record for {model_name} ({model_type})")
        else:
            print(f"❌ Failed to upload {model_name} ({model_type})")
    
    print(f"\n🎉 Upload complete! {success_count}/{len(models_to_upload)} models uploaded successfully.")
    
    if success_count == len(models_to_upload):
        print("✅ All FaceNet models are now available in Supabase!")
        print("🚀 You can now start the FaceNet backend service.")
    else:
        print("⚠️ Some models failed to upload. Check the errors above.")

if __name__ == "__main__":
    main()
