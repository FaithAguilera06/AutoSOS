#!/usr/bin/env python3
"""
Script to update frontend configuration with Cloudflare tunnel URL
"""

import os
import re
import json
from typing import Optional

def find_typescript_files(directory: str) -> list:
    """Find all TypeScript files in the directory"""
    ts_files = []
    for root, dirs, files in os.walk(directory):
        # Skip node_modules and other common directories
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'dist', 'build']]
        
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                ts_files.append(os.path.join(root, file))
    return ts_files

def update_yolo_service_url(file_path: str, new_url: str) -> bool:
    """Update YOLO service URL in a TypeScript file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Look for YOLO service URL patterns
        patterns = [
            r'YOLO_SERVICE_URL\s*=\s*["\'][^"\']*["\']',
            r'yoloServiceUrl\s*=\s*["\'][^"\']*["\']',
            r'YOLO_URL\s*=\s*["\'][^"\']*["\']',
            r'https://autosos-yolo\.onrender\.com',
            r'http://localhost:8002'
        ]
        
        updated = False
        for pattern in patterns:
            if re.search(pattern, content):
                # Replace with new URL
                new_content = re.sub(pattern, f'YOLO_SERVICE_URL = "{new_url}"', content)
                if new_content != content:
                    content = new_content
                    updated = True
                    break
        
        if updated:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
            
    except Exception as e:
        print(f"Error updating {file_path}: {e}")
    
    return False

def update_environment_files(directory: str, new_url: str) -> bool:
    """Update environment files with new URL"""
    env_files = [
        'src/environments/environment.ts',
        'src/environments/environment.prod.ts',
        '.env',
        '.env.local',
        '.env.production'
    ]
    
    updated = False
    for env_file in env_files:
        env_path = os.path.join(directory, env_file)
        if os.path.exists(env_path):
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Update YOLO service URL
                patterns = [
                    r'YOLO_SERVICE_URL\s*=\s*["\'][^"\']*["\']',
                    r'YOLO_URL\s*=\s*["\'][^"\']*["\']'
                ]
                
                for pattern in patterns:
                    if re.search(pattern, content):
                        new_content = re.sub(pattern, f'YOLO_SERVICE_URL = "{new_url}"', content)
                        if new_content != content:
                            content = new_content
                            updated = True
                            break
                
                if updated:
                    with open(env_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"✅ Updated {env_file}")
                    
            except Exception as e:
                print(f"❌ Error updating {env_file}: {e}")
    
    return updated

def main():
    print("🔧 AutoSOS Frontend Configuration Updater")
    print("=" * 50)
    
    # Get the new URL from user
    print("\nEnter your Cloudflare tunnel URL:")
    print("Example: https://autosos-yolo.yourdomain.com")
    new_url = input("URL: ").strip()
    
    if not new_url:
        print("❌ No URL provided. Exiting.")
        return
    
    if not new_url.startswith(('http://', 'https://')):
        print("❌ URL must start with http:// or https://")
        return
    
    # Find project directory
    project_dir = os.getcwd()
    src_dir = os.path.join(project_dir, 'src')
    
    if not os.path.exists(src_dir):
        print(f"❌ Source directory not found: {src_dir}")
        return
    
    print(f"\n📁 Project directory: {project_dir}")
    print(f"🔍 Searching for TypeScript files...")
    
    # Find all TypeScript files
    ts_files = find_typescript_files(src_dir)
    print(f"📄 Found {len(ts_files)} TypeScript files")
    
    # Update files
    updated_files = []
    
    # Update environment files first
    print("\n🌍 Updating environment files...")
    if update_environment_files(project_dir, new_url):
        updated_files.append("Environment files")
    
    # Update TypeScript files
    print("\n📝 Updating TypeScript files...")
    for ts_file in ts_files:
        if update_yolo_service_url(ts_file, new_url):
            relative_path = os.path.relpath(ts_file, project_dir)
            updated_files.append(relative_path)
            print(f"✅ Updated: {relative_path}")
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Update Summary")
    print("=" * 50)
    
    if updated_files:
        print(f"✅ Successfully updated {len(updated_files)} files:")
        for file in updated_files:
            print(f"   - {file}")
        
        print(f"\n🎯 New YOLO service URL: {new_url}")
        print("\n📋 Next steps:")
        print("1. Test your local YOLO service")
        print("2. Start your Cloudflare tunnel")
        print("3. Run: python test_cloudflare_setup.py")
        print("4. Test the AutoSOS app with the new URL")
        
    else:
        print("⚠️  No files were updated.")
        print("This might mean:")
        print("- No YOLO service URLs were found")
        print("- Files are already using the correct URL")
        print("- Manual configuration is required")
    
    print("\n" + "=" * 50)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Update cancelled by user.")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
    
    input("\nPress Enter to exit...")
