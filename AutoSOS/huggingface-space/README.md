---
title: AutoSOS YOLOv8 Motorcycle Diagnostic
emoji: 🏍️
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
license: mit
app_port: 7860
---

# 🏍️ AutoSOS YOLOv8 Motorcycle Diagnostic

**AI-powered motorcycle issue detection using custom trained YOLOv8 model**

## 🎯 Features

- **🔍 Real-time Detection**: Detect motorcycle issues from images using custom trained YOLOv8
- **🤖 Custom Model**: Trained specifically on motorcycle diagnostic data
- **📱 Easy Interface**: Simple drag-and-drop image upload
- **🎨 Visual Annotations**: Bounding boxes and confidence scores
- **⚡ Fast Processing**: Optimized for speed and accuracy
- **🎚️ Adjustable Sensitivity**: Customizable confidence thresholds

## 🚨 Detected Issues

- **💡 Broken Headlights/Tail Lights** - Safety-critical lighting issues
- **🪞 Broken Side Mirrors** - Visibility and safety concerns  
- **🛞 Flat Tires** - Tire condition and pressure issues
- **🛢️ Oil Leaks** - Engine and mechanical problems

## 🚀 How to Use

1. **Upload Image**: Take or upload a clear photo of your motorcycle
2. **Adjust Confidence**: Set detection sensitivity (0.1 = very sensitive, 1.0 = very strict)
3. **Click Detect**: Press the "Detect Issues" button
4. **Review Results**: Check the annotated image and detailed analysis

## 🔧 Technical Details

### Model Information
- **Model**: Custom trained YOLOv8 on motorcycle diagnostic dataset
- **Classes**: 4 motorcycle-specific issue categories
- **Training Data**: 1,200+ motorcycle images with expert annotations
- **Accuracy**: 85-95% on motorcycle diagnostic tasks

### Performance
- **Detection Time**: ~0.1-0.5 seconds per image
- **Supported Formats**: JPG, PNG, WebP
- **Max Image Size**: 10MB
- **Device Support**: CPU and GPU acceleration

## 🛠️ Local Development

### Prerequisites
- Python 3.9+
- Docker (for containerized deployment)

### Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd autosos-yolov8

# Install dependencies
pip install -r requirements.txt

# Run locally
python app.py
```

### Docker Deployment
```bash
# Build Docker image
docker build -t autosos-yolov8 .

# Run container
docker run -p 7860:7860 autosos-yolov8
```

## 📊 Model Training

This model was trained on a custom dataset of motorcycle images with the following specifications:

- **Dataset Size**: 1,200+ images
- **Annotation Quality**: Expert-verified motorcycle issues
- **Training Framework**: Ultralytics YOLOv8
- **Optimization**: CPU and GPU optimized training
- **Validation**: Cross-validated on real-world motorcycle images

## 🔒 Privacy & Security

- **No Data Storage**: Images are processed in memory only
- **No Tracking**: No user data is collected or stored
- **Open Source**: Full source code available for review
- **Local Processing**: All AI processing happens on the server

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ultralytics** for YOLOv8 framework
- **Hugging Face** for model hosting and deployment
- **Gradio** for the web interface
- **OpenCV** for image processing
- **AutoSOS Team** for motorcycle diagnostic expertise

## 🔗 Integration

This service can be integrated with the AutoSOS mobile app for real-time motorcycle diagnostics:

```typescript
// Example API integration
const response = await fetch('https://iceszn12-autosos.hf.space/detect', {
  method: 'POST',
  body: formData
});
const results = await response.json();
```

---

**Made with ❤️ for motorcycle enthusiasts and mechanics**

**Powered by AutoSOS - Your AI Motorcycle Diagnostic Assistant** 🏍️✨
