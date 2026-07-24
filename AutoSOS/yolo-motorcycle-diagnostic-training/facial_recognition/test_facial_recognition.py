#!/usr/bin/env python3
"""
Test script for FaceNet Facial Recognition Service
Demonstrates registration, recognition, and payment verification
"""

import cv2
import numpy as np
import requests
import json
import base64
from pathlib import Path
import time

class FacialRecognitionTester:
    """Test class for facial recognition API"""
    
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.test_images_dir = Path("test_images")
        self.test_images_dir.mkdir(exist_ok=True)
    
    def create_test_image(self, filename: str, text: str = "Test Face") -> str:
        """Create a simple test image with text"""
        # Create a simple test image
        img = np.ones((300, 300, 3), dtype=np.uint8) * 255
        
        # Add some features to simulate a face
        cv2.circle(img, (150, 120), 30, (0, 0, 0), -1)  # Left eye
        cv2.circle(img, (200, 120), 30, (0, 0, 0), -1)  # Right eye
        cv2.ellipse(img, (175, 180), (40, 20), 0, 0, 180, (0, 0, 0), 2)  # Mouth
        
        # Add text
        cv2.putText(img, text, (50, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        
        # Save image
        image_path = self.test_images_dir / filename
        cv2.imwrite(str(image_path), img)
        return str(image_path)
    
    def test_health_check(self):
        """Test health check endpoint"""
        print("🔍 Testing health check...")
        try:
            response = requests.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Health check passed: {data['status']}")
                print(f"   Database stats: {data['database_stats']}")
                return True
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health check error: {e}")
            return False
    
    def test_register_face(self, user_id: str, user_name: str):
        """Test face registration"""
        print(f"👤 Testing face registration for {user_id}...")
        
        # Create test image
        image_path = self.create_test_image(f"{user_id}.jpg", f"Face of {user_name}")
        
        try:
            with open(image_path, 'rb') as f:
                files = {'file': f}
                data = {'user_id': user_id, 'user_name': user_name}
                
                response = requests.post(f"{self.base_url}/register-face", files=files, data=data)
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ Face registered successfully: {result['message']}")
                    return True
                else:
                    print(f"❌ Registration failed: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            print(f"❌ Registration error: {e}")
            return False
    
    def test_recognize_face(self, user_id: str):
        """Test face recognition"""
        print(f"🔍 Testing face recognition for {user_id}...")
        
        # Use the same test image
        image_path = self.test_images_dir / f"{user_id}.jpg"
        
        try:
            with open(image_path, 'rb') as f:
                files = {'file': f}
                
                response = requests.post(f"{self.base_url}/recognize-face", files=files)
                
                if response.status_code == 200:
                    result = response.json()
                    if result['recognized']:
                        print(f"✅ Face recognized: {result['user_name']} (confidence: {result['confidence']:.2f}%)")
                        return True
                    else:
                        print(f"⚠️  Face not recognized: {result['message']}")
                        return False
                else:
                    print(f"❌ Recognition failed: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            print(f"❌ Recognition error: {e}")
            return False
    
    def test_verify_payment(self, user_id: str):
        """Test payment verification"""
        print(f"💳 Testing payment verification for {user_id}...")
        
        # Use the same test image
        image_path = self.test_images_dir / f"{user_id}.jpg"
        
        try:
            with open(image_path, 'rb') as f:
                files = {'file': f}
                data = {'expected_user_id': user_id}
                
                response = requests.post(f"{self.base_url}/verify-payment", files=files, data=data)
                
                if response.status_code == 200:
                    result = response.json()
                    if result['verified']:
                        print(f"✅ Payment verified: {result['user_name']} (confidence: {result['confidence']:.2f}%)")
                        return True
                    else:
                        print(f"❌ Payment verification failed: {result['reason']}")
                        return False
                else:
                    print(f"❌ Verification failed: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            print(f"❌ Verification error: {e}")
            return False
    
    def test_database_stats(self):
        """Test database statistics"""
        print("📊 Testing database statistics...")
        
        try:
            response = requests.get(f"{self.base_url}/database-stats")
            
            if response.status_code == 200:
                result = response.json()
                stats = result['stats']
                print(f"✅ Database stats retrieved:")
                print(f"   Total users: {stats['total_users']}")
                print(f"   Users: {stats['user_list']}")
                print(f"   Threshold: {stats['threshold']}")
                return True
            else:
                print(f"❌ Stats retrieval failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Stats error: {e}")
            return False
    
    def test_list_users(self):
        """Test user listing"""
        print("👥 Testing user listing...")
        
        try:
            response = requests.get(f"{self.base_url}/users")
            
            if response.status_code == 200:
                result = response.json()
                users = result['users']
                print(f"✅ Users listed successfully:")
                for user in users:
                    print(f"   - {user['user_id']}: {user['user_name']}")
                return True
            else:
                print(f"❌ User listing failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ User listing error: {e}")
            return False
    
    def run_complete_test(self):
        """Run complete test suite"""
        print("🧪 Starting FaceNet Facial Recognition Test Suite")
        print("=" * 60)
        
        # Test users
        test_users = [
            ("mechanic_001", "John Doe"),
            ("mechanic_002", "Jane Smith"),
            ("mechanic_003", "Bob Johnson")
        ]
        
        results = []
        
        # 1. Health check
        results.append(("Health Check", self.test_health_check()))
        
        # 2. Register faces
        for user_id, user_name in test_users:
            results.append((f"Register {user_id}", self.test_register_face(user_id, user_name)))
        
        # 3. Database stats
        results.append(("Database Stats", self.test_database_stats()))
        
        # 4. List users
        results.append(("List Users", self.test_list_users()))
        
        # 5. Recognize faces
        for user_id, user_name in test_users:
            results.append((f"Recognize {user_id}", self.test_recognize_face(user_id)))
        
        # 6. Verify payments
        for user_id, user_name in test_users:
            results.append((f"Verify Payment {user_id}", self.test_verify_payment(user_id)))
        
        # Print summary
        print("\n" + "=" * 60)
        print("📋 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = 0
        total = len(results)
        
        for test_name, result in results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:<30} {status}")
            if result:
                passed += 1
        
        print("=" * 60)
        print(f"Total: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 All tests passed! FaceNet service is working correctly!")
        else:
            print("⚠️  Some tests failed. Check the service and try again.")
        
        return passed == total

def main():
    """Main test function"""
    tester = FacialRecognitionTester()
    
    print("🤖 FaceNet Facial Recognition Test Suite")
    print("Make sure the facial recognition service is running on http://localhost:8001")
    print("Run: start_facial_recognition.bat")
    print()
    
    input("Press Enter to start testing...")
    
    success = tester.run_complete_test()
    
    if success:
        print("\n✅ FaceNet service is ready for AutoSOS payment integration!")
    else:
        print("\n❌ FaceNet service needs attention before integration.")

if __name__ == "__main__":
    main()
