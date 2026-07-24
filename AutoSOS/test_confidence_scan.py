#!/usr/bin/env python3
"""Scan different confidence thresholds to find optimal setting"""
import requests
import json

print("=== Scanning confidence thresholds for test_image_0.jpg ===\n")

with open('test_image_0.jpg', 'rb') as f:
    for threshold in [0.05, 0.1, 0.15, 0.2, 0.25, 0.3]:
        f.seek(0)  # Reset file pointer
        response = requests.post(
            'http://localhost:8000/predict',
            files={'file': f},
            data={'confidence_threshold': threshold}
        )
        result = response.json()
        detections = result.get('total_detections', 0)
        
        if detections > 0:
            print(f"Confidence {threshold:.2f}: Found {detections} detection(s)")
            for det in result.get('detections', []):
                print(f"  - {det['class_name']}: {det['confidence']:.3f}")
        else:
            print(f"Confidence {threshold:.2f}: No detections")

