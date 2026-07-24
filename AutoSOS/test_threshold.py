#!/usr/bin/env python3
"""Test detection with 0.2 confidence threshold"""
import requests
import json

print("=== Testing with 0.2 confidence threshold ===\n")

images = ['test_image_0.jpg', 'test_image_1.jpg', 'test_image_2.jpg', 'test_image_3.jpg']

for img in images:
    try:
        print(f"\nImage: {img}")
        with open(img, 'rb') as f:
            response = requests.post(
                'http://localhost:8000/predict',
                files={'file': f},
                data={'confidence_threshold': 0.2}
            )
        result = response.json()
        print(json.dumps(result, indent=2))
        
        if result.get('total_detections', 0) > 0:
            print(f"✓ Found {result['total_detections']} detection(s)!")
    except Exception as e:
        print(f"Error: {e}")
    print("-" * 50)

