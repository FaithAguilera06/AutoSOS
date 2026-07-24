#!/usr/bin/env python3
"""
Model Download Service for AutoSOS
Downloads and caches ML models from Supabase database
"""

import os
import hashlib
import json
import requests
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
import logging
from datetime import datetime, timedelta
import sqlite3
import pickle

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelDownloadService:
    """
    Service to download and cache ML models from Supabase database
    """
    
    def __init__(self, supabase_url: str, supabase_key: str, cache_dir: str = "model_cache"):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        
        # Initialize cache database
        self.cache_db_path = self.cache_dir / "cache.db"
        self._init_cache_db()
        
        # Cache for loaded models
        self.loaded_models = {}
        
    def _init_cache_db(self):
        """Initialize SQLite cache database"""
        conn = sqlite3.connect(self.cache_db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS model_cache (
                model_id INTEGER PRIMARY KEY,
                model_type TEXT NOT NULL,
                version TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_hash TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                model_config TEXT,
                cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                access_count INTEGER DEFAULT 0
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS model_metadata (
                model_id INTEGER PRIMARY KEY,
                model_name TEXT NOT NULL,
                model_type TEXT NOT NULL,
                version TEXT NOT NULL,
                description TEXT,
                performance_metrics TEXT,
                status TEXT NOT NULL,
                is_default BOOLEAN NOT NULL,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _get_supabase_headers(self) -> Dict[str, str]:
        """Get headers for Supabase API requests"""
        return {
            'apikey': self.supabase_key,
            'Authorization': f'Bearer {self.supabase_key}',
            'Content-Type': 'application/json'
        }
    
    def get_active_model(self, model_type: str) -> Optional[Dict[str, Any]]:
        """Get active model from Supabase database"""
        try:
            url = f"{self.supabase_url}/rest/v1/rpc/get_active_model"
            headers = self._get_supabase_headers()
            data = {"p_model_type": model_type}
            
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()
            if result and len(result) > 0:
                return result[0]
            return None
            
        except Exception as e:
            logger.error(f"Error fetching active model: {e}")
            return None
    
    def get_latest_model(self, model_type: str) -> Optional[Dict[str, Any]]:
        """Get latest model from Supabase database"""
        try:
            url = f"{self.supabase_url}/rest/v1/rpc/get_latest_model"
            headers = self._get_supabase_headers()
            data = {"p_model_type": model_type}
            
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()
            if result and len(result) > 0:
                return result[0]
            return None
            
        except Exception as e:
            logger.error(f"Error fetching latest model: {e}")
            return None
    
    def download_model_file(self, model: Dict[str, Any]) -> Optional[str]:
        """Download model file from Supabase storage"""
        try:
            file_path = model['file_path']
            model_id = model['id']
            model_type = model['model_type']
            version = model['version']
            file_hash = model.get('file_hash', '')
            
            # Check if model is already cached
            cached_path = self._get_cached_model_path(model_id, model_type, version)
            if cached_path and self._verify_cached_model(cached_path, file_hash):
                logger.info(f"Using cached model: {cached_path}")
                self._update_cache_access(model_id)
                return cached_path
            
            # Download from Supabase storage
            logger.info(f"Downloading model: {file_path}")
            
            # Create signed URL for download
            download_url = self._create_signed_url(file_path)
            if not download_url:
                logger.error("Failed to create signed URL")
                return None
            
            # Download file
            response = requests.get(download_url, stream=True)
            response.raise_for_status()
            
            # Save to cache
            cached_path = self._save_model_to_cache(
                model_id, model_type, version, response.content, file_hash
            )
            
            if cached_path:
                logger.info(f"Model cached successfully: {cached_path}")
                return cached_path
            else:
                logger.error("Failed to cache model")
                return None
                
        except Exception as e:
            logger.error(f"Error downloading model: {e}")
            return None
    
    def _create_signed_url(self, file_path: str, expiry_seconds: int = 3600) -> Optional[str]:
        """Create signed URL for file download"""
        try:
            url = f"{self.supabase_url}/storage/v1/object/sign/autosos/{file_path}"
            headers = self._get_supabase_headers()
            data = {"expiresIn": expiry_seconds}
            
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()
            return result.get('signedURL')
            
        except Exception as e:
            logger.error(f"Error creating signed URL: {e}")
            return None
    
    def _get_cached_model_path(self, model_id: int, model_type: str, version: str) -> Optional[str]:
        """Get path to cached model if it exists"""
        conn = sqlite3.connect(self.cache_db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT file_path FROM model_cache 
            WHERE model_id = ? AND model_type = ? AND version = ?
        ''', (model_id, model_type, version))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            cached_path = Path(result[0])
            if cached_path.exists():
                return str(cached_path)
        
        return None
    
    def _verify_cached_model(self, file_path: str, expected_hash: str) -> bool:
        """Verify cached model integrity"""
        if not expected_hash:
            return True  # No hash to verify
        
        try:
            with open(file_path, 'rb') as f:
                file_hash = hashlib.sha256(f.read()).hexdigest()
            return file_hash == expected_hash
        except Exception as e:
            logger.error(f"Error verifying cached model: {e}")
            return False
    
    def _save_model_to_cache(
        self, 
        model_id: int, 
        model_type: str, 
        version: str, 
        file_content: bytes, 
        file_hash: str
    ) -> Optional[str]:
        """Save model to cache"""
        try:
            # Create cache directory for this model
            model_cache_dir = self.cache_dir / model_type / version
            model_cache_dir.mkdir(parents=True, exist_ok=True)
            
            # Determine file extension based on model type
            if model_type == 'yolov8':
                file_extension = '.pt'
            elif model_type == 'facenet':
                file_extension = '.tflite'
            else:
                file_extension = '.bin'
            
            cached_file_path = model_cache_dir / f"model{file_extension}"
            
            # Save file
            with open(cached_file_path, 'wb') as f:
                f.write(file_content)
            
            # Update cache database
            conn = sqlite3.connect(self.cache_db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO model_cache 
                (model_id, model_type, version, file_path, file_hash, file_size, cached_at, last_accessed, access_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                model_id, model_type, version, str(cached_file_path), 
                file_hash, len(file_content), datetime.now(), datetime.now(), 1
            ))
            
            conn.commit()
            conn.close()
            
            return str(cached_file_path)
            
        except Exception as e:
            logger.error(f"Error saving model to cache: {e}")
            return None
    
    def _update_cache_access(self, model_id: int):
        """Update cache access statistics"""
        try:
            conn = sqlite3.connect(self.cache_db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE model_cache 
                SET last_accessed = ?, access_count = access_count + 1
                WHERE model_id = ?
            ''', (datetime.now(), model_id))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error updating cache access: {e}")
    
    def load_yolo_model(self, model_type: str = 'yolov8') -> Optional[Any]:
        """Load YOLOv8 model for inference"""
        try:
            # Check if model is already loaded
            cache_key = f"yolo_{model_type}"
            if cache_key in self.loaded_models:
                return self.loaded_models[cache_key]
            
            # Get active model
            model_info = self.get_active_model(model_type)
            if not model_info:
                logger.error(f"No active {model_type} model found")
                return None
            
            # Download model if not cached
            model_path = self.download_model_file(model_info)
            if not model_path:
                logger.error("Failed to download model")
                return None
            
            # Load YOLOv8 model
            from ultralytics import YOLO
            model = YOLO(model_path)
            
            # Cache loaded model
            self.loaded_models[cache_key] = model
            
            logger.info(f"YOLOv8 model loaded successfully: {model_path}")
            return model
            
        except Exception as e:
            logger.error(f"Error loading YOLOv8 model: {e}")
            return None
    
    def load_facenet_model(self, model_type: str = 'facenet') -> Optional[Any]:
        """Load FaceNet model for inference"""
        try:
            # Check if model is already loaded
            cache_key = f"facenet_{model_type}"
            if cache_key in self.loaded_models:
                return self.loaded_models[cache_key]
            
            # Get active model
            model_info = self.get_active_model(model_type)
            if not model_info:
                logger.error(f"No active {model_type} model found")
                return None
            
            # Download model if not cached
            model_path = self.download_model_file(model_info)
            if not model_path:
                logger.error("Failed to download model")
                return None
            
            # Load TensorFlow Lite model
            import tensorflow as tf
            interpreter = tf.lite.Interpreter(model_path=model_path)
            interpreter.allocate_tensors()
            
            # Cache loaded model
            self.loaded_models[cache_key] = interpreter
            
            logger.info(f"FaceNet model loaded successfully: {model_path}")
            return interpreter
            
        except Exception as e:
            logger.error(f"Error loading FaceNet model: {e}")
            return None
    
    def log_model_usage(
        self, 
        model_id: int, 
        inference_time_ms: Optional[int] = None,
        input_size: Optional[str] = None,
        confidence_score: Optional[float] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        """Log model usage to Supabase"""
        try:
            url = f"{self.supabase_url}/rest/v1/rpc/log_model_usage"
            headers = self._get_supabase_headers()
            data = {
                "p_model_id": model_id,
                "p_inference_time_ms": inference_time_ms,
                "p_input_size": input_size,
                "p_confidence_score": confidence_score,
                "p_success": success,
                "p_error_message": error_message
            }
            
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            logger.info("Model usage logged successfully")
            
        except Exception as e:
            logger.error(f"Error logging model usage: {e}")
    
    def cleanup_old_cache(self, days_old: int = 30):
        """Clean up old cached models"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days_old)
            
            conn = sqlite3.connect(self.cache_db_path)
            cursor = conn.cursor()
            
            # Get old cache entries
            cursor.execute('''
                SELECT file_path FROM model_cache 
                WHERE last_accessed < ?
            ''', (cutoff_date,))
            
            old_files = cursor.fetchall()
            
            # Delete old files
            for (file_path,) in old_files:
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        logger.info(f"Deleted old cached model: {file_path}")
                except Exception as e:
                    logger.error(f"Error deleting file {file_path}: {e}")
            
            # Delete old cache entries
            cursor.execute('''
                DELETE FROM model_cache 
                WHERE last_accessed < ?
            ''', (cutoff_date,))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Cleaned up {len(old_files)} old cached models")
            
        except Exception as e:
            logger.error(f"Error cleaning up cache: {e}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            conn = sqlite3.connect(self.cache_db_path)
            cursor = conn.cursor()
            
            # Get total cached models
            cursor.execute('SELECT COUNT(*) FROM model_cache')
            total_models = cursor.fetchone()[0]
            
            # Get total cache size
            cursor.execute('SELECT SUM(file_size) FROM model_cache')
            total_size = cursor.fetchone()[0] or 0
            
            # Get most accessed models
            cursor.execute('''
                SELECT model_type, version, access_count 
                FROM model_cache 
                ORDER BY access_count DESC 
                LIMIT 5
            ''')
            top_models = cursor.fetchall()
            
            conn.close()
            
            return {
                'total_models': total_models,
                'total_size_mb': round(total_size / (1024 * 1024), 2),
                'top_models': top_models
            }
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {}

# Example usage
if __name__ == "__main__":
    # Initialize service
    service = ModelDownloadService(
        supabase_url="your_supabase_url",
        supabase_key="your_supabase_key"
    )
    
    # Load YOLOv8 model
    yolo_model = service.load_yolo_model()
    if yolo_model:
        print("YOLOv8 model loaded successfully!")
    
    # Load FaceNet model
    facenet_model = service.load_facenet_model()
    if facenet_model:
        print("FaceNet model loaded successfully!")
    
    # Get cache stats
    stats = service.get_cache_stats()
    print(f"Cache stats: {stats}")
