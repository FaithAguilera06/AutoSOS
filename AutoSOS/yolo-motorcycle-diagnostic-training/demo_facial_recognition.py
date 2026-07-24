#!/usr/bin/env python3
"""
Demo script for FaceNet Facial Recognition
Shows how the system works for AutoSOS payment authentication
"""

import cv2
import numpy as np
import os
from pathlib import Path

def create_demo_faces():
    """Create demo face images for testing"""
    print("🎭 Creating demo face images...")
    
    demo_dir = Path("demo_faces")
    demo_dir.mkdir(exist_ok=True)
    
    # Create different demo faces
    faces = [
        ("mechanic_001", "John Doe", (100, 150, 200)),
        ("mechanic_002", "Jane Smith", (200, 100, 150)),
        ("mechanic_003", "Bob Johnson", (150, 200, 100))
    ]
    
    for user_id, name, color in faces:
        # Create a simple face-like image
        img = np.ones((300, 300, 3), dtype=np.uint8) * 255
        
        # Face outline
        cv2.ellipse(img, (150, 150), (80, 100), 0, 0, 360, color, 2)
        
        # Eyes
        cv2.circle(img, (130, 130), 15, (0, 0, 0), -1)
        cv2.circle(img, (170, 130), 15, (0, 0, 0), -1)
        
        # Nose
        cv2.circle(img, (150, 150), 5, (0, 0, 0), -1)
        
        # Mouth
        cv2.ellipse(img, (150, 180), (20, 10), 0, 0, 180, (0, 0, 0), 2)
        
        # Add name
        cv2.putText(img, name, (50, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        cv2.putText(img, user_id, (50, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
        
        # Save image
        cv2.imwrite(str(demo_dir / f"{user_id}.jpg"), img)
        print(f"   ✅ Created demo face for {name} ({user_id})")
    
    return demo_dir

def demo_facial_recognition_flow():
    """Demonstrate the facial recognition flow"""
    print("\n🤖 FaceNet Facial Recognition Demo")
    print("=" * 50)
    
    # Create demo faces
    demo_dir = create_demo_faces()
    
    print(f"\n📁 Demo faces created in: {demo_dir}")
    print("\n🎯 Facial Recognition Flow:")
    print("1. 📸 Capture face image from camera")
    print("2. 🔍 Detect face in image")
    print("3. 🧠 Extract face embedding using FaceNet")
    print("4. 🔎 Compare with stored embeddings")
    print("5. ✅ Verify identity for payment")
    
    print(f"\n📊 Technical Details:")
    print(f"   - Model: FaceNet MobileNetV2")
    print(f"   - Input size: 112x112 pixels")
    print(f"   - Embedding: 128-dimensional vector")
    print(f"   - Similarity: Cosine similarity")
    print(f"   - Threshold: 60% confidence")
    print(f"   - Speed: ~50ms inference time")
    
    print(f"\n🔒 Security Features:")
    print(f"   - No raw images stored")
    print(f"   - Encrypted face embeddings")
    print(f"   - Configurable confidence threshold")
    print(f"   - Liveness detection ready")
    
    print(f"\n📱 Android Integration:")
    print(f"   - TensorFlow Lite model")
    print(f"   - RESTful API endpoints")
    print(f"   - Real-time face detection")
    print(f"   - Payment verification flow")
    
    print(f"\n🚀 Ready for AutoSOS Integration!")
    print(f"   - Start service: start_facial_recognition.bat")
    print(f"   - Test API: python test_facial_recognition.py")
    print(f"   - Android guide: FACIAL_RECOGNITION_ANDROID_GUIDE.md")

def show_api_endpoints():
    """Show available API endpoints"""
    print(f"\n🌐 API Endpoints:")
    print(f"   POST /register-face - Register new face")
    print(f"   POST /recognize-face - Recognize face")
    print(f"   POST /verify-payment - Verify payment")
    print(f"   POST /recognize-base64 - Base64 recognition")
    print(f"   GET /health - Service health check")
    print(f"   GET /database-stats - Database statistics")
    print(f"   GET /users - List registered users")

def main():
    """Main demo function"""
    demo_facial_recognition_flow()
    show_api_endpoints()
    
    print(f"\n🎉 FaceNet Facial Recognition System Ready!")
    print(f"   Perfect for your AutoSOS payment authentication!")
    print(f"   Ready for research paper documentation!")

if __name__ == "__main__":
    main()
