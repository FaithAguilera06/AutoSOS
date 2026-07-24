# ZIP Dataset Setup Guide

## Overview
This guide will help you process your ZIP file containing 4 folders for the 4 motorcycle problems and prepare it for YOLOv8 training.

## Quick Start

### Step 1: Process Your ZIP File
```bash
cd yolo-motorcycle-diagnostic-training

# Process your YOLOV8.zip file
python scripts/process_zip_dataset.py YOLOV8.zip
```

This will:
- ✅ Extract your ZIP file
- ✅ Analyze the 4 folders
- ✅ Organize images into the correct class directories
- ✅ Generate dataset statistics
- ✅ Create an organization report

### Step 2: Create Annotations
```bash
# Interactive annotation tool (recommended)
python scripts/create_annotations.py --source organized_dataset --output dataset --mode gui
```

### Step 3: Prepare Final Dataset
```bash
python scripts/data_preparation.py --source organized_dataset --output dataset
```

### Step 4: Start Training
```bash
python train_android_yolo.py --epochs 150 --batch-size 32
```

## Expected Folder Structure

Your ZIP file should contain 4 folders for the 4 motorcycle problems:

```
YOLOV8.zip
├── broken_headlights_tail_lights/    # Or: headlights, head_light, tail_light, etc.
├── broken_side_mirror/               # Or: mirror, side_mirror, broken_mirror, etc.
├── flat_tire/                        # Or: tire, tires, flat, deflated, etc.
└── oil_leak/                         # Or: oil, leak, oil_stain, etc.
```

## Supported Folder Names

The script will automatically map these folder names to the correct classes:

### Headlights/Tail Lights
- `headlights`, `head_light`, `tail_light`, `taillight`
- `broken_light`, `light_damage`, `lights`

### Side Mirror
- `mirror`, `side_mirror`, `broken_mirror`
- `cracked_mirror`, `mirror_damage`, `mirrors`

### Flat Tire
- `tire`, `tires`, `flat`, `deflated`
- `low_pressure`, `tire_damage`, `wheel`, `wheels`

### Oil Leak
- `oil`, `leak`, `oil_stain`, `oil_drip`
- `oil_puddle`, `fluid_leak`, `engine_oil`

## What the Script Does

1. **Extracts your ZIP file** to `organized_dataset/`
2. **Analyzes folder structure** and maps folder names to classes
3. **Organizes images** into the correct class directories
4. **Generates statistics** showing how many images per class
5. **Creates a report** with next steps and recommendations

## After Processing

You'll have this structure:
```
organized_dataset/
├── broken_headlights_tail_lights/
├── broken_side_mirror/
├── flat_tire/
├── oil_leak/
├── dataset_statistics.json
└── ORGANIZATION_REPORT.md
```

## Next Steps

### 1. Review Your Images
- Check each class directory
- Remove any low-quality images
- Ensure each image clearly shows the issue

### 2. Create Annotations
The annotation tool will help you:
- Draw bounding boxes around issues
- Select the correct class for each annotation
- Navigate between images easily
- Save annotations in YOLO format

### 3. Train Your Model
Once annotations are complete, start training:
```bash
python train_android_yolo.py --epochs 150 --batch-size 32
```

## Tips for Better Results

### Image Quality
- **High resolution**: At least 640x640 pixels
- **Good lighting**: Clear, well-lit images
- **Sharp focus**: Avoid blurry images
- **Multiple angles**: Front, side, close-up views

### Dataset Balance
- **Equal distribution**: Try to have similar numbers for each class
- **Diverse conditions**: Different lighting, weather, backgrounds
- **Various motorcycles**: Different brands, models, colors
- **Different severity levels**: Minor to major issues

### Minimum Requirements
- **100+ images per class** for good training
- **Clear visibility** of the issue in each image
- **Consistent quality** across all images

## Troubleshooting

### "No valid folders found"
- Check that your ZIP contains 4 folders
- Ensure folder names match the supported names
- The script will show you what folders it found

### "No images found"
- Check that your folders contain image files
- Supported formats: .jpg, .jpeg, .png, .bmp, .tiff, .webp
- Ensure images are in the folders, not in subfolders

### "Low accuracy after training"
- Add more images to underrepresented classes
- Improve annotation quality
- Increase training epochs
- Check image quality and diversity

## Example Commands

```bash
# Process your ZIP file
python scripts/process_zip_dataset.py YOLOV8.zip

# Create annotations (interactive)
python scripts/create_annotations.py --source organized_dataset --output dataset --mode gui

# Create placeholder annotations (faster)
python scripts/create_annotations.py --source organized_dataset --output dataset --mode auto

# Prepare final dataset
python scripts/data_preparation.py --source organized_dataset --output dataset

# Start training
python train_android_yolo.py --epochs 150 --batch-size 32

# Train with different parameters
python train_android_yolo.py --epochs 200 --batch-size 16 --img-size 640
```

## Support

If you encounter issues:
1. Check the error messages carefully
2. Verify your ZIP file structure
3. Ensure all dependencies are installed
4. Check the organization report for details

Your motorcycle diagnostic dataset is now ready for YOLOv8 training! 🏍️📱
