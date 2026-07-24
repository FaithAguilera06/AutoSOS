# Google Drive Dataset Setup Guide

## Overview
This guide will help you download, organize, and prepare your Google Drive motorcycle images for YOLOv8 training.

## Step 1: Download Images from Google Drive

### Option A: Direct Download (Recommended)

1. **Get your Google Drive file ID:**
   - Open your Google Drive folder in browser
   - Copy the folder ID from the URL: `https://drive.google.com/drive/folders/YOUR_FOLDER_ID`
   - Or if it's a ZIP file: `https://drive.google.com/file/d/YOUR_FILE_ID/view`

2. **Download using the script:**
   ```bash
   cd yolo-motorcycle-diagnostic-training
   python scripts/google_drive_dataset_setup.py --download --file-id YOUR_FILE_ID
   ```

### Option B: Manual Download

1. **Download from Google Drive:**
   - Go to your Google Drive folder
   - Select all images (Ctrl+A)
   - Right-click → Download
   - This will create a ZIP file

2. **Extract the ZIP file:**
   ```bash
   # Place the downloaded ZIP in the project directory
   unzip your_downloaded_file.zip -d raw_dataset/
   ```

## Step 2: Organize Images by Class

### Automatic Organization (if filenames contain keywords)

```bash
python scripts/google_drive_dataset_setup.py --organize --source raw_dataset --auto-organize
```

The script will automatically organize images based on filename patterns:
- **Headlights/Tail Lights**: `headlight`, `head_light`, `tail_light`, `taillight`, `broken_light`
- **Side Mirror**: `mirror`, `side_mirror`, `broken_mirror`, `cracked_mirror`
- **Flat Tire**: `flat_tire`, `deflated`, `low_pressure`, `tire_damage`
- **Oil Leak**: `oil_leak`, `oil_stain`, `oil_drip`, `oil_puddle`

### Manual Organization (Recommended)

1. **Create class directories:**
   ```bash
   mkdir -p organized_dataset/{broken_headlights_tail_lights,broken_side_mirror,flat_tire,oil_leak}
   ```

2. **Manually sort your images:**
   - **`broken_headlights_tail_lights/`**: Cracked/broken headlights, non-functioning lights, damaged tail lights
   - **`broken_side_mirror/`**: Cracked mirrors, missing mirrors, damaged mirror housing
   - **`flat_tire/`**: Deflated tires, completely flat tires, tires with visible damage
   - **`oil_leak/`**: Oil stains on ground, oil dripping, visible oil on engine

3. **Tips for organization:**
   - Aim for 100-200 images per class minimum
   - Include various angles and lighting conditions
   - Mix different motorcycle types and models
   - Remove blurry or unclear images
   - Ensure the issue is clearly visible in each image

## Step 3: Create Annotations

### Interactive Annotation Tool (Recommended)

```bash
python scripts/create_annotations.py --source organized_dataset --output dataset --mode gui
```

This opens an interactive GUI where you can:
1. **Draw bounding boxes** around issues in each image
2. **Select the correct class** for each annotation
3. **Navigate between images** easily
4. **Save annotations** in YOLO format

### GUI Instructions:
- **Click and drag** to draw bounding boxes
- **Select class** from radio buttons on the right
- **Use Previous/Next** buttons to navigate
- **Save annotations** when done with each image
- **Press 'q'** to quit

### Automatic Annotations (Placeholder)

```bash
python scripts/create_annotations.py --source organized_dataset --output dataset --mode auto
```

This creates placeholder annotations (center of image, 20% size) - you'll need to manually adjust these.

## Step 4: Prepare Final Dataset

```bash
python scripts/data_preparation.py --source organized_dataset --output dataset
```

This script will:
- Split your dataset into train/validation/test sets (70%/20%/10%)
- Create the final YOLO dataset structure
- Generate dataset statistics
- Create the configuration file

## Step 5: Start Training

```bash
python train_android_yolo.py --epochs 150 --batch-size 32
```

## Directory Structure After Setup

```
yolo-motorcycle-diagnostic-training/
├── raw_dataset/                    # Downloaded images
├── organized_dataset/              # Manually organized images
│   ├── broken_headlights_tail_lights/
│   ├── broken_side_mirror/
│   ├── flat_tire/
│   └── oil_leak/
├── dataset/                        # Final training dataset
│   ├── images/
│   │   ├── train/
│   │   ├── val/
│   │   └── test/
│   ├── labels/
│   │   ├── train/
│   │   ├── val/
│   │   └── test/
│   └── motorcycle_diagnostic.yaml
└── models/                         # Trained models
```

## Tips for Better Results

### Image Quality:
- **High resolution**: At least 640x640 pixels
- **Good lighting**: Clear, well-lit images
- **Sharp focus**: Avoid blurry images
- **Multiple angles**: Front, side, close-up views

### Dataset Balance:
- **Equal distribution**: Try to have similar numbers for each class
- **Diverse conditions**: Different lighting, weather, backgrounds
- **Various motorcycles**: Different brands, models, colors
- **Different severity levels**: Minor to major issues

### Annotation Quality:
- **Tight bounding boxes**: Draw boxes close to the issue
- **Complete coverage**: Include the entire issue area
- **Consistent labeling**: Use the same criteria for each class
- **Multiple annotations**: One image can have multiple issues

## Troubleshooting

### Common Issues:

1. **"No images found"**:
   - Check file extensions (.jpg, .jpeg, .png, .bmp, .tiff, .webp)
   - Ensure images are in the correct directory structure

2. **"Google Drive download failed"**:
   - Make sure the file/folder is publicly accessible
   - Try downloading manually and extracting

3. **"GUI not working"**:
   - Install tkinter: `pip install tk`
   - Try the automatic annotation mode instead

4. **"Low accuracy after training"**:
   - Add more images to underrepresented classes
   - Improve annotation quality
   - Increase training epochs

### Performance Tips:

- **Batch processing**: Process multiple images at once
- **Parallel annotation**: Have multiple people annotate different classes
- **Quality control**: Review annotations before training
- **Data augmentation**: The training script includes automatic augmentation

## Next Steps

After completing the dataset setup:

1. **Train your model**: `python train_android_yolo.py`
2. **Evaluate performance**: Check training metrics and validation results
3. **Test on new images**: Use the trained model on unseen motorcycle images
4. **Integrate with Android**: Follow the Android integration guide
5. **Deploy to AutoSOS**: Integrate with your existing diagnostic system

## Support

If you encounter issues:
1. Check the error messages carefully
2. Verify your directory structure matches the guide
3. Ensure all dependencies are installed
4. Try the manual organization approach if automatic fails

Your motorcycle diagnostic dataset is now ready for YOLOv8 training! 🏍️📱
