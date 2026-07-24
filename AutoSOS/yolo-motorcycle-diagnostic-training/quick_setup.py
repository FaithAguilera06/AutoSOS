#!/usr/bin/env python3
"""
Quick Setup Script for Motorcycle Diagnostic Dataset
One-click setup for Google Drive images to YOLOv8 training
"""

import os
import sys
import subprocess
from pathlib import Path
import argparse

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"Error output: {e.stderr}")
        return False

def check_dependencies():
    """Check if required dependencies are installed"""
    print("🔍 Checking dependencies...")
    
    required_packages = [
        'ultralytics',
        'opencv-python',
        'Pillow',
        'numpy',
        'pandas',
        'matplotlib',
        'seaborn',
        'requests',
        'pyyaml'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing packages: {', '.join(missing_packages)}")
        print("Installing missing packages...")
        
        install_cmd = f"pip install {' '.join(missing_packages)}"
        if not run_command(install_cmd, "Installing dependencies"):
            return False
    
    print("✅ All dependencies are installed")
    return True

def setup_directories():
    """Create required directories"""
    print("📁 Setting up directories...")
    
    directories = [
        "raw_dataset",
        "organized_dataset",
        "dataset/images/train",
        "dataset/images/val", 
        "dataset/images/test",
        "dataset/labels/train",
        "dataset/labels/val",
        "dataset/labels/test",
        "models",
        "runs"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
    
    print("✅ Directories created")
    return True

def download_from_google_drive(file_id, output_dir="raw_dataset"):
    """Download images from Google Drive"""
    print(f"📥 Downloading from Google Drive (ID: {file_id})...")
    
    # Create download script
    download_script = f"""
import requests
import zipfile
from pathlib import Path

def download_file():
    url = "https://drive.google.com/uc?export=download&id={file_id}"
    output_path = Path("{output_dir}") / "motorcycle_dataset.zip"
    
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"Downloaded to: {{output_path}}")
        
        # Extract if it's a ZIP file
        if output_path.suffix == '.zip':
            extract_dir = Path("{output_dir}") / "extracted"
            extract_dir.mkdir(exist_ok=True)
            
            with zipfile.ZipFile(output_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            
            print(f"Extracted to: {{extract_dir}}")
        
        return True
    except Exception as e:
        print(f"Download failed: {{e}}")
        return False

if __name__ == "__main__":
    download_file()
"""
    
    # Write and run download script
    with open("temp_download.py", "w") as f:
        f.write(download_script)
    
    success = run_command("python temp_download.py", "Downloading from Google Drive")
    
    # Clean up
    if os.path.exists("temp_download.py"):
        os.remove("temp_download.py")
    
    return success

def organize_dataset(source_dir="raw_dataset", auto_organize=True):
    """Organize dataset into class directories"""
    print("🗂️ Organizing dataset...")
    
    if auto_organize:
        # Try automatic organization first
        cmd = f"python scripts/google_drive_dataset_setup.py --organize --source {source_dir} --auto-organize"
        if run_command(cmd, "Auto-organizing dataset"):
            return True
    
    # If auto-organization fails, provide manual instructions
    print("📋 Manual organization required:")
    print("Please organize your images into these directories:")
    print("  - organized_dataset/broken_headlights_tail_lights/")
    print("  - organized_dataset/broken_side_mirror/")
    print("  - organized_dataset/flat_tire/")
    print("  - organized_dataset/oil_leak/")
    print("\nSee GOOGLE_DRIVE_SETUP_GUIDE.md for detailed instructions")
    
    return True

def create_annotations(source_dir="organized_dataset", mode="gui"):
    """Create annotations for the dataset"""
    print("📝 Creating annotations...")
    
    cmd = f"python scripts/create_annotations.py --source {source_dir} --output dataset --mode {mode}"
    return run_command(cmd, "Creating annotations")

def prepare_final_dataset(source_dir="organized_dataset"):
    """Prepare final dataset for training"""
    print("🎯 Preparing final dataset...")
    
    cmd = f"python scripts/data_preparation.py --source {source_dir} --output dataset"
    return run_command(cmd, "Preparing final dataset")

def start_training(epochs=150, batch_size=32):
    """Start YOLOv8 training"""
    print("🏋️ Starting YOLOv8 training...")
    
    cmd = f"python train_android_yolo.py --epochs {epochs} --batch-size {batch_size}"
    return run_command(cmd, "Training YOLOv8 model")

def main():
    """Main setup function"""
    parser = argparse.ArgumentParser(description='Quick setup for motorcycle diagnostic dataset')
    parser.add_argument('--file-id', type=str, help='Google Drive file/folder ID')
    parser.add_argument('--skip-download', action='store_true', help='Skip Google Drive download')
    parser.add_argument('--skip-organization', action='store_true', help='Skip dataset organization')
    parser.add_argument('--skip-annotations', action='store_true', help='Skip annotation creation')
    parser.add_argument('--skip-training', action='store_true', help='Skip model training')
    parser.add_argument('--epochs', type=int, default=150, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size for training')
    parser.add_argument('--annotation-mode', type=str, choices=['gui', 'auto'], default='gui',
                        help='Annotation mode: gui (interactive) or auto (placeholder)')
    
    args = parser.parse_args()
    
    print("🚀 Starting Quick Setup for Motorcycle Diagnostic Dataset")
    print("=" * 60)
    
    # Step 1: Check dependencies
    if not check_dependencies():
        print("❌ Dependency check failed")
        return 1
    
    # Step 2: Setup directories
    if not setup_directories():
        print("❌ Directory setup failed")
        return 1
    
    # Step 3: Download from Google Drive (if file ID provided)
    if not args.skip_download and args.file_id:
        if not download_from_google_drive(args.file_id):
            print("❌ Google Drive download failed")
            return 1
    elif not args.skip_download and not args.file_id:
        print("⚠️  No Google Drive file ID provided, skipping download")
        print("   Please download your images manually to 'raw_dataset/' directory")
    
    # Step 4: Organize dataset
    if not args.skip_organization:
        if not organize_dataset():
            print("❌ Dataset organization failed")
            return 1
    
    # Step 5: Create annotations
    if not args.skip_annotations:
        if not create_annotations(mode=args.annotation_mode):
            print("❌ Annotation creation failed")
            return 1
    
    # Step 6: Prepare final dataset
    if not prepare_final_dataset():
        print("❌ Final dataset preparation failed")
        return 1
    
    # Step 7: Start training
    if not args.skip_training:
        if not start_training(args.epochs, args.batch_size):
            print("❌ Training failed")
            return 1
    
    print("\n🎉 Quick Setup Completed Successfully!")
    print("=" * 60)
    print("📋 What was accomplished:")
    print("   ✅ Dependencies installed")
    print("   ✅ Directories created")
    if not args.skip_download and args.file_id:
        print("   ✅ Images downloaded from Google Drive")
    if not args.skip_organization:
        print("   ✅ Dataset organized by class")
    if not args.skip_annotations:
        print("   ✅ Annotations created")
    print("   ✅ Final dataset prepared")
    if not args.skip_training:
        print("   ✅ YOLOv8 model trained")
    
    print("\n📁 Your dataset structure:")
    print("   - raw_dataset/ (downloaded images)")
    print("   - organized_dataset/ (sorted by class)")
    print("   - dataset/ (final training dataset)")
    print("   - models/ (trained models)")
    
    print("\n🚀 Next steps:")
    print("   1. Review your trained model in models/ directory")
    print("   2. Test the model on new images")
    print("   3. Follow ANDROID_INTEGRATION_GUIDE.md for mobile deployment")
    print("   4. Integrate with your AutoSOS Android app")
    
    return 0

if __name__ == "__main__":
    exit(main())
