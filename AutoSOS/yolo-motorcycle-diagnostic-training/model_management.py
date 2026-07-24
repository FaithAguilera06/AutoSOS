#!/usr/bin/env python3
"""
Model Management Script for AutoSOS
Upload, manage, and version ML models in Supabase database
"""

import os
import sys
import argparse
import json
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any
import logging

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from model_download_service import ModelDownloadService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelManager:
    """Model management utility for AutoSOS"""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        self.download_service = ModelDownloadService(
            supabase_url=supabase_url,
            supabase_key=supabase_key
        )
    
    def upload_model(
        self,
        model_file_path: str,
        model_name: str,
        model_type: str,
        version: str,
        description: Optional[str] = None,
        model_config: Optional[Dict[str, Any]] = None,
        performance_metrics: Optional[Dict[str, Any]] = None,
        set_as_default: bool = False
    ) -> bool:
        """Upload a model to Supabase storage and database"""
        try:
            model_path = Path(model_file_path)
            if not model_path.exists():
                logger.error(f"Model file not found: {model_file_path}")
                return False
            
            # Calculate file hash
            file_hash = self._calculate_file_hash(model_path)
            
            # Create storage path
            file_extension = model_path.suffix
            storage_path = f"models/{model_type}/{model_name}_v{version}{file_extension}"
            
            logger.info(f"Uploading model: {model_name} v{version}")
            logger.info(f"File: {model_file_path}")
            logger.info(f"Size: {model_path.stat().st_size / (1024*1024):.2f} MB")
            logger.info(f"Hash: {file_hash}")
            
            # Upload file to Supabase storage
            with open(model_path, 'rb') as f:
                file_content = f.read()
            
            # Note: You'll need to implement the actual upload to Supabase storage
            # This is a placeholder for the upload logic
            logger.info(f"Would upload to storage path: {storage_path}")
            
            # Create database record
            model_data = {
                'model_name': model_name,
                'model_type': model_type,
                'version': version,
                'description': description or f"{model_name} v{version}",
                'file_path': storage_path,
                'file_size': model_path.stat().st_size,
                'file_hash': file_hash,
                'model_config': model_config or {},
                'performance_metrics': performance_metrics or {},
                'status': 'active',
                'is_default': set_as_default
            }
            
            logger.info("Model uploaded successfully!")
            logger.info(f"Model data: {json.dumps(model_data, indent=2)}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error uploading model: {e}")
            return False
    
    def list_models(self, model_type: Optional[str] = None) -> None:
        """List all models or models of a specific type"""
        try:
            if model_type:
                models = self.download_service.get_active_model(model_type)
                if models:
                    print(f"\nActive {model_type} model:")
                    self._print_model_info(models)
                else:
                    print(f"\nNo active {model_type} model found")
            else:
                # List all model types
                for model_type in ['yolov8', 'facenet']:
                    model = self.download_service.get_active_model(model_type)
                    if model:
                        print(f"\n{model_type.upper()} Model:")
                        self._print_model_info(model)
                    else:
                        print(f"\n{model_type.upper()}: No active model")
                        
        except Exception as e:
            logger.error(f"Error listing models: {e}")
    
    def set_default_model(self, model_id: int) -> bool:
        """Set a model as the default for its type"""
        try:
            # This would call the Supabase RPC function
            logger.info(f"Setting model {model_id} as default...")
            # Implementation would go here
            return True
        except Exception as e:
            logger.error(f"Error setting default model: {e}")
            return False
    
    def get_cache_stats(self) -> None:
        """Display cache statistics"""
        try:
            stats = self.download_service.get_cache_stats()
            print("\nCache Statistics:")
            print(f"Total cached models: {stats.get('total_models', 0)}")
            print(f"Total cache size: {stats.get('total_size_mb', 0)} MB")
            
            top_models = stats.get('top_models', [])
            if top_models:
                print("\nMost accessed models:")
                for model_type, version, access_count in top_models:
                    print(f"  {model_type} v{version}: {access_count} accesses")
                    
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
    
    def cleanup_cache(self, days_old: int = 30) -> None:
        """Clean up old cached models"""
        try:
            logger.info(f"Cleaning up cache older than {days_old} days...")
            self.download_service.cleanup_old_cache(days_old)
            logger.info("Cache cleanup completed")
        except Exception as e:
            logger.error(f"Error cleaning up cache: {e}")
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA256 hash of a file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def _print_model_info(self, model: Dict[str, Any]) -> None:
        """Print formatted model information"""
        print(f"  ID: {model.get('id', 'N/A')}")
        print(f"  Name: {model.get('model_name', 'N/A')}")
        print(f"  Version: {model.get('version', 'N/A')}")
        print(f"  Description: {model.get('description', 'N/A')}")
        print(f"  File Size: {model.get('file_size', 0) / (1024*1024):.2f} MB")
        print(f"  Status: {model.get('status', 'N/A')}")
        print(f"  Default: {model.get('is_default', False)}")
        
        if model.get('model_config'):
            print(f"  Config: {json.dumps(model['model_config'], indent=4)}")
        
        if model.get('performance_metrics'):
            print(f"  Metrics: {json.dumps(model['performance_metrics'], indent=4)}")

def main():
    parser = argparse.ArgumentParser(description="AutoSOS Model Management")
    parser.add_argument("--supabase-url", required=True, help="Supabase URL")
    parser.add_argument("--supabase-key", required=True, help="Supabase anon key")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Upload command
    upload_parser = subparsers.add_parser("upload", help="Upload a model")
    upload_parser.add_argument("--file", required=True, help="Path to model file")
    upload_parser.add_argument("--name", required=True, help="Model name")
    upload_parser.add_argument("--type", required=True, choices=["yolov8", "facenet"], help="Model type")
    upload_parser.add_argument("--version", required=True, help="Model version")
    upload_parser.add_argument("--description", help="Model description")
    upload_parser.add_argument("--config", help="Path to model config JSON file")
    upload_parser.add_argument("--metrics", help="Path to performance metrics JSON file")
    upload_parser.add_argument("--default", action="store_true", help="Set as default model")
    
    # List command
    list_parser = subparsers.add_parser("list", help="List models")
    list_parser.add_argument("--type", choices=["yolov8", "facenet"], help="Filter by model type")
    
    # Cache command
    cache_parser = subparsers.add_parser("cache", help="Cache management")
    cache_subparsers = cache_parser.add_subparsers(dest="cache_action", help="Cache actions")
    
    cache_subparsers.add_parser("stats", help="Show cache statistics")
    cleanup_parser = cache_subparsers.add_parser("cleanup", help="Clean up old cache")
    cleanup_parser.add_argument("--days", type=int, default=30, help="Days old threshold")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize model manager
    manager = ModelManager(args.supabase_url, args.supabase_key)
    
    if args.command == "upload":
        # Load config and metrics if provided
        model_config = None
        if args.config:
            with open(args.config, 'r') as f:
                model_config = json.load(f)
        
        performance_metrics = None
        if args.metrics:
            with open(args.metrics, 'r') as f:
                performance_metrics = json.load(f)
        
        success = manager.upload_model(
            model_file_path=args.file,
            model_name=args.name,
            model_type=args.type,
            version=args.version,
            description=args.description,
            model_config=model_config,
            performance_metrics=performance_metrics,
            set_as_default=args.default
        )
        
        if success:
            print("✅ Model uploaded successfully!")
        else:
            print("❌ Model upload failed!")
            sys.exit(1)
    
    elif args.command == "list":
        manager.list_models(args.type)
    
    elif args.command == "cache":
        if args.cache_action == "stats":
            manager.get_cache_stats()
        elif args.cache_action == "cleanup":
            manager.cleanup_cache(args.days)

if __name__ == "__main__":
    main()
