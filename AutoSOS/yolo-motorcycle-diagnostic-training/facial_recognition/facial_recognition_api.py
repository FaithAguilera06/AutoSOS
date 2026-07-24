#!/usr/bin/env python3
"""
FastAPI service for FaceNet-based facial recognition
AutoSOS Payment Authentication System
Now loads models from Supabase database
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
from PIL import Image
import io
import base64
from typing import Optional, Dict, Any
import logging
from datetime import datetime
import json
import os
import time

from facial_recognition_service import FaceNetService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AutoSOS Facial Recognition API",
    description="FaceNet-based facial recognition for payment authentication",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize FaceNet service with Supabase configuration
supabase_url = os.getenv("SUPABASE_URL", "your_supabase_url")
supabase_key = os.getenv("SUPABASE_ANON_KEY", "your_supabase_key")

face_service = FaceNetService(
    supabase_url=supabase_url if supabase_url != "your_supabase_url" else None,
    supabase_key=supabase_key if supabase_key != "your_supabase_key" else None
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "AutoSOS Facial Recognition API",
        "status": "running",
        "service": "FaceNet-based facial recognition"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    stats = face_service.get_database_stats()
    return {
        "status": "healthy",
        "service": "facial_recognition",
        "model": "FaceNet MobileNetV2",
        "database_stats": stats,
        "threshold": face_service.threshold,
        "total_registered_faces": face_service.get_face_count(),
        "supabase_connected": face_service.supabase_face_service is not None
    }

@app.post("/register-face")
async def register_face(
    user_id: str = Form(...),
    user_name: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Register a new face in the database
    
    Args:
        user_id: Unique identifier for the user
        user_name: Display name for the user
        file: Image file containing the face
    
    Returns:
        Registration result
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        image_array = np.array(image)
        
        # Convert RGB to BGR for OpenCV
        if len(image_array.shape) == 3 and image_array.shape[2] == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        # Register face
        success = face_service.register_face(user_id, user_name, image_array)
        
        if success:
            # Log successful registration
            if face_service.supabase_face_service:
                face_service.supabase_face_service.log_face_registration(
                    user_id=user_id,
                    was_successful=True,
                    metadata={
                        'image_size': image_array.shape,
                        'api_endpoint': '/register-face'
                    }
                )
            
            return {
                "success": True,
                "message": f"Face registered successfully for user {user_id}",
                "user_id": user_id,
                "user_name": user_name,
                "registered_at": datetime.now().isoformat(),
                "total_registered_faces": face_service.get_face_count()
            }
        else:
            # Log failed registration
            if face_service.supabase_face_service:
                face_service.supabase_face_service.log_face_registration(
                    user_id=user_id,
                    was_successful=False,
                    error_message="Failed to register face - no face detected or embedding extraction failed",
                    metadata={
                        'image_size': image_array.shape,
                        'api_endpoint': '/register-face'
                    }
                )
            
            raise HTTPException(status_code=400, detail="Failed to register face")
            
    except Exception as e:
        logger.error(f"Error registering face: {e}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/recognize-face")
async def recognize_face(file: UploadFile = File(...)):
    """
    Recognize a face from uploaded image
    
    Args:
        file: Image file containing the face
    
    Returns:
        Recognition result with user information
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        image_array = np.array(image)
        
        # Convert RGB to BGR for OpenCV
        if len(image_array.shape) == 3 and image_array.shape[2] == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        # Recognize face
        result = face_service.recognize_face(image_array)
        
        if result:
            return {
                "success": True,
                "recognized": True,
                "user_id": result['user_id'],
                "user_name": result['user_name'],
                "confidence": result['confidence'],
                "similarity": result['similarity'],
                "face_detected": True
            }
        else:
            return {
                "success": True,
                "recognized": False,
                "message": "Face not recognized or not in database",
                "face_detected": len(face_service.detect_faces(image_array)) > 0
            }
            
    except Exception as e:
        logger.error(f"Error recognizing face: {e}")
        raise HTTPException(status_code=500, detail=f"Recognition failed: {str(e)}")

@app.post("/verify-payment")
async def verify_payment_face(
    expected_user_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Verify face for payment authentication
    
    Args:
        expected_user_id: The user ID expected for this payment
        file: Image file containing the face
    
    Returns:
        Payment verification result
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        image_array = np.array(image)
        
        # Convert RGB to BGR for OpenCV
        if len(image_array.shape) == 3 and image_array.shape[2] == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        # Verify face for payment
        verification = face_service.verify_payment_face(image_array, expected_user_id)
        
        return {
            "success": True,
            "verified": verification['verified'],
            "user_id": verification.get('user_id'),
            "user_name": verification.get('user_name'),
            "confidence": verification['confidence'],
            "reason": verification.get('reason'),
            "verified_at": datetime.now().isoformat()
        }
            
    except Exception as e:
        logger.error(f"Error verifying payment face: {e}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@app.post("/recognize-base64")
async def recognize_face_base64(
    image_data: str,
    expected_user_id: Optional[str] = None
):
    """
    Recognize face from base64 encoded image
    
    Args:
        image_data: Base64 encoded image string
        expected_user_id: Optional expected user ID for verification
    
    Returns:
        Recognition or verification result
    """
    try:
        # Decode base64 image
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        image_array = np.array(image)
        
        # Convert RGB to BGR for OpenCV
        if len(image_array.shape) == 3 and image_array.shape[2] == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        if expected_user_id:
            # Verify for payment
            verification = face_service.verify_payment_face(image_array, expected_user_id)
            return {
                "success": True,
                "verified": verification['verified'],
                "user_id": verification.get('user_id'),
                "user_name": verification.get('user_name'),
                "confidence": verification['confidence'],
                "reason": verification.get('reason'),
                "verified_at": datetime.now().isoformat()
            }
        else:
            # General recognition
            result = face_service.recognize_face(image_array)
            
            if result:
                return {
                    "success": True,
                    "recognized": True,
                    "user_id": result['user_id'],
                    "user_name": result['user_name'],
                    "confidence": result['confidence'],
                    "similarity": result['similarity']
                }
            else:
                return {
                    "success": True,
                    "recognized": False,
                    "message": "Face not recognized or not in database"
                }
            
    except Exception as e:
        logger.error(f"Error processing base64 image: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/database-stats")
async def get_database_stats():
    """Get face database statistics"""
    try:
        stats = face_service.get_database_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Error getting database stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@app.delete("/remove-user/{user_id}")
async def remove_user(user_id: str):
    """Remove a user from the face database"""
    try:
        if user_id in face_service.face_embeddings:
            del face_service.face_embeddings[user_id]
            del face_service.user_info[user_id]
            face_service._save_face_database()
            
            return {
                "success": True,
                "message": f"User {user_id} removed successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="User not found")
            
    except Exception as e:
        logger.error(f"Error removing user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove user: {str(e)}")

@app.get("/users")
async def list_users():
    """List all registered users"""
    try:
        users = []
        for user_id, info in face_service.user_info.items():
            users.append({
                "user_id": user_id,
                "user_name": info['name'],
                "registered_at": info['registered_at']
            })
        
        return {
            "success": True,
            "users": users,
            "total_count": len(users)
        }
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list users: {str(e)}")

@app.post("/process-payment")
async def process_payment(
    client_id: str = Form(...),
    mechanic_id: str = Form(...),
    booking_id: str = Form(...),
    amount: float = Form(...),
    file: UploadFile = File(...)
):
    """
    Process facial recognition payment
    - Verify the client's face
    - Return payment verification data for wallet processing
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        image_array = np.array(image)
        
        # Convert RGB to BGR for OpenCV
        if len(image_array.shape) == 3 and image_array.shape[2] == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        # Verify face matches the client
        recognition_result = face_service.recognize_face(image_array)
        
        if not recognition_result:
            return {
                "success": False,
                "verified": False,
                "message": "No face detected in the image",
                "payment_data": None
            }
        
        # Check if the recognized face matches the client
        if recognition_result['user_id'] != client_id:
            return {
                "success": False,
                "verified": False,
                "message": "Face does not match the registered client",
                "payment_data": None
            }
        
        # Check confidence threshold
        if recognition_result['confidence'] < face_service.threshold:
            return {
                "success": False,
                "verified": False,
                "message": f"Face verification confidence too low: {recognition_result['confidence']:.2f} < {face_service.threshold}",
                "payment_data": None
            }
        
        # Face verification successful - return payment data
        payment_data = {
            "client_id": client_id,
            "mechanic_id": mechanic_id,
            "booking_id": booking_id,
            "amount": amount,
            "verification_photo": base64.b64encode(image_bytes).decode('utf-8'),
            "facial_verification_data": {
                "user_id": recognition_result['user_id'],
                "user_name": recognition_result['user_name'],
                "confidence": recognition_result['confidence'],
                "verified_at": datetime.now().isoformat()
            }
        }
        
        return {
            "success": True,
            "verified": True,
            "message": "Face verification successful",
            "payment_data": payment_data
        }
        
    except Exception as e:
        logger.error(f"Error processing payment: {e}")
        raise HTTPException(status_code=500, detail=f"Payment processing failed: {str(e)}")

@app.get("/check-face-registration/{user_id}")
async def check_face_registration(user_id: str):
    """Check if a user has a registered face"""
    try:
        is_registered = face_service.is_face_registered(user_id)
        
        return {
            "success": True,
            "user_id": user_id,
            "is_registered": is_registered,
            "message": "Face is registered" if is_registered else "Face is not registered"
        }
    except Exception as e:
        logger.error(f"Error checking face registration: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check registration: {str(e)}")

@app.get("/face-statistics")
async def get_face_statistics():
    """Get comprehensive face recognition statistics"""
    try:
        stats = {
            "total_registered_faces": face_service.get_face_count(),
            "supabase_connected": face_service.supabase_face_service is not None,
            "threshold": face_service.threshold,
            "model_info": {
                "type": "FaceNet MobileNetV2",
                "input_size": face_service.input_size
            }
        }
        
        # Get additional stats from Supabase if available
        if face_service.supabase_face_service:
            try:
                recognition_stats = face_service.supabase_face_service.get_face_recognition_stats()
                stats["recognition_stats"] = recognition_stats
            except Exception as e:
                logger.warning(f"Could not get recognition stats from Supabase: {e}")
        
        return {
            "success": True,
            "statistics": stats
        }
    except Exception as e:
        logger.error(f"Error getting face statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")

@app.delete("/remove-face/{user_id}")
async def remove_face(user_id: str):
    """Remove a user's face from the database"""
    try:
        # Remove from Supabase if available
        if face_service.supabase_face_service:
            success = face_service.supabase_face_service.deactivate_face_embedding(user_id)
            if not success:
                logger.warning(f"Failed to remove face from Supabase for user {user_id}")
        
        # Remove from local memory
        if user_id in face_service.face_embeddings:
            del face_service.face_embeddings[user_id]
            del face_service.user_info[user_id]
            face_service._save_face_database()
        
        return {
            "success": True,
            "message": f"Face removed successfully for user {user_id}",
            "total_registered_faces": face_service.get_face_count()
        }
    except Exception as e:
        logger.error(f"Error removing face: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove face: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
