#!/usr/bin/env python3
"""
Test script for Gradio API integration
"""

import requests
import base64
import json
from PIL import Image
import io
import numpy as np

# Hugging Face Space URL
HF_SPACE_URL = "https://iceszn12-autosos.hf.space"
GRADIO_API_URL = f"{HF_SPACE_URL}/api/predict"

def create_test_image():
    """Create a simple test image"""
    # Create a simple test image with some basic shapes
    img = Image.new('RGB', (640, 480), color='white')
    
    # Add some basic shapes that might trigger detections
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    
    # Draw a rectangle (simulating a motorcycle part)
    draw.rectangle([100, 100, 200, 150], fill='red', outline='black', width=2)
    
    # Draw a circle (simulating a tire)
    draw.ellipse([300, 200, 400, 300], fill='black', outline='gray', width=2)
    
    # Draw some lines (simulating cracks or damage)
    draw.line([(500, 100), (600, 200)], fill='red', width=3)
    
    return img

def test_gradio_api():
    """Test the Gradio API directly"""
    print("Testing Gradio API Integration")
    print("=" * 50)
    
    try:
        # Test 1: Check if the space is accessible
        print("Test 1: Checking Hugging Face Space accessibility...")
        response = requests.get(HF_SPACE_URL, timeout=10)
        print(f"Space accessible: {response.status_code}")
        
        if not response.ok:
            print("Space not accessible, stopping test")
            return False
        
        # Test 2: Create test image
        print("\nTest 2: Creating test image...")
        test_image = create_test_image()
        
        # Convert to base64
        buffer = io.BytesIO()
        test_image.save(buffer, format='JPEG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        print(f"Test image created: {len(img_base64)} characters")
        
        # Test 3: Test the Gradio API
        print("\nTest 3: Testing Gradio API...")
        
        # Prepare the request payload for Gradio
        payload = {
            "data": [
                f"data:image/jpeg;base64,{img_base64}",
                0.5  # confidence threshold
            ],
            "fn_index": 0  # The first function in the Gradio interface
        }
        
        print(f"API URL: {GRADIO_API_URL}")
        print(f"Payload size: {len(json.dumps(payload))} characters")
        
        # Send request to Gradio API
        response = requests.post(
            GRADIO_API_URL,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.ok:
            result = response.json()
            print("Gradio API response received!")
            print(f"Response keys: {list(result.keys())}")
            print(f"Data length: {len(result.get('data', []))}")
            
            if 'data' in result and len(result['data']) > 0:
                print("Detection results available!")
                print(f"First data item type: {type(result['data'][0])}")
                if len(result['data']) > 1:
                    print(f"Second data item: {result['data'][1][:200]}...")  # First 200 chars
            else:
                print("No detection data in response")
                
            return True
        else:
            print(f"Gradio API request failed: {response.status_code}")
            print(f"Response text: {response.text[:500]}...")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False

def show_integration_status():
    """Show integration status and next steps"""
    print("\n" + "=" * 50)
    print("INTEGRATION STATUS")
    print("=" * 50)
    
    print("\n1. AutoSOS App Updates:")
    print("   - Camera page updated to use GradioYoloService")
    print("   - Health checks now work with Hugging Face Spaces")
    print("   - Detection uses Gradio API with fallback to Render")
    
    print("\n2. Next Steps:")
    print("   - Test the camera diagnostic in your AutoSOS app")
    print("   - Take a photo of a motorcycle")
    print("   - Check browser console for logs")
    print("   - Verify detections are working")
    
    print("\n3. Expected Behavior:")
    print("   - App should connect to Hugging Face Space")
    print("   - Photos should be processed through Gradio API")
    print("   - Results should show motorcycle issue detections")
    print("   - Fallback to Render service if Gradio fails")
    
    print("\n4. Troubleshooting:")
    print("   - Check browser console for error messages")
    print("   - Verify Hugging Face Space is running")
    print("   - Test with different motorcycle images")
    print("   - Check network connectivity")

if __name__ == "__main__":
    success = test_gradio_api()
    show_integration_status()
    
    if success:
        print("\nGradio API integration test completed successfully!")
        print("Your AutoSOS app should now work with the Hugging Face Space!")
    else:
        print("\nGradio API integration test had issues.")
        print("Check the Hugging Face Space directly in your browser.")
        print(f"URL: {HF_SPACE_URL}")
