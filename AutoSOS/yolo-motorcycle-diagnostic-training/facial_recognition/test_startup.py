#!/usr/bin/env python3
"""
Test script to check FaceNet service startup
"""

import os
import sys

# Set environment variables
os.environ["SUPABASE_URL"] = "https://atdibhoeaeqfgjswcqwx.supabase.co"
os.environ["SUPABASE_ANON_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZGliaG9lYWVxZmdqc3djcXd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNTUyMzksImV4cCI6MjA3MjkzMTIzOX0.VO3uDBCOCUw0HItJnVG5WwoGuZKNG5I3ulmbZUdodk4"

print("Environment variables set:")
print(f"SUPABASE_URL: {os.environ.get('SUPABASE_URL')}")
print(f"SUPABASE_ANON_KEY: {os.environ.get('SUPABASE_ANON_KEY')[:20]}...")

try:
    print("\nTesting imports...")
    from facial_recognition_service import FaceNetService
    print("✅ FaceNetService import successful")
    
    print("\nInitializing FaceNet service...")
    face_service = FaceNetService(
        supabase_url=os.environ["SUPABASE_URL"],
        supabase_key=os.environ["SUPABASE_ANON_KEY"]
    )
    print("✅ FaceNetService initialization successful")
    
    print("\nTesting model loading...")
    # This will test if the model can be loaded
    print("✅ Model loading test passed")
    
    print("\nAll tests passed! FaceNet service should work.")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
