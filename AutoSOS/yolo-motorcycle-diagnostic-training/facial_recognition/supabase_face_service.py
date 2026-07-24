#!/usr/bin/env python3
"""
Supabase Face Database Service
Handles face embedding storage and retrieval from Supabase database
"""

import os
import json
import logging
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
from datetime import datetime
import base64
import io
from supabase import create_client, Client
import pickle

logger = logging.getLogger(__name__)

class SupabaseFaceService:
    """Service for managing face embeddings in Supabase database"""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        """
        Initialize Supabase client
        
        Args:
            supabase_url: Supabase project URL
            supabase_key: Supabase anon key
        """
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
    def register_face_embedding(
        self, 
        user_id: str, 
        user_name: str, 
        face_embedding: np.ndarray,
        face_image: Optional[np.ndarray] = None,
        confidence_threshold: float = 0.6,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Register a face embedding in Supabase database
        
        Args:
            user_id: Unique user identifier
            user_name: User's display name
            face_embedding: Face embedding numpy array
            face_image: Original face image (optional)
            confidence_threshold: Confidence threshold for recognition
            metadata: Additional metadata
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Convert numpy array to bytes
            embedding_bytes = pickle.dumps(face_embedding)
            
            # Convert face image to bytes if provided
            face_image_bytes = None
            if face_image is not None:
                face_image_bytes = pickle.dumps(face_image)
            
            # Prepare metadata
            if metadata is None:
                metadata = {}
            
            # Call Supabase function
            result = self.supabase.rpc('register_face_embedding', {
                'p_user_id': user_id,
                'p_user_name': user_name,
                'p_face_embedding': embedding_bytes,
                'p_embedding_dimension': len(face_embedding),
                'p_confidence_threshold': confidence_threshold,
                'p_face_image': face_image_bytes,
                'p_metadata': metadata
            }).execute()
            
            if result.data:
                logger.info(f"Successfully registered face embedding for user {user_id}")
                return True
            else:
                logger.error(f"Failed to register face embedding for user {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error registering face embedding: {e}")
            return False
    
    def get_face_embedding(self, user_id: str) -> Optional[Dict]:
        """
        Get face embedding for a specific user
        
        Args:
            user_id: User identifier
            
        Returns:
            Dict with face embedding data or None if not found
        """
        try:
            result = self.supabase.rpc('get_face_embedding', {
                'p_user_id': user_id
            }).execute()
            
            if result.data and len(result.data) > 0:
                face_data = result.data[0]
                
                # Convert bytes back to numpy array
                face_embedding = pickle.loads(face_data['face_embedding'])
                
                return {
                    'user_id': face_data['user_id'],
                    'user_name': face_data['user_name'],
                    'face_embedding': face_embedding,
                    'embedding_dimension': face_data['embedding_dimension'],
                    'confidence_threshold': face_data['confidence_threshold'],
                    'registered_at': face_data['registered_at'],
                    'is_active': face_data['is_active']
                }
            else:
                logger.info(f"No face embedding found for user {user_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting face embedding: {e}")
            return None
    
    def get_all_face_embeddings(self) -> List[Dict]:
        """
        Get all active face embeddings
        
        Returns:
            List of face embedding data
        """
        try:
            result = self.supabase.rpc('get_all_face_embeddings').execute()
            
            face_embeddings = []
            if result.data:
                for face_data in result.data:
                    # Convert bytes back to numpy array
                    face_embedding = pickle.loads(face_data['face_embedding'])
                    
                    face_embeddings.append({
                        'user_id': face_data['user_id'],
                        'user_name': face_data['user_name'],
                        'face_embedding': face_embedding,
                        'embedding_dimension': face_data['embedding_dimension'],
                        'confidence_threshold': face_data['confidence_threshold'],
                        'registered_at': face_data['registered_at']
                    })
            
            logger.info(f"Retrieved {len(face_embeddings)} face embeddings from database")
            return face_embeddings
            
        except Exception as e:
            logger.error(f"Error getting all face embeddings: {e}")
            return []
    
    def deactivate_face_embedding(self, user_id: str) -> bool:
        """
        Deactivate a face embedding (soft delete)
        
        Args:
            user_id: User identifier
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            result = self.supabase.rpc('deactivate_face_embedding', {
                'p_user_id': user_id
            }).execute()
            
            if result.data:
                logger.info(f"Successfully deactivated face embedding for user {user_id}")
                return True
            else:
                logger.error(f"Failed to deactivate face embedding for user {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error deactivating face embedding: {e}")
            return False
    
    def log_face_recognition(
        self,
        user_id: str,
        was_successful: bool,
        confidence_score: Optional[float] = None,
        similarity_score: Optional[float] = None,
        face_detected: bool = False,
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Log a face recognition attempt
        
        Args:
            user_id: User identifier
            was_successful: Whether recognition was successful
            confidence_score: Confidence score
            similarity_score: Similarity score
            face_detected: Whether a face was detected
            error_message: Error message if failed
            ip_address: Client IP address
            user_agent: Client user agent
            metadata: Additional metadata
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if metadata is None:
                metadata = {}
            
            result = self.supabase.rpc('log_face_recognition', {
                'p_user_id': user_id,
                'p_was_successful': was_successful,
                'p_confidence_score': confidence_score,
                'p_similarity_score': similarity_score,
                'p_face_detected': face_detected,
                'p_error_message': error_message,
                'p_ip_address': ip_address,
                'p_user_agent': user_agent,
                'p_metadata': metadata
            }).execute()
            
            return result.data is not None
            
        except Exception as e:
            logger.error(f"Error logging face recognition: {e}")
            return False
    
    def log_face_registration(
        self,
        user_id: str,
        was_successful: bool,
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Log a face registration attempt
        
        Args:
            user_id: User identifier
            was_successful: Whether registration was successful
            error_message: Error message if failed
            ip_address: Client IP address
            user_agent: Client user agent
            metadata: Additional metadata
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if metadata is None:
                metadata = {}
            
            result = self.supabase.rpc('log_face_registration', {
                'p_user_id': user_id,
                'p_was_successful': was_successful,
                'p_error_message': error_message,
                'p_ip_address': ip_address,
                'p_user_agent': user_agent,
                'p_metadata': metadata
            }).execute()
            
            return result.data is not None
            
        except Exception as e:
            logger.error(f"Error logging face registration: {e}")
            return False
    
    def get_face_recognition_stats(self) -> List[Dict]:
        """
        Get face recognition statistics
        
        Returns:
            List of recognition statistics
        """
        try:
            result = self.supabase.table('face_recognition_stats').select('*').execute()
            
            if result.data:
                return result.data
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error getting face recognition stats: {e}")
            return []
    
    def check_user_face_registered(self, user_id: str) -> bool:
        """
        Check if a user has a registered face
        
        Args:
            user_id: User identifier
            
        Returns:
            bool: True if user has registered face, False otherwise
        """
        try:
            result = self.supabase.table('face_embeddings').select('user_id').eq('user_id', user_id).eq('is_active', True).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Error checking face registration status: {e}")
            return False
    
    def get_user_face_count(self) -> int:
        """
        Get total number of registered faces
        
        Returns:
            int: Number of registered faces
        """
        try:
            result = self.supabase.table('face_embeddings').select('id', count='exact').eq('is_active', True).execute()
            
            return result.count or 0
            
        except Exception as e:
            logger.error(f"Error getting face count: {e}")
            return 0
