# Dataset Organization Report

## Summary
- **Source ZIP**: Dataset.zip
- **Extraction Date**: 2025-09-21 09:43:23
- **Total Images**: 1200

## Class Distribution
- **Broken Headlights Tail Lights**: 300 images (25.0%)
- **Broken Side Mirror**: 298 images (24.8%)
- **Flat Tire**: 304 images (25.3%)
- **Oil Leak**: 298 images (24.8%)

## Folder Analysis
### Broken Headlights Tail Lights
- **Items found**: 300
- **Images**: 300
- **Directory**: `organized_dataset\broken_headlights_tail_lights`

### Broken Side Mirror
- **Items found**: 300
- **Images**: 298
- **Directory**: `organized_dataset\broken_side_mirror`

### Flat Tire
- **Items found**: 304
- **Images**: 304
- **Directory**: `organized_dataset\flat_tire`

### Oil Leak
- **Items found**: 300
- **Images**: 298
- **Directory**: `organized_dataset\oil_leak`


## Next Steps

1. **Review the organized images** in each class directory
2. **Add more images** if any class has fewer than 100 images
3. **Remove low-quality images** (blurry, unclear, etc.)
4. **Create annotations** using the annotation tool
5. **Start training** with YOLOv8

## Commands to Run Next

```bash
# Create annotations (interactive GUI)
python scripts/create_annotations.py --source organized_dataset --output dataset --mode gui

# Or create placeholder annotations
python scripts/create_annotations.py --source organized_dataset --output dataset --mode auto

# Prepare final dataset
python scripts/data_preparation.py --source organized_dataset --output dataset

# Start training
python train_android_yolo.py --epochs 150 --batch-size 32
```

## Tips for Better Results

- **Minimum 100 images per class** for good training
- **High-quality images** with clear visibility of issues
- **Diverse conditions** (lighting, angles, motorcycle types)
- **Accurate annotations** with tight bounding boxes
