# YOLOv8 Motorcycle Diagnostic Training

This directory contains everything needed to train YOLOv8 for motorcycle diagnostic mode in AutoSOS.

## Overview

The trained model will detect and identify:
- **Motorcycle Parts**: Engine components, brake systems, electrical parts, etc.
- **Issues**: Worn parts, leaks, damage, corrosion
- **Severity Levels**: Low, Medium, High, Critical

## Directory Structure

```
yolo-motorcycle-diagnostic-training/
├── README.md
├── requirements.txt
├── train_yolo.py
├── dataset/
│   ├── images/
│   │   ├── train/
│   │   ├── val/
│   │   └── test/
│   ├── labels/
│   │   ├── train/
│   │   ├── val/
│   │   └── test/
│   └── motorcycle_diagnostic.yaml
├── models/
│   ├── yolov8n.pt
│   ├── yolov8s.pt
│   └── custom_motorcycle_diagnostic.pt
├── scripts/
│   ├── data_preparation.py
│   ├── annotation_tools.py
│   └── model_evaluation.py
└── notebooks/
    ├── data_exploration.ipynb
    └── training_analysis.ipynb
```

## Quick Start

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Prepare Dataset**:
   ```bash
   python scripts/data_preparation.py
   ```

3. **Train Model**:
   ```bash
   python train_yolo.py
   ```

4. **Evaluate Model**:
   ```bash
   python scripts/model_evaluation.py
   ```

## Classes to Detect

### Motorcycle Parts (20 classes)
- engine_block, cylinder_head, spark_plug, air_filter
- brake_pad, brake_rotor, brake_caliper, brake_line
- battery, alternator, starter_motor, fuse_box
- shock_absorber, fork, swingarm, wheel_rim
- chain, sprocket, exhaust_pipe, muffler

### Issues (15 classes)
- worn_brake_pad, cracked_rotor, oil_leak, coolant_leak
- rust_corrosion, loose_connection, damaged_wire
- worn_chain, flat_tire, bent_rim, cracked_engine
- dirty_air_filter, dead_battery, blown_fuse
- worn_shock, damaged_exhaust

### Severity Levels (4 classes)
- low_severity, medium_severity, high_severity, critical_severity

## Training Configuration

- **Model**: YOLOv8n (nano) for mobile deployment
- **Input Size**: 640x640 pixels
- **Epochs**: 100-200 depending on dataset size
- **Batch Size**: 16 (adjust based on GPU memory)
- **Learning Rate**: 0.01 with cosine annealing
- **Augmentation**: Mosaic, MixUp, Copy-Paste

## Performance Targets

- **mAP@0.5**: > 0.85
- **mAP@0.5:0.95**: > 0.65
- **Inference Speed**: < 50ms on mobile
- **Model Size**: < 10MB

## Integration with AutoSOS

The trained model will be integrated into the diagnostic camera system to:
1. Detect motorcycle parts in real-time
2. Identify issues and their severity
3. Provide repair recommendations
4. Generate diagnostic reports
