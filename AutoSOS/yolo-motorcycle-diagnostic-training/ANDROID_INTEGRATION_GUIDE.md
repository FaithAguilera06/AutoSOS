# Android Integration Guide for Motorcycle Diagnostic YOLOv8 Model

## Overview
This guide explains how to integrate the trained YOLOv8 model for motorcycle diagnostic into your AutoSOS Android application. The model detects 4 specific motorcycle issues:

1. **Broken Headlights/Tail Lights** (Severity: Medium)
2. **Broken Side Mirror** (Severity: Low) 
3. **Flat Tire** (Severity: High)
4. **Oil Leak** (Severity: Critical)

## Model Specifications

- **Model**: YOLOv8n (nano) - optimized for mobile
- **Input Size**: 640x640 pixels
- **Classes**: 4 motorcycle issues
- **Output Formats**: TensorFlow Lite (.tflite), ONNX (.onnx)
- **Target Performance**: < 100ms inference time on Android

## Android Integration Steps

### 1. Add Dependencies to build.gradle

```gradle
// TensorFlow Lite for Android
implementation 'org.tensorflow:tensorflow-lite:2.13.0'
implementation 'org.tensorflow:tensorflow-lite-gpu:2.13.0'
implementation 'org.tensorflow:tensorflow-lite-support:0.4.4'

// OR ONNX Runtime for Android
implementation 'com.microsoft.onnxruntime:onnxruntime-android:1.15.1'

// Camera and image processing
implementation 'androidx.camera:camera-core:1.3.0'
implementation 'androidx.camera:camera-camera2:1.3.0'
implementation 'androidx.camera:camera-lifecycle:1.3.0'
implementation 'androidx.camera:camera-view:1.3.0'
```

### 2. Add Model Files to Assets

Place the exported model files in `app/src/main/assets/`:
```
app/src/main/assets/
├── motorcycle_diagnostic.tflite
├── motorcycle_diagnostic.onnx
└── labels.txt
```

### 3. Create Model Interface

```kotlin
// MotorcycleDiagnosticModel.kt
class MotorcycleDiagnosticModel(private val context: Context) {
    
    private var interpreter: Interpreter? = null
    private val classNames = arrayOf(
        "broken_headlights_tail_lights",
        "broken_side_mirror", 
        "flat_tire",
        "oil_leak"
    )
    
    private val classColors = intArrayOf(
        0xFFFFFF00,  // Yellow
        0xFFFFA500,  // Orange
        0xFFFF0000,  // Red
        0xFF800080   // Purple
    )
    
    fun initialize() {
        try {
            val modelFile = loadModelFile("motorcycle_diagnostic.tflite")
            interpreter = Interpreter(modelFile)
        } catch (e: Exception) {
            Log.e("Model", "Failed to initialize model", e)
        }
    }
    
    fun detectIssues(bitmap: Bitmap): List<Detection> {
        // Preprocess image
        val inputArray = preprocessImage(bitmap)
        
        // Run inference
        val outputArray = Array(1) { Array(25200) { FloatArray(9) } }
        interpreter?.run(inputArray, outputArray)
        
        // Postprocess results
        return postprocessResults(outputArray[0], bitmap.width, bitmap.height)
    }
    
    private fun preprocessImage(bitmap: Bitmap): Array<Array<FloatArray>> {
        val resizedBitmap = Bitmap.createScaledBitmap(bitmap, 640, 640, true)
        val inputArray = Array(1) { Array(640) { FloatArray(640) { FloatArray(3) } } }
        
        // Convert bitmap to normalized float array
        for (y in 0 until 640) {
            for (x in 0 until 640) {
                val pixel = resizedBitmap.getPixel(x, y)
                inputArray[0][y][x][0] = (pixel shr 16 and 0xFF) / 255.0f  // R
                inputArray[0][y][x][1] = (pixel shr 8 and 0xFF) / 255.0f   // G
                inputArray[0][y][x][2] = (pixel and 0xFF) / 255.0f         // B
            }
        }
        
        return inputArray
    }
    
    private fun postprocessResults(
        output: Array<FloatArray>, 
        imageWidth: Int, 
        imageHeight: Int
    ): List<Detection> {
        val detections = mutableListOf<Detection>()
        val confidenceThreshold = 0.5f
        
        for (detection in output) {
            val confidence = detection[4]
            if (confidence > confidenceThreshold) {
                val classId = detection[5].toInt()
                val x = detection[0] * imageWidth
                val y = detection[1] * imageHeight
                val width = detection[2] * imageWidth
                val height = detection[3] * imageHeight
                
                val boundingBox = RectF(
                    x - width / 2,
                    y - height / 2,
                    x + width / 2,
                    y + height / 2
                )
                
                detections.add(Detection(
                    className = classNames[classId],
                    confidence = confidence,
                    boundingBox = boundingBox,
                    color = classColors[classId]
                ))
            }
        }
        
        return detections
    }
    
    data class Detection(
        val className: String,
        val confidence: Float,
        val boundingBox: RectF,
        val color: Int
    )
}
```

### 4. Integrate with Camera

```kotlin
// DiagnosticCameraActivity.kt
class DiagnosticCameraActivity : AppCompatActivity() {
    
    private lateinit var cameraProvider: ProcessCameraProvider
    private lateinit var imageCapture: ImageCapture
    private lateinit var diagnosticModel: MotorcycleDiagnosticModel
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_diagnostic_camera)
        
        // Initialize model
        diagnosticModel = MotorcycleDiagnosticModel(this)
        diagnosticModel.initialize()
        
        // Setup camera
        setupCamera()
    }
    
    private fun setupCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            cameraProvider = cameraProviderFuture.get()
            bindCameraUseCases()
        }, ContextCompat.getMainExecutor(this))
    }
    
    private fun bindCameraUseCases() {
        val preview = Preview.Builder().build()
        val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
        
        imageCapture = ImageCapture.Builder()
            .setTargetResolution(Size(640, 640))
            .build()
        
        val imageAnalyzer = ImageAnalysis.Builder()
            .setTargetResolution(Size(640, 640))
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()
        
        imageAnalyzer.setAnalyzer(ContextCompat.getMainExecutor(this)) { imageProxy ->
            analyzeImage(imageProxy)
        }
        
        try {
            cameraProvider.unbindAll()
            cameraProvider.bindToLifecycle(
                this, cameraSelector, preview, imageCapture, imageAnalyzer
            )
        } catch (e: Exception) {
            Log.e("Camera", "Failed to bind camera use cases", e)
        }
    }
    
    private fun analyzeImage(imageProxy: ImageProxy) {
        val bitmap = imageProxyToBitmap(imageProxy)
        val detections = diagnosticModel.detectIssues(bitmap)
        
        runOnUiThread {
            displayDetections(detections)
        }
        
        imageProxy.close()
    }
    
    private fun displayDetections(detections: List<MotorcycleDiagnosticModel.Detection>) {
        // Update UI with detection results
        val resultText = StringBuilder()
        for (detection in detections) {
            resultText.append("${detection.className}: ${(detection.confidence * 100).toInt()}%\n")
        }
        
        // Update text view
        findViewById<TextView>(R.id.detectionResults).text = resultText.toString()
        
        // Draw bounding boxes on camera preview
        drawBoundingBoxes(detections)
    }
}
```

### 5. Update AutoSOS Diagnostic Integration

```kotlin
// Update your existing camera diagnostic page
class CameraPage : Fragment() {
    
    private lateinit var diagnosticModel: MotorcycleDiagnosticModel
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        // Initialize diagnostic model
        diagnosticModel = MotorcycleDiagnosticModel(requireContext())
        diagnosticModel.initialize()
        
        // Update your existing analyzeImage method
        analyzeImageButton.setOnClickListener {
            analyzeCurrentImage()
        }
    }
    
    private fun analyzeCurrentImage() {
        if (capturedImage != null) {
            val bitmap = base64ToBitmap(capturedImage)
            val detections = diagnosticModel.detectIssues(bitmap)
            
            // Update diagnosis result
            updateDiagnosisResult(detections)
        }
    }
    
    private fun updateDiagnosisResult(detections: List<MotorcycleDiagnosticModel.Detection>) {
        if (detections.isNotEmpty()) {
            val primaryDetection = detections.maxByOrNull { it.confidence }
            
            diagnosisResult = DiagnosisResult(
                issue = primaryDetection?.className ?: "Unknown Issue",
                severity = getSeverityLevel(primaryDetection?.className),
                description = generateDescription(detections),
                arAnalysis = "YOLOv8 detected ${detections.size} issues",
                recommendation = getRecommendation(primaryDetection?.className),
                estimatedCost = calculateEstimatedCost(detections)
            )
        }
    }
    
    private fun getSeverityLevel(className: String?): String {
        return when (className) {
            "broken_headlights_tail_lights" -> "Medium"
            "broken_side_mirror" -> "Low"
            "flat_tire" -> "High"
            "oil_leak" -> "Critical"
            else -> "Unknown"
        }
    }
    
    private fun getRecommendation(className: String?): String {
        return when (className) {
            "broken_headlights_tail_lights" -> "Replace broken headlights/tail lights immediately for safety"
            "broken_side_mirror" -> "Replace or repair side mirror for better visibility"
            "flat_tire" -> "Repair or replace flat tire before riding"
            "oil_leak" -> "Fix oil leak immediately - check engine and transmission"
            else -> "Consult a mechanic for proper diagnosis"
        }
    }
}
```

## Performance Optimization

### 1. Model Optimization
- Use TensorFlow Lite with quantization (INT8)
- Enable GPU acceleration if available
- Use model pruning for smaller size

### 2. Image Processing
- Resize images to 640x640 before inference
- Use efficient bitmap operations
- Implement image caching

### 3. Memory Management
- Reuse model interpreter instances
- Properly close image proxies
- Implement garbage collection optimization

## Testing and Validation

### 1. Unit Tests
```kotlin
@Test
fun testModelInitialization() {
    val model = MotorcycleDiagnosticModel(context)
    model.initialize()
    assertNotNull(model.interpreter)
}

@Test
fun testIssueDetection() {
    val model = MotorcycleDiagnosticModel(context)
    model.initialize()
    
    val testBitmap = createTestBitmap()
    val detections = model.detectIssues(testBitmap)
    
    assertTrue(detections.isNotEmpty())
}
```

### 2. Performance Testing
- Test inference time on different Android devices
- Monitor memory usage during inference
- Validate accuracy on real motorcycle images

## Deployment Checklist

- [ ] Model files added to assets
- [ ] Dependencies added to build.gradle
- [ ] Model initialization implemented
- [ ] Camera integration completed
- [ ] UI updates for detection results
- [ ] Error handling implemented
- [ ] Performance optimization applied
- [ ] Testing completed on target devices
- [ ] Integration with existing AutoSOS flow

## Troubleshooting

### Common Issues

1. **Model not loading**: Check file paths and TensorFlow Lite version
2. **Slow inference**: Enable GPU acceleration or reduce input size
3. **Memory issues**: Implement proper resource cleanup
4. **Inaccurate detections**: Retrain model with more diverse data

### Performance Tips

- Use background threads for model inference
- Implement result caching for repeated images
- Optimize image preprocessing pipeline
- Consider model quantization for better performance

## Support

For issues or questions:
1. Check the generated integration code
2. Review TensorFlow Lite documentation
3. Test with sample images first
4. Validate model performance on target devices

The motorcycle diagnostic model is now ready for Android integration! 🏍️📱
