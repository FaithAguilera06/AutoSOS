#!/usr/bin/env python3
"""
Test script to verify OpenRouteService integration
Tests the alternative routing service endpoints
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
NAVIGATION_SERVICE_URL = "https://autosos-routing.onrender.com"
TEST_ORIGIN = {
    "lat": 14.5995,  # Manila, Philippines
    "lng": 120.9842
}
TEST_DESTINATION = {
    "lat": 14.6042,  # Nearby location in Manila
    "lng": 120.9822
}

def test_health_check():
    """Test the health check endpoint"""
    print("🔍 Testing health check endpoint...")
    try:
        response = requests.get(f"{NAVIGATION_SERVICE_URL}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_directions_api():
    """Test the directions API endpoint"""
    print("\n🗺️ Testing directions API...")
    try:
        url = f"{NAVIGATION_SERVICE_URL}/api/directions"
        payload = {
            "origin_lat": TEST_ORIGIN["lat"],
            "origin_lng": TEST_ORIGIN["lng"],
            "destination_lat": TEST_DESTINATION["lat"],
            "destination_lng": TEST_DESTINATION["lng"]
        }
        
        response = requests.post(url, json=payload, timeout=15)
        if response.status_code == 200:
            data = response.json()
            if "routes" in data and len(data["routes"]) > 0:
                route = data["routes"][0]
                distance_km = route.get("distance", 0) / 1000
                duration_min = route.get("duration", 0) / 60
                print(f"✅ Directions API passed:")
                print(f"   Distance: {distance_km:.2f} km")
                print(f"   Duration: {duration_min:.1f} minutes")
                return True
            else:
                print(f"❌ Directions API failed: No routes in response")
                return False
        else:
            print(f"❌ Directions API failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Directions API error: {e}")
        return False

def test_geocoding_api():
    """Test the geocoding API endpoint"""
    print("\n📍 Testing geocoding API...")
    try:
        url = f"{NAVIGATION_SERVICE_URL}/api/geocoding"
        payload = {
            "query": "Manila, Philippines"
        }
        
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "features" in data and len(data["features"]) > 0:
                feature = data["features"][0]
                print(f"✅ Geocoding API passed:")
                print(f"   Found: {feature.get('text', 'Unknown')}")
                print(f"   Place: {feature.get('place_name', 'Unknown')}")
                return True
            else:
                print(f"❌ Geocoding API failed: No features in response")
                return False
        else:
            print(f"❌ Geocoding API failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Geocoding API error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing OpenRouteService Integration")
    print("=" * 50)
    print(f"Service URL: {NAVIGATION_SERVICE_URL}")
    print(f"Test Origin: {TEST_ORIGIN}")
    print(f"Test Destination: {TEST_DESTINATION}")
    print("=" * 50)
    
    tests = [
        test_health_check,
        test_directions_api,
        test_geocoding_api
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! OpenRouteService integration is working correctly.")
        print("\n✅ The following features now use OpenRouteService:")
        print("   • Client mechanic finder distance calculations")
        print("   • Mechanic navigation routes")
        print("   • Real-time route display")
        print("   • Service request routing")
    else:
        print("⚠️ Some tests failed. Please check the service configuration.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
