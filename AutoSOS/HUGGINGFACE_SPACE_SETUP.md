# 🚀 Hugging Face Space Setup Guide for AutoSOS YOLOv8

This guide will help you create and deploy your AutoSOS YOLOv8 motorcycle diagnostic app on Hugging Face Spaces.

## 📋 Prerequisites

1. **Hugging Face Account**: Sign up at [huggingface.co](https://huggingface.co)
2. **Git**: Install Git for version control
3. **Docker**: For local testing (optional)

## 🎯 Step-by-Step Setup

### Step 1: Create a New Space

1. Go to [Hugging Face Spaces](https://huggingface.co/spaces)
2. Click **"Create new Space"**
3. Fill in the details:
   - **Space name**: `autosos-yolov8-motorcycle-diagnostic`
   - **License**: MIT
   - **SDK**: **🐳 Docker** (This is what you should pick!)
   - **Hardware**: CPU Basic (or GPU if you have credits)
   - **Visibility**: Public

### Step 2: Why Choose Docker?

**✅ Docker is the best choice because:**
- **Full Control**: Install any dependencies (OpenCV, Ultralytics, etc.)
- **Custom Environment**: Perfect for your specific YOLOv8 setup
- **GPU Support**: Can utilize GPU acceleration
- **Consistent**: Same environment locally and on Hugging Face
- **Flexible**: Easy to modify and extend

**❌ Why not Gradio or Static:**
- **Gradio**: Limited to basic Gradio apps, can't install custom dependencies
- **Static**: Only for static websites, no backend processing

### Step 3: Upload Files

After creating the space, upload these files:

#### Required Files:
1. **`Dockerfile`** - Container configuration
2. **`requirements.txt`** - Python dependencies
3. **`app.py`** - Main Gradio application
4. **`huggingface_yolo_integration.py`** - YOLOv8 service
5. **`README.md`** - Space description

#### Optional Files:
- **`.gitignore`** - Git ignore rules
- **`LICENSE`** - License file
- **`CONTRIBUTING.md`** - Contribution guidelines

### Step 4: File Structure

Your Hugging Face Space should have this structure:
```
autosos-yolov8-motorcycle-diagnostic/
├── Dockerfile
├── requirements.txt
├── app.py
├── huggingface_yolo_integration.py
├── README.md
├── .gitignore
└── LICENSE
```

### Step 5: Configure Space Settings

In your Space settings:

1. **Hardware**: 
   - Start with **CPU Basic** (free)
   - Upgrade to **CPU Upgrade** or **GPU** if needed

2. **Environment Variables** (if needed):
   - `HF_HOME=/app/cache`
   - `PYTHONPATH=/app`

3. **Storage**: 
   - Enable persistent storage if you need to cache models

## 🔧 Local Testing

Before deploying, test locally:

### Option 1: Docker Testing
```bash
# Build the Docker image
docker build -t autosos-yolov8 .

# Run locally
docker run -p 7860:7860 autosos-yolov8
```

### Option 2: Direct Python Testing
```bash
# Install dependencies
pip install -r requirements.txt

# Run the app
python app.py
```

Visit `http://localhost:7860` to test your app.

## 🚀 Deployment Process

### Automatic Deployment
1. **Push to Git**: Hugging Face automatically builds when you push to the repository
2. **Monitor Logs**: Check the "Logs" tab in your Space for build progress
3. **Test Live**: Once built, test your app on the live URL

### Manual Deployment
1. **Upload Files**: Use the web interface to upload files
2. **Trigger Build**: Click "Rebuild" in the Space settings
3. **Wait for Build**: Monitor the build process in logs

## 📊 Monitoring & Maintenance

### Build Logs
- Check the **"Logs"** tab for build and runtime logs
- Look for errors in the build process
- Monitor memory usage and performance

### Performance Optimization
- **Model Caching**: Cache models in `/app/cache` directory
- **Image Optimization**: Resize images before processing
- **Memory Management**: Monitor memory usage in logs

### Updates
- **Code Changes**: Push changes to Git repository
- **Dependency Updates**: Update `requirements.txt` and rebuild
- **Model Updates**: Update model loading logic in `app.py`

## 🔍 Troubleshooting

### Common Issues

#### 1. Build Failures
**Problem**: Docker build fails
**Solution**: 
- Check `Dockerfile` syntax
- Verify all files are uploaded
- Check build logs for specific errors

#### 2. Model Loading Issues
**Problem**: Models fail to load
**Solution**:
- Check internet connectivity in container
- Verify model names in code
- Add fallback models

#### 3. Memory Issues
**Problem**: Out of memory errors
**Solution**:
- Use smaller models
- Optimize image processing
- Upgrade to higher memory tier

#### 4. Slow Performance
**Problem**: App is slow
**Solution**:
- Use GPU hardware if available
- Optimize model loading
- Cache models locally

### Debug Commands

Add these to your `app.py` for debugging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Add debug info
print(f"Python version: {sys.version}")
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
```

## 🎯 Best Practices

### 1. Model Selection
- **Start Simple**: Use `yolov8n.pt` for faster loading
- **Progressive Enhancement**: Add more complex models later
- **Fallback Strategy**: Always have a fallback model

### 2. Error Handling
- **Graceful Degradation**: Handle model loading failures
- **User Feedback**: Show clear error messages
- **Logging**: Log errors for debugging

### 3. Performance
- **Model Caching**: Cache models to avoid re-downloading
- **Image Optimization**: Resize images before processing
- **Async Processing**: Use async for better performance

### 4. User Experience
- **Loading States**: Show loading indicators
- **Clear Instructions**: Provide usage instructions
- **Example Images**: Include example images

## 📈 Scaling & Upgrades

### Hardware Upgrades
- **CPU Basic**: Free tier, good for testing
- **CPU Upgrade**: Better performance, paid
- **GPU**: Best performance, requires credits

### Model Improvements
- **Custom Training**: Train models on your specific data
- **Model Ensembles**: Use multiple models for better accuracy
- **Post-processing**: Add custom post-processing logic

## 🔗 Integration with AutoSOS

### API Integration
Your Hugging Face Space can be integrated with your AutoSOS app:

```typescript
// In your Angular service
const HUGGINGFACE_SPACE_URL = 'https://your-username-autosos-yolov8-motorcycle-diagnostic.hf.space';

async detectMotorcycleIssues(image: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', image);
  
  const response = await fetch(`${HUGGINGFACE_SPACE_URL}/detect`, {
    method: 'POST',
    body: formData
  });
  
  return response.json();
}
```

### Webhook Integration
Set up webhooks to receive detection results:
```python
# In your app.py
@app.post("/webhook")
async def webhook_handler(data: dict):
    # Process detection results
    # Send to your AutoSOS backend
    pass
```

## 🎉 Success Checklist

- [ ] Space created with Docker SDK
- [ ] All files uploaded correctly
- [ ] Build completes successfully
- [ ] App loads and responds
- [ ] Model detection works
- [ ] Error handling works
- [ ] Performance is acceptable
- [ ] Integration with AutoSOS works

## 📞 Support

If you encounter issues:

1. **Check Logs**: Review build and runtime logs
2. **Hugging Face Docs**: [Spaces Documentation](https://huggingface.co/docs/hub/spaces)
3. **Community**: Ask in Hugging Face Discord or forums
4. **GitHub Issues**: Create issues in your repository

---

**Happy deploying! 🚀 Your AutoSOS YOLOv8 app will be live on Hugging Face Spaces!**
