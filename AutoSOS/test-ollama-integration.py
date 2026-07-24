#!/usr/bin/env python3
"""
Test script for Ollama integration with AutoSOS chat diagnostic
This script tests the Ollama API endpoints used by the AutoSOS app
"""

import requests
import json
import time
import sys

# Configuration
OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "llama3.2:3b"

def test_ollama_connection():
    """Test if Ollama service is running"""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            print("✅ Ollama service is running")
            return True
        else:
            print(f"❌ Ollama service returned status code: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to Ollama service: {e}")
        return False

def get_available_models():
    """Get list of available models"""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags")
        if response.status_code == 200:
            data = response.json()
            models = data.get('models', [])
            print(f"📋 Available models: {len(models)}")
            for model in models:
                print(f"   - {model['name']} ({model['size'] / (1024**3):.1f} GB)")
            return models
        else:
            print(f"❌ Failed to get models: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error getting models: {e}")
        return []

def test_model_availability(model_name):
    """Test if a specific model is available"""
    models = get_available_models()
    model_names = [model['name'] for model in models]
    
    if model_name in model_names:
        print(f"✅ Model '{model_name}' is available")
        return True
    else:
        print(f"❌ Model '{model_name}' is not available")
        print(f"   Available models: {', '.join(model_names)}")
        return False

def test_diagnostic_request():
    """Test a motorcycle diagnostic request"""
    print("\n🔧 Testing motorcycle diagnostic request...")
    
    # Test prompt similar to what AutoSOS sends
    test_prompt = """You are an expert motorcycle mechanic and diagnostic specialist. Your role is to help users diagnose motorcycle problems through detailed analysis and provide actionable recommendations.

IMPORTANT GUIDELINES:
1. Always prioritize safety - if there's any safety concern, emphasize it immediately
2. Provide specific, actionable advice
3. Include severity levels: Low, Medium, High, Critical
4. Suggest both immediate actions and long-term solutions
5. Consider cost-effective solutions when possible
6. Always recommend professional inspection for complex issues

RESPONSE FORMAT:
Provide your response in the following JSON format:
{
  "analysis": "Detailed analysis of the problem",
  "diagnosis": {
    "issue": "Specific issue identified",
    "severity": "Low|Medium|High|Critical",
    "recommendation": "Specific actionable recommendation",
    "immediate_actions": ["Action 1", "Action 2"],
    "long_term_solutions": ["Solution 1", "Solution 2"],
    "safety_warning": "Any safety concerns (if applicable)"
  },
  "follow_up_questions": ["Question 1", "Question 2"]
}

USER PROBLEM DESCRIPTION: My motorcycle engine is making a knocking sound when I accelerate, and it's getting worse over time. The bike is a 2018 Honda CBR600RR.

Please analyze this motorcycle problem and provide a comprehensive diagnostic response in the specified JSON format."""

    payload = {
        "model": DEFAULT_MODEL,
        "prompt": test_prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "top_k": 40,
            "repeat_penalty": 1.1
        }
    }

    try:
        print(f"   Sending request to model: {DEFAULT_MODEL}")
        start_time = time.time()
        
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json=payload,
            timeout=60  # Allow up to 60 seconds for response
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        if response.status_code == 200:
            data = response.json()
            ai_response = data.get('response', '')
            
            print(f"✅ Diagnostic request successful (took {response_time:.1f}s)")
            print(f"📝 Response length: {len(ai_response)} characters")
            
            # Try to parse JSON response
            try:
                # Look for JSON in the response
                json_start = ai_response.find('{')
                json_end = ai_response.rfind('}') + 1
                
                if json_start != -1 and json_end > json_start:
                    json_str = ai_response[json_start:json_end]
                    parsed = json.loads(json_str)
                    
                    print("✅ Response contains valid JSON structure")
                    print(f"   Issue: {parsed.get('diagnosis', {}).get('issue', 'N/A')}")
                    print(f"   Severity: {parsed.get('diagnosis', {}).get('severity', 'N/A')}")
                    print(f"   Safety Warning: {parsed.get('diagnosis', {}).get('safety_warning', 'None')}")
                else:
                    print("⚠️  Response doesn't contain structured JSON")
                    print(f"   First 200 chars: {ai_response[:200]}...")
                    
            except json.JSONDecodeError as e:
                print(f"⚠️  JSON parsing failed: {e}")
                print(f"   First 200 chars: {ai_response[:200]}...")
            
            return True
            
        else:
            print(f"❌ Diagnostic request failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out (60s limit)")
        return False
    except Exception as e:
        print(f"❌ Error during diagnostic request: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 AutoSOS Ollama Integration Test")
    print("=" * 50)
    
    # Test 1: Connection
    if not test_ollama_connection():
        print("\n❌ Cannot proceed without Ollama service")
        print("   Please start Ollama: ollama serve")
        sys.exit(1)
    
    # Test 2: Model availability
    print(f"\n📦 Checking model availability...")
    if not test_model_availability(DEFAULT_MODEL):
        print(f"\n💡 To install the default model, run:")
        print(f"   ollama pull {DEFAULT_MODEL}")
        sys.exit(1)
    
    # Test 3: Diagnostic request
    if test_diagnostic_request():
        print("\n🎉 All tests passed! Ollama integration is working correctly.")
        print("\n📱 You can now use the AutoSOS chat diagnostic feature with AI-powered responses.")
    else:
        print("\n❌ Diagnostic test failed. Check Ollama logs for issues.")
        sys.exit(1)

if __name__ == "__main__":
    main()
