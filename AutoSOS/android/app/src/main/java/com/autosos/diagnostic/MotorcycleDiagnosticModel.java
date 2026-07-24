package com.autosos.diagnostic;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.graphics.Bitmap;
import android.util.Log;

import org.tensorflow.lite.Interpreter;
import org.tensorflow.lite.support.image.TensorImage;
import org.tensorflow.lite.support.image.ImageProcessor;
import org.tensorflow.lite.support.image.ops.ResizeOp;
import org.tensorflow.lite.support.image.ops.Rot90Op;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.util.ArrayList;
import java.util.List;

/**
 * YOLOv8 Motorcycle Diagnostic Model for Android
 * Detects: Broken Headlights, Broken Side Mirror, Flat Tire, Oil Leak
 */
public class MotorcycleDiagnosticModel {
    
    private static final String TAG = "MotorcycleDiagnostic";
    private static final String MODEL_PATH = "motorcycle_diagnostic.tflite";
    private static final int INPUT_SIZE = 640;
    private static final int NUM_CLASSES = 4;
    private static final float CONFIDENCE_THRESHOLD = 0.7f;
    
    // Class labels
    private static final String[] CLASS_LABELS = {
        "broken_headlights_tail_lights",
        "broken_side_mirror", 
        "flat_tire",
        "oil_leak"
    };
    
    private static final String[] CLASS_DISPLAY_NAMES = {
        "Broken Headlights/Tail Lights",
        "Broken Side Mirror",
        "Flat Tire", 
        "Oil Leak"
    };
    
    private Interpreter tflite;
    private ImageProcessor imageProcessor;
    private Context context;
    private boolean isInitialized = false;
    
    public MotorcycleDiagnosticModel(Context context) {
        this.context = context;
        setupImageProcessor();
    }
    
    /**
     * Initialize the model
     */
    public boolean initialize() {
        try {
            // Load model
            MappedByteBuffer modelBuffer = loadModelFile();
            
            // Initialize TensorFlow Lite interpreter
            Interpreter.Options options = new Interpreter.Options();
            options.setNumThreads(4); // Use 4 threads for better performance
            options.setUseNNAPI(true); // Use Android Neural Networks API if available
            
            tflite = new Interpreter(modelBuffer, options);
            
            isInitialized = true;
            Log.i(TAG, "YOLOv8 Motorcycle Diagnostic Model initialized successfully");
            return true;
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize model", e);
            isInitialized = false;
            return false;
        }
    }
    
    /**
     * Setup image processor for input preprocessing
     */
    private void setupImageProcessor() {
        imageProcessor = new ImageProcessor.Builder()
            .add(new ResizeOp(INPUT_SIZE, INPUT_SIZE, ResizeOp.ResizeMethod.BILINEAR))
            .build();
    }
    
    /**
     * Load the TensorFlow Lite model from assets
     */
    private MappedByteBuffer loadModelFile() throws IOException {
        AssetFileDescriptor fileDescriptor = context.getAssets().openFd(MODEL_PATH);
        FileInputStream inputStream = new FileInputStream(fileDescriptor.getFileDescriptor());
        FileChannel fileChannel = inputStream.getChannel();
        long startOffset = fileDescriptor.getStartOffset();
        long declaredLength = fileDescriptor.getDeclaredLength();
        return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength);
    }
    
    /**
     * Detect motorcycle issues in the given bitmap
     */
    public List<Detection> detectIssues(Bitmap bitmap) {
        if (!isInitialized) {
            Log.e(TAG, "Model not initialized");
            return new ArrayList<>();
        }
        
        try {
            // Preprocess image
            TensorImage tensorImage = new TensorImage();
            tensorImage.load(bitmap);
            tensorImage = imageProcessor.process(tensorImage);
            
            // Prepare input and output tensors
            float[][][][] input = new float[1][INPUT_SIZE][INPUT_SIZE][3];
            float[][][] output = new float[1][25200][9]; // YOLOv8 output format
            
            // Copy preprocessed image to input tensor
            float[] imageArray = tensorImage.getTensorBuffer().getFloatArray();
            int pixelIndex = 0;
            for (int i = 0; i < INPUT_SIZE; i++) {
                for (int j = 0; j < INPUT_SIZE; j++) {
                    input[0][i][j][0] = imageArray[pixelIndex] / 255.0f; // Normalize R
                    input[0][i][j][1] = imageArray[pixelIndex + 1] / 255.0f; // Normalize G
                    input[0][i][j][2] = imageArray[pixelIndex + 2] / 255.0f; // Normalize B
                    pixelIndex += 3;
                }
            }
            
            // Run inference
            tflite.run(input, output);
            
            // Post-process results
            return postProcessResults(output[0], bitmap.getWidth(), bitmap.getHeight());
            
        } catch (Exception e) {
            Log.e(TAG, "Error during inference", e);
            return new ArrayList<>();
        }
    }
    
    /**
     * Post-process YOLOv8 output to extract detections
     */
    private List<Detection> postProcessResults(float[][] output, int originalWidth, int originalHeight) {
        List<Detection> detections = new ArrayList<>();
        
        for (int i = 0; i < output.length; i++) {
            float[] detection = output[i];
            
            // YOLOv8 output format: [x_center, y_center, width, height, confidence, class0_score, class1_score, ...]
            float xCenter = detection[0];
            float yCenter = detection[1];
            float width = detection[2];
            float height = detection[3];
            float objectConfidence = detection[4];
            
            // Find best class
            int bestClass = -1;
            float bestClassScore = 0;
            for (int j = 0; j < NUM_CLASSES; j++) {
                float classScore = detection[5 + j];
                if (classScore > bestClassScore) {
                    bestClassScore = classScore;
                    bestClass = j;
                }
            }
            
            // Calculate final confidence
            float finalConfidence = objectConfidence * bestClassScore;
            
            if (finalConfidence >= CONFIDENCE_THRESHOLD && bestClass != -1) {
                // Convert from normalized coordinates to pixel coordinates
                float x1 = (xCenter - width / 2) * originalWidth / INPUT_SIZE;
                float y1 = (yCenter - height / 2) * originalHeight / INPUT_SIZE;
                float x2 = (xCenter + width / 2) * originalWidth / INPUT_SIZE;
                float y2 = (yCenter + height / 2) * originalHeight / INPUT_SIZE;
                
                Detection det = new Detection(
                    bestClass,
                    CLASS_LABELS[bestClass],
                    CLASS_DISPLAY_NAMES[bestClass],
                    finalConfidence,
                    x1, y1, x2, y2,
                    xCenter * originalWidth / INPUT_SIZE,
                    yCenter * originalHeight / INPUT_SIZE
                );
                
                detections.add(det);
                Log.d(TAG, String.format("Detected: %s (%.2f confidence) at (%.1f, %.1f)", 
                    det.displayName, det.confidence, det.centerX, det.centerY));
            }
        }
        
        return detections;
    }
    
    /**
     * Release resources
     */
    public void close() {
        if (tflite != null) {
            tflite.close();
            tflite = null;
        }
        isInitialized = false;
        Log.i(TAG, "Model resources released");
    }
    
    /**
     * Check if model is ready for inference
     */
    public boolean isReady() {
        return isInitialized;
    }
    
    /**
     * Detection result class
     */
    public static class Detection {
        public int classId;
        public String className;
        public String displayName;
        public float confidence;
        public float x1, y1, x2, y2; // Bounding box
        public float centerX, centerY; // Center point
        
        public Detection(int classId, String className, String displayName, 
                        float confidence, float x1, float y1, float x2, float y2,
                        float centerX, float centerY) {
            this.classId = classId;
            this.className = className;
            this.displayName = displayName;
            this.confidence = confidence;
            this.x1 = x1;
            this.y1 = y1;
            this.x2 = x2;
            this.y2 = y2;
            this.centerX = centerX;
            this.centerY = centerY;
        }
        
        public String getSeverity() {
            switch (className) {
                case "flat_tire":
                case "oil_leak":
                    return "Critical";
                case "broken_headlights_tail_lights":
                    return "High";
                case "broken_side_mirror":
                    return "Medium";
                default:
                    return "Unknown";
            }
        }
        
        public String getRecommendation() {
            switch (className) {
                case "flat_tire":
                    return "Stop riding immediately. Replace or repair the tire before continuing.";
                case "oil_leak":
                    return "Identify the source of the leak and repair immediately. Check oil levels.";
                case "broken_headlights_tail_lights":
                    return "Replace damaged lights immediately. Check electrical connections.";
                case "broken_side_mirror":
                    return "Replace the damaged mirror and ensure proper adjustment.";
                default:
                    return "Have a qualified mechanic inspect and repair the issue.";
            }
        }
        
        public double getEstimatedCost() {
            switch (className) {
                case "flat_tire":
                    return 2000.0;
                case "oil_leak":
                    return 3000.0;
                case "broken_headlights_tail_lights":
                    return 1500.0;
                case "broken_side_mirror":
                    return 800.0;
                default:
                    return 1000.0;
            }
        }
    }
}
