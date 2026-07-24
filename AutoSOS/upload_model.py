import requests
import os
import hashlib
import base64

def upload_model_to_supabase():
    # File details
    file_path = 'yolo-motorcycle-diagnostic-training/runs/detect/train3/weights/best.pt'
    supabase_url = 'https://atdibhoeaeqfgjswcqwx.supabase.co'
    supabase_key = 'sb_publishable_8zWSuqsDoSKDiWkz3Yd_eg_E7N1X7oj'
    
    # Check file size
    file_size = os.path.getsize(file_path)
    print(f'File size: {file_size / (1024*1024):.2f} MB')
    
    # Calculate hash
    with open(file_path, 'rb') as f:
        file_content = f.read()
        file_hash = hashlib.sha256(file_content).hexdigest()
    
    print(f'File hash: {file_hash}')
    
    # Upload to Supabase storage
    storage_path = 'models/yolov8/motorcycle_diagnostic_v1.pt'
    
    # Create signed URL for upload
    upload_url = f'{supabase_url}/storage/v1/object/autosos/{storage_path}'
    headers = {
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/octet-stream'
    }
    
    print(f'Uploading to: {upload_url}')
    
    try:
        response = requests.post(upload_url, headers=headers, data=file_content)
        print(f'Upload status: {response.status_code}')
        print(f'Upload response: {response.text}')
        
        if response.status_code in [200, 201]:
            print('✅ File uploaded successfully!')
            
            # Update database record
            db_url = f'{supabase_url}/rest/v1/ml_models?id=eq.1'
            db_headers = {
                'apikey': supabase_key,
                'Content-Type': 'application/json'
            }
            db_data = {
                'file_size': file_size,
                'file_hash': file_hash
            }
            
            db_response = requests.patch(db_url, headers=db_headers, json=db_data)
            print(f'Database update status: {db_response.status_code}')
            
            return True
        else:
            print('❌ Upload failed')
            return False
            
    except Exception as e:
        print(f'❌ Error: {e}')
        return False

if __name__ == '__main__':
    upload_model_to_supabase()
