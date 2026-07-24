#!/usr/bin/env python3
"""
Setup script for Face Recognition Database in Supabase
This script creates the necessary tables and functions for storing face embeddings
"""

import os
import sys
from supabase import create_client, Client
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_face_database():
    """Setup face recognition database in Supabase"""
    
    # Get Supabase credentials from environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        logger.error("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required")
        return False
    
    try:
        # Create Supabase client
        supabase: Client = create_client(supabase_url, supabase_key)
        logger.info("Connected to Supabase successfully")
        
        # Read the SQL schema file
        schema_file = "face-database-schema.sql"
        if not os.path.exists(schema_file):
            logger.error(f"Schema file {schema_file} not found")
            return False
        
        with open(schema_file, 'r') as f:
            schema_sql = f.read()
        
        # Split the SQL into individual statements
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
        
        logger.info(f"Executing {len(statements)} SQL statements...")
        
        # Execute each statement
        for i, statement in enumerate(statements):
            if statement:
                try:
                    logger.info(f"Executing statement {i+1}/{len(statements)}")
                    result = supabase.rpc('exec_sql', {'sql': statement}).execute()
                    logger.info(f"Statement {i+1} executed successfully")
                except Exception as e:
                    logger.warning(f"Statement {i+1} failed (might already exist): {e}")
                    continue
        
        logger.info("Face database setup completed successfully!")
        
        # Test the setup by checking if tables exist
        try:
            # Test face_embeddings table
            result = supabase.table('face_embeddings').select('id').limit(1).execute()
            logger.info("✅ face_embeddings table is accessible")
            
            # Test face_recognition_logs table
            result = supabase.table('face_recognition_logs').select('id').limit(1).execute()
            logger.info("✅ face_recognition_logs table is accessible")
            
            # Test face_registration_logs table
            result = supabase.table('face_registration_logs').select('id').limit(1).execute()
            logger.info("✅ face_registration_logs table is accessible")
            
            # Test functions
            result = supabase.rpc('get_face_embedding', {'p_user_id': 'test'}).execute()
            logger.info("✅ get_face_embedding function is accessible")
            
            result = supabase.rpc('get_all_face_embeddings').execute()
            logger.info("✅ get_all_face_embeddings function is accessible")
            
            logger.info("🎉 All database components are working correctly!")
            
        except Exception as e:
            logger.error(f"Error testing database setup: {e}")
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"Error setting up face database: {e}")
        return False

def check_face_database_status():
    """Check the current status of the face database"""
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        logger.error("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required")
        return False
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Check tables
        tables = ['face_embeddings', 'face_recognition_logs', 'face_registration_logs']
        for table in tables:
            try:
                result = supabase.table(table).select('id').limit(1).execute()
                logger.info(f"✅ {table} table exists and is accessible")
            except Exception as e:
                logger.error(f"❌ {table} table error: {e}")
        
        # Check functions
        functions = ['get_face_embedding', 'get_all_face_embeddings', 'register_face_embedding']
        for func in functions:
            try:
                if func == 'get_face_embedding':
                    result = supabase.rpc(func, {'p_user_id': 'test'}).execute()
                else:
                    result = supabase.rpc(func).execute()
                logger.info(f"✅ {func} function is accessible")
            except Exception as e:
                logger.error(f"❌ {func} function error: {e}")
        
        # Get current face count
        try:
            result = supabase.table('face_embeddings').select('id', count='exact').eq('is_active', True).execute()
            face_count = result.count or 0
            logger.info(f"📊 Current registered faces: {face_count}")
        except Exception as e:
            logger.error(f"❌ Error getting face count: {e}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error checking database status: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        logger.info("Checking face database status...")
        check_face_database_status()
    else:
        logger.info("Setting up face database...")
        success = setup_face_database()
        if success:
            logger.info("✅ Face database setup completed successfully!")
            logger.info("You can now register faces and they will be stored in Supabase!")
        else:
            logger.error("❌ Face database setup failed!")
            sys.exit(1)
