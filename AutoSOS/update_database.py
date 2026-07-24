import requests
import os
import hashlib

# Get file info
file_path = 'yolo-motorcycle-diagnostic-training/runs/detect/train3/weights/best.pt'
file_size = os.path.getsize(file_path)

with open(file_path, 'rb') as f:
    file_hash = hashlib.sha256(f.read()).hexdigest()

print(f'File size: {file_size} bytes')
print(f'File hash: {file_hash}')

# Update database record
url = 'https://atdibhoeaeqfgjswcqwx.supabase.co/rest/v1/ml_models?id=eq.1'
headers = {
    'apikey': 'sb_publishable_8zWSuqsDoSKDiWkz3Yd_eg_E7N1X7oj',
    'Content-Type': 'application/json'
}
data = {
    'file_size': file_size,
    'file_hash': file_hash,
    'file_path': 'models/yolov8/motorcycle_diagnostic_v1.pt'  # Make sure this matches the uploaded path
}

response = requests.patch(url, headers=headers, json=data)
print(f'Database update status: {response.status_code}')
print(f'Response: {response.text}')

if response.status_code == 204:
    print('✅ Database updated successfully!')
else:
    print('❌ Database update failed')
