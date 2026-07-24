#!/usr/bin/env python3
"""
FaceNet-based Facial Recognition Service for AutoSOS Payment System
Optimized for Android deployment with TensorFlow Lite
Now loads models from Supabase database instead of local files
"""

import os
import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.models import Model
import pickle
import base64
import json
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import logging
from datetime import datetime
import hashlib
import sys
import time

# Add parent directory to path to import model_download_service
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from model_download_service import ModelDownloadService
from supabase_face_service import SupabaseFaceService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FaceNetService:
    """
    FaceNet-based facial recognition service for payment authentication
    Optimized for Android deployment
    Now loads models from Supabase database
    """
    
    def __init__(self, model_path: str = "models/facenet_mobile.tflite", 
                 face_db_path: str = "face_database/face_embeddings.pkl",
                 supabase_url: Optional[str] = None,
                 supabase_key: Optional[str] = None):
        self.model_path = model_path
        self.face_db_path = face_db_path
        self.face_embeddings = {}
        self.user_info = {}
        self.threshold = 0.6  # Similarity threshold for face matching
        self.input_size = (112, 112)  # FaceNet input size
        
        # Initialize model download service
        self.model_download_service = None
        self.current_model_info = None
        
        # Initialize Supabase face service
        self.supabase_face_service = None
        
        if supabase_url and supabase_key:
            try:
                self.model_download_service = ModelDownloadService(
                    supabase_url=supabase_url,
                    supabase_key=supabase_key,
                    cache_dir="model_cache"
                )
                logger.info("Model download service initialized")
                
                # Initialize Supabase face service
                self.supabase_face_service = SupabaseFaceService(supabase_url, supabase_key)
                logger.info("Supabase face service initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Supabase services: {e}")
        
        # Initialize face detection
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
        # Load or create model
        self.model = self._load_or_create_model()
        
        # Load face database
        self._load_face_database()
    
    def _load_or_create_model(self):
        """Load existing model or create new FaceNet model"""
        # Try to load from database first
        if self.model_download_service:
            try:
                logger.info("Loading FaceNet model from Supabase database...")
                model = self.model_download_service.load_facenet_model('facenet')
                if model:
                    self.current_model_info = self.model_download_service.get_active_model('facenet')
                    logger.info("FaceNet model loaded successfully from database")
                    return model
            except Exception as e:
                logger.warning(f"Failed to load model from database: {e}")
        
        # Fallback to local model
        if os.path.exists(self.model_path):
            logger.info(f"Loading existing FaceNet model from {self.model_path}")
            return self._load_tflite_model()
        else:
            logger.info("Creating new FaceNet model for Android")
            return self._create_mobile_facenet()
    
    def _create_mobile_facenet(self):
        """Create MobileFaceNet model optimized for Android"""
        logger.info("Creating MobileFaceNet model...")
        
        # Create MobileNetV2 backbone
        base_model = MobileNetV2(
            input_shape=(112, 112, 3),
            include_top=False,
            weights='imagenet',
            alpha=0.5  # Reduced width multiplier for mobile
        )
        
        # Add custom layers for face recognition
        x = base_model.output
        x = GlobalAveragePooling2D()(x)
        x = Dense(512, activation='relu', name='face_embedding')(x)
        x = Dense(128, activation='linear', name='face_vector')(x)
        
        # Create model
        model = Model(inputs=base_model.input, outputs=x)
        
        # Compile model
        model.compile(
            optimizer='adam',
            loss='mse',
            metrics=['accuracy']
        )
        
        # Save model
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        model.save(self.model_path.replace('.tflite', '.h5'))
        
        # Convert to TensorFlow Lite for Android
        self._convert_to_tflite(model)
        
        return model
    
    def _convert_to_tflite(self, model):
        """Convert model to TensorFlow Lite for Android deployment"""
        logger.info("Converting model to TensorFlow Lite...")
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.float16]  # Quantization for mobile
        
        tflite_model = converter.convert()
        
        # Save TFLite model
        with open(self.model_path, 'wb') as f:
            f.write(tflite_model)
        
        logger.info(f"TensorFlow Lite model saved to {self.model_path}")
    
    def _load_tflite_model(self):
        """Load TensorFlow Lite model"""
        try:
            # Load TFLite model
            interpreter = tf.lite.Interpreter(model_path=self.model_path)
            interpreter.allocate_tensors()
            return interpreter
        except Exception as e:
            logger.error(f"Error loading TFLite model: {e}")
            return None
    
    def _load_face_database(self):
        """Load face embeddings database from Supabase or local fallback"""
        # Try to load from Supabase first
        if self.supabase_face_service:
            try:
                face_embeddings_data = self.supabase_face_service.get_all_face_embeddings()
                
                if face_embeddings_data:
                    self.face_embeddings = {}
                    self.user_info = {}
                    
                    for face_data in face_embeddings_data:
                        user_id = face_data['user_id']
                        self.face_embeddings[user_id] = face_data['face_embedding']
                        self.user_info[user_id] = {
                            'name': face_data['user_name'],
                            'registered_at': face_data['registered_at'],
                            'confidence_threshold': face_data['confidence_threshold']
                        }
                    
                    logger.info(f"Loaded {len(self.face_embeddings)} face embeddings from Supabase")
                    return
                else:
                    logger.info("No face embeddings found in Supabase database")
            except Exception as e:
                logger.warning(f"Failed to load face database from Supabase: {e}")
        
        # Fallback to local database
        if os.path.exists(self.face_db_path):
            try:
                with open(self.face_db_path, 'rb') as f:
                    data = pickle.load(f)
                    self.face_embeddings = data.get('embeddings', {})
                    self.user_info = data.get('user_info', {})
                logger.info(f"Loaded {len(self.face_embeddings)} face embeddings from local database")
            except Exception as e:
                logger.error(f"Error loading local face database: {e}")
                self.face_embeddings = {}
                self.user_info = {}
        else:
            logger.info("No existing face database found, creating new one")
            self.face_embeddings = {}
            self.user_info = {}
    
    def _save_face_database(self):
        """Save face embeddings database"""
        os.makedirs(os.path.dirname(self.face_db_path), exist_ok=True)
        data = {
            'embeddings': self.face_embeddings,
            'user_info': self.user_info,
            'last_updated': datetime.now().isoformat()
        }
        with open(self.face_db_path, 'wb') as f:
            pickle.dump(data, f)
        logger.info("Face database saved")
    
    def detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect faces in image"""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )
            
            # Handle different return types from detectMultiScale
            if faces is None or len(faces) == 0:
                return []
            elif isinstance(faces, tuple):
                # If it's a tuple, convert to list
                return list(faces)
            elif hasattr(faces, 'tolist'):
                # If it's a numpy array, convert to list
                return faces.tolist()
            else:
                # Fallback: try to convert to list
                return list(faces)
                
        except Exception as e:
            logger.error(f"Error detecting faces: {e}")
            return []
    
    def preprocess_face(self, image: np.ndarray, face_box: Tuple[int, int, int, int]) -> np.ndarray:
        """Preprocess face for FaceNet input"""
        x, y, w, h = face_box
        
        # Extract face region
        face = image[y:y+h, x:x+w]
        
        # Resize to FaceNet input size
        face_resized = cv2.resize(face, self.input_size)
        
        # Normalize to [0, 1]
        face_normalized = face_resized.astype(np.float32) / 255.0
        
        # Add batch dimension
        face_batch = np.expand_dims(face_normalized, axis=0)
        
        return face_batch
    
    def extract_face_embedding(self, face_image: np.ndarray) -> np.ndarray:
        """Extract face embedding using FaceNet"""
        try:
            if isinstance(self.model, tf.lite.Interpreter):
                # Use TFLite model
                input_details = self.model.get_input_details()
                output_details = self.model.get_output_details()
                
                self.model.set_tensor(input_details[0]['index'], face_image)
                self.model.invoke()
                
                embedding = self.model.get_tensor(output_details[0]['index'])
            else:
                # Use Keras model
                embedding = self.model.predict(face_image)
            
            # Normalize embedding
            embedding = embedding / np.linalg.norm(embedding)
            return embedding.flatten()
            
        except Exception as e:
            logger.error(f"Error extracting face embedding: {e}")
            return None
    
    def calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calculate cosine similarity between two face embeddings"""
        try:
            # Cosine similarity
            similarity = np.dot(embedding1, embedding2) / (
                np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
            )
            return float(similarity)
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return 0.0
    
    def register_face(self, user_id: str, user_name: str, image: np.ndarray) -> bool:
        """Register a new face in the database"""
        try:
            # Detect faces
            faces = self.detect_faces(image)
            if len(faces) == 0:
                logger.warning("No faces detected in registration image")
                return False
            
            if len(faces) > 1:
                logger.warning("Multiple faces detected, using the largest one")
                # Use the largest face
                largest_face = max(faces, key=lambda x: x[2] * x[3])
            else:
                largest_face = faces[0]
            
            # Preprocess face
            face_preprocessed = self.preprocess_face(image, largest_face)
            
            # Extract embedding
            embedding = self.extract_face_embedding(face_preprocessed)
            if embedding is None:
                logger.error("Failed to extract face embedding")
                return False
            
            # Store in local memory
            self.face_embeddings[user_id] = embedding
            self.user_info[user_id] = {
                'name': user_name,
                'registered_at': datetime.now().isoformat(),
                'face_box': largest_face
            }
            
            # Save to Supabase database
            if self.supabase_face_service:
                try:
                    metadata = {
                        'face_box': largest_face,
                        'image_shape': image.shape,
                        'preprocessing_applied': True
                    }
                    
                    success = self.supabase_face_service.register_face_embedding(
                        user_id=user_id,
                        user_name=user_name,
                        face_embedding=embedding,
                        face_image=face_preprocessed,
                        confidence_threshold=self.threshold,
                        metadata=metadata
                    )
                    
                    if success:
                        logger.info(f"Successfully registered face for user {user_id} in Supabase")
                    else:
                        logger.warning(f"Failed to save face to Supabase, saving locally only")
                        self._save_face_database()
                except Exception as e:
                    logger.error(f"Error saving to Supabase: {e}")
                    # Fallback to local save
                    self._save_face_database()
            else:
                # Save to local database if Supabase not available
                self._save_face_database()
            
            logger.info(f"Successfully registered face for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error registering face: {e}")
            return False
    
    def is_face_registered(self, user_id: str) -> bool:
        """Check if a user has a registered face"""
        # Check local database first (for existing data)
        if user_id in self.face_embeddings:
            return True
        
        # Then check Supabase database
        if self.supabase_face_service:
            try:
                return self.supabase_face_service.check_user_face_registered(user_id)
            except Exception as e:
                logger.error(f"Error checking face registration status in Supabase: {e}")
                return False
        else:
            return False
    
    def get_face_count(self) -> int:
        """Get total number of registered faces"""
        # Count local faces first
        local_count = len(self.face_embeddings)
        
        # Then check Supabase count
        if self.supabase_face_service:
            try:
                supabase_count = self.supabase_face_service.get_user_face_count()
                # Return the higher count (in case of sync issues)
                return max(local_count, supabase_count)
            except Exception as e:
                logger.error(f"Error getting face count from Supabase: {e}")
                return local_count
        else:
            return local_count
    
    def recognize_face(self, image: np.ndarray) -> Optional[Dict]:
        """Recognize face and return user information"""
        try:
            # Detect faces
            faces = self.detect_faces(image)
            if len(faces) == 0:
                logger.warning("No faces detected in image")
                return None
            
            if len(faces) > 1:
                logger.warning("Multiple faces detected, using the largest one")
                largest_face = max(faces, key=lambda x: x[2] * x[3])
            else:
                largest_face = faces[0]
            
            # Preprocess face
            face_preprocessed = self.preprocess_face(image, largest_face)
            
            # Extract embedding
            query_embedding = self.extract_face_embedding(face_preprocessed)
            if query_embedding is None:
                logger.error("Failed to extract face embedding")
                return None
            
            # Find best match
            best_match = None
            best_similarity = 0.0
            
            for user_id, stored_embedding in self.face_embeddings.items():
                similarity = self.calculate_similarity(query_embedding, stored_embedding)
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match = user_id
            
            # Check if similarity is above threshold
            if best_similarity >= self.threshold:
                return {
                    'user_id': best_match,
                    'user_name': self.user_info[best_match]['name'],
                    'similarity': best_similarity,
                    'confidence': min(best_similarity * 100, 100.0),
                    'face_box': largest_face
                }
            else:
                logger.info(f"Best match similarity {best_similarity} below threshold {self.threshold}")
                return None
                
        except Exception as e:
            logger.error(f"Error recognizing face: {e}")
            return None
    
    def verify_payment_face(self, image: np.ndarray, expected_user_id: str) -> Dict:
        """Verify face for payment authentication"""
        try:
            recognition_result = self.recognize_face(image)
            
            if recognition_result is None:
                return {
                    'verified': False,
                    'reason': 'No face detected or recognized',
                    'confidence': 0.0
                }
            
            if recognition_result['user_id'] != expected_user_id:
                return {
                    'verified': False,
                    'reason': 'Face does not match expected user',
                    'confidence': recognition_result['confidence']
                }
            
            return {
                'verified': True,
                'user_id': recognition_result['user_id'],
                'user_name': recognition_result['user_name'],
                'confidence': recognition_result['confidence'],
                'face_box': recognition_result['face_box']
            }
            
        except Exception as e:
            logger.error(f"Error verifying payment face: {e}")
            return {
                'verified': False,
                'reason': f'Verification error: {str(e)}',
                'confidence': 0.0
            }
    
    def get_database_stats(self) -> Dict:
        """Get face database statistics"""
        return {
            'total_users': len(self.face_embeddings),
            'user_list': list(self.user_info.keys()),
            'last_updated': max([info['registered_at'] for info in self.user_info.values()]) if self.user_info else None,
            'threshold': self.threshold
        }

# Example usage and testing
if __name__ == "__main__":
    # Initialize service
    face_service = FaceNetService()
    
    # Example: Register a new user
    # face_service.register_face("mechanic_001", "John Doe", image)
    
    # Example: Recognize face
    # result = face_service.recognize_face(image)
    
    # Example: Verify payment
    # verification = face_service.verify_payment_face(image, "mechanic_001")
    
    print("FaceNet service initialized successfully!")
    print(f"Database stats: {face_service.get_database_stats()}")
