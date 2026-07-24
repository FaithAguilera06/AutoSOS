# 🗄️ ML Model Database Storage Setup Guide

This guide explains how to set up and use the Supabase database storage system for your YOLOv8 and FaceNet models in AutoSOS.

## 📋 Overview

Instead of storing large model files locally, you can now:
- ✅ Store models in Supabase database with versioning
- ✅ Download and cache models automatically
- ✅ Update models without app updates
- ✅ Track model usage and performance
- ✅ Manage multiple model versions

## 🚀 Quick Setup

### 1. **Run Database Schema**

First, apply the database schema to your Supabase project:

```sql
-- Run the model-storage-schema.sql file in your Supabase SQL editor
-- This creates the necessary tables and functions
```

### 2. **Set Environment Variables**

Add these to your environment or `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# For production, also set:
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. **Upload Your Models**

Use the model management script to upload your trained models:

```bash
# Upload YOLOv8 model
python model_management.py \
  --supabase-url "your_supabase_url" \
  --supabase-key "your_supabase_key" \
  upload \
  --file "runs/detect/train3/weights/best.pt" \
  --name "Motorcycle Diagnostic" \
  --type "yolov8" \
  --version "1.0.0" \
  --description "YOLOv8 model for motorcycle issue detection" \
  --default

# Upload FaceNet model
python model_management.py \
  --supabase-url "your_supabase_url" \
  --supabase-key "your_supabase_key" \
  upload \
  --file "models/facenet_mobile.tflite" \
  --name "Payment Authentication" \
  --type "facenet" \
  --version "1.0.0" \
  --description "FaceNet model for payment authentication" \
  --default
```

## 🔧 Configuration

### **Angular/Ionic App Configuration**

Update your `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'your_supabase_url',
  supabaseAnonKey: 'your_supabase_anon_key',
  // ... other config
};
```

### **Backend Service Configuration**

The services will automatically detect Supabase credentials from environment variables:

```python
# YOLOv8 Service
export SUPABASE_URL="your_supabase_url"
export SUPABASE_ANON_KEY="your_supabase_key"
python backend/yolo_inference_service.py

# FaceNet Service  
export SUPABASE_URL="your_supabase_url"
export SUPABASE_ANON_KEY="your_supabase_key"
python facial_recognition/facial_recognition_api.py
```

## 📱 Usage Examples

### **Angular Service Usage**

```typescript
import { ModelStorageService } from './services/model-storage.service';

constructor(private modelService: ModelStorageService) {}

// Get active YOLOv8 model
async loadYOLOModel() {
  const model = await this.modelService.getActiveModel('yolov8').toPromise();
  if (model) {
    console.log('Model loaded:', model.model_name, model.version);
  }
}

// Download and cache model
async downloadModel() {
  const model = await this.modelService.getActiveModel('yolov8').toPromise();
  if (model) {
    const modelData = await this.modelService.downloadModel(model).toPromise();
    // Use modelData for inference
  }
}
```

### **Python Service Usage**

```python
from model_download_service import ModelDownloadService

# Initialize service
service = ModelDownloadService(
    supabase_url="your_supabase_url",
    supabase_key="your_supabase_key"
)

# Load YOLOv8 model
yolo_model = service.load_yolo_model('yolov8')
if yolo_model:
    # Run inference
    results = yolo_model(image)
    
    # Log usage
    service.log_model_usage(
        model_id=1,
        inference_time_ms=150,
        confidence_score=0.85,
        success=True
    )

# Load FaceNet model
facenet_model = service.load_facenet_model('facenet')
if facenet_model:
    # Run facial recognition
    # ... inference code ...
```

## 🛠️ Model Management

### **List Models**

```bash
# List all models
python model_management.py \
  --supabase-url "your_supabase_url" \
  --supabase-key "your_supabase_key" \
  list

# List specific model type
python model_management.py \
  --supabase-url "your_supabase_url" \
  --supabase-key "your_supabase_key" \
  list --type yolov8
```

### **Cache Management**

```bash
# View cache statistics
python model_management.py \
  --supabase-url "your_supabase_url" \
  --supabase-key "your_supabase_key" \
  cache stats

# Clean up old cache (older than 30 days)
python model_management.py \
  --supabase-url "your_supabase_url" \
  --supabase-key "your_supabase_key" \
  cache cleanup --days 30
```

### **Update Models**

```bash
# Upload new version
python model_management.py \
  --supabase-url "your_supabase_url" \
  --supabase-key "your_supabase_key" \
  upload \
  --file "new_model.pt" \
  --name "Motorcycle Diagnostic" \
  --type "yolov8" \
  --version "1.1.0" \
  --default

# Services will automatically load the new version on restart
```

## 🔄 Automatic Model Updates

### **Backend Services**

The services automatically:
1. Check for model updates on startup
2. Download and cache new models
3. Fall back to local models if database is unavailable
4. Log usage statistics

### **Frontend App**

The Angular service provides:
- Model caching with automatic updates
- Offline fallback support
- Cache status monitoring
- Background model downloads

## 📊 Monitoring & Analytics

### **Model Usage Tracking**

The system automatically tracks:
- Inference times
- Confidence scores
- Success/failure rates
- Input image sizes
- User interactions

### **View Usage Statistics**

```bash
# Get usage stats via API
curl "http://localhost:8000/model-usage-stats?days=30"

# Or check in Supabase dashboard
# Query: SELECT * FROM model_usage_logs WHERE created_at > NOW() - INTERVAL '30 days';
```

## 🚨 Troubleshooting

### **Common Issues**

1. **Models not loading from database**
   - Check Supabase credentials
   - Verify model exists in database
   - Check network connectivity

2. **Cache issues**
   - Clear cache: `python model_management.py cache cleanup --days 0`
   - Check disk space
   - Verify file permissions

3. **Performance issues**
   - Monitor cache hit rates
   - Check model file sizes
   - Optimize model configurations

### **Fallback Behavior**

The system gracefully falls back to local models if:
- Supabase is unavailable
- Model download fails
- Database connection issues

## 🔒 Security Considerations

1. **Model Access**: Models are stored in Supabase storage with proper RLS policies
2. **API Keys**: Use service role key only for admin operations
3. **File Integrity**: SHA256 hashes verify model integrity
4. **Access Logging**: All model usage is logged for audit

## 📈 Performance Benefits

- **Reduced App Size**: No large model files in app bundle
- **Faster Updates**: Push new models without app store updates
- **Better Caching**: Intelligent local caching reduces download times
- **Version Control**: Easy rollback to previous model versions
- **Analytics**: Track model performance and usage patterns

## 🎯 Next Steps

1. Upload your trained models using the management script
2. Update your services to use the new database storage
3. Monitor model usage and performance
4. Set up automated model update workflows
5. Configure proper backup and disaster recovery

---

**Need Help?** Check the logs for detailed error messages and ensure your Supabase configuration is correct.
