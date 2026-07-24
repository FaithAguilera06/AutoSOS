#!/usr/bin/env python3
"""
Check if face database exists in Supabase Storage
"""

import os
import pickle
from supabase import create_client, Client

def check_face_database():
    """Check if face database exists in Supabase Storage"""
    
    # Supabase configuration
    SUPABASE_URL = "https://atdibhoeaeqfgjswcqwx.supabase.co"
    SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZGliaG9lYWVxZmdqc3djcXd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1NTIzOSwiZXhwIjoyMDcyOTMxMjM5fQ.nJoAQZAcR7VeX-lmbKbtjHTjj5U5gfpavJ8fhgWTPU8"
    
    print("Checking face database in Supabase Storage...")
    
    # Initialize Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Check if face database exists
    try:
        print("Downloading face database from Supabase Storage...")
        response = supabase.storage.from_("autosos").download("autosos/models/facenet/face_embeddings.pkl")
        
        if response:
            print("SUCCESS: Face database exists in Supabase Storage!")
            print(f"File size: {len(response)} bytes")
            
            # Try to load and inspect the database
            try:
                face_db = pickle.loads(response)
                print(f"Database structure: {list(face_db.keys())}")
                print(f"Number of embeddings: {len(face_db.get('embeddings', {}))}")
                print(f"Number of database entries: {len(face_db.get('database', {}))}")
                
                if face_db.get('embeddings') and face_db.get('database'):
                    print("Database is properly structured and ready for use!")
                else:
                    print("Database is empty but properly structured.")
                    
            except Exception as e:
                print(f"Warning: Could not parse database content: {e}")
                print("But the file exists, which is the main requirement.")
                
        else:
            print("ERROR: Face database not found in Supabase Storage")
            
    except Exception as e:
        print(f"ERROR: Failed to download face database: {e}")
        
        # Check if it's a permissions issue
        if "unauthorized" in str(e).lower() or "forbidden" in str(e).lower():
            print("This might be a permissions issue. Make sure you're using the service role key.")
        elif "not found" in str(e).lower():
            print("The file doesn't exist. You need to upload it first.")
        else:
            print("Unknown error occurred.")
    
    print("\nFace database check complete!")

if __name__ == "__main__":
    check_face_database()
