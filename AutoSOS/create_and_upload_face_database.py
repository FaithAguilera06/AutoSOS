#!/usr/bin/env python3
"""
Create and upload face database to Supabase Storage
"""

import os
import pickle
import time
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_and_upload_face_database():
    """Create an empty face database and upload it to Supabase Storage"""
    
    # Supabase configuration
    SUPABASE_URL = "https://atdibhoeaeqfgjswcqwx.supabase.co"
    SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZGliaG9lYWVxZmdqc3djcXd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1NTIzOSwiZXhwIjoyMDcyOTMxMjM5fQ.nJoAQZAcR7VeX-lmbKbtjHTjj5U5gfpavJ8fhgWTPU8"
    
    print("Creating face database...")
    
    # Initialize Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Create empty face database structure
    face_database = {
        'embeddings': {},  # Empty embeddings dictionary
        'database': {}     # Empty database dictionary
    }
    
    # Create local directory if it doesn't exist
    os.makedirs("temp_face_db", exist_ok=True)
    local_path = "temp_face_db/face_embeddings.pkl"
    
    # Save face database to local file
    with open(local_path, 'wb') as f:
        pickle.dump(face_database, f)
    
    print(f"Created face database at: {local_path}")
    print(f"Database structure: {face_database}")
    
    # Upload to Supabase Storage
    try:
        print("Uploading face database to Supabase Storage...")
        
        with open(local_path, 'rb') as f:
            db_data = f.read()
        
        # Upload to the correct path in Supabase Storage
        result = supabase.storage.from_("autosos").upload(
            "autosos/models/facenet/face_embeddings.pkl",
            db_data,
            {"content-type": "application/octet-stream"}
        )
        
        print("✅ Face database uploaded successfully!")
        print(f"Upload result: {result}")
        
        # Verify the upload
        print("Verifying upload...")
        try:
            response = supabase.storage.from_("autosos").download("autosos/models/facenet/face_embeddings.pkl")
            if response:
                print("✅ Verification successful - file exists in storage")
                print(f"File size: {len(response)} bytes")
            else:
                print("❌ Verification failed - file not found")
        except Exception as e:
            print(f"❌ Verification error: {e}")
        
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        
        # Check if file already exists
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
            print("File already exists in storage. This is normal for the first upload.")
            print("The FaceNet service should now be able to find the face database.")
        else:
            print("Please check your Supabase credentials and storage bucket configuration.")
    
    # Clean up local file
    try:
        os.remove(local_path)
        os.rmdir("temp_face_db")
        print("Cleaned up local temporary files.")
    except:
        pass
    
    print("\nFace database setup complete!")
    print("The FaceNet service should now be able to load the face database from Supabase Storage.")

if __name__ == "__main__":
    create_and_upload_face_database()
