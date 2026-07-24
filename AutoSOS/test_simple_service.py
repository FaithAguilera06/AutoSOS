#!/usr/bin/env python3
"""
Simple test to verify the service can start
"""

print("Testing Python execution...")
print("Service will start shortly...")

from local_yolo_supabase_service import app
import uvicorn

print("Starting service on port 8000...")
uvicorn.run(app, host="0.0.0.0", port=8000)

