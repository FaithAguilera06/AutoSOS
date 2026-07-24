import requests

url = 'https://atdibhoeaeqfgjswcqwx.supabase.co/rest/v1/ml_models?id=eq.1'
headers = {'apikey': 'sb_publishable_8zWSuqsDoSKDiWkz3Yd_eg_E7N1X7oj'}

response = requests.get(url, headers=headers)
print('Model info:')
print(response.text)

# Parse the JSON to get specific fields
import json
if response.status_code == 200:
    data = response.json()
    if data:
        model = data[0]
        print(f"\nModel Name: {model.get('model_name')}")
        print(f"Model Type: {model.get('model_type')}")
        print(f"File Path: {model.get('file_path')}")
        print(f"File Size: {model.get('file_size')}")
        print(f"File Hash: {model.get('file_hash')}")
        print(f"Status: {model.get('status')}")
        print(f"Is Default: {model.get('is_default')}")
