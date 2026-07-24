package com.autosos.diagnostic;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.io.ByteArrayOutputStream;
import java.util.List;

/**
 * Capacitor Plugin for YOLOv8 Motorcycle Diagnostic
 */
@CapacitorPlugin(name = "MotorcycleDiagnostic")
public class DiagnosticPlugin extends Plugin {
    
    private static final String TAG = "DiagnosticPlugin";
    private MotorcycleDiagnosticModel diagnosticModel;
    
    @Override
    public void load() {
        super.load();
        
        // Initialize the diagnostic model
        diagnosticModel = new MotorcycleDiagnosticModel(getContext());
        boolean initialized = diagnosticModel.initialize();
        
        if (initialized) {
            Log.i(TAG, "Motorcycle Diagnostic Plugin loaded successfully");
        } else {
            Log.e(TAG, "Failed to initialize Motorcycle Diagnostic Plugin");
        }
    }
    
    /**
     * Check if the diagnostic model is ready
     */
    @PluginMethod
    public void isReady(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ready", diagnosticModel != null && diagnosticModel.isReady());
        call.resolve(ret);
    }
    
    /**
     * Analyze an image using YOLOv8 model
     */
    @PluginMethod
    public void analyzeImage(PluginCall call) {
        String imageData = call.getString("imageData");
        
        if (imageData == null || imageData.isEmpty()) {
            call.reject("Image data is required");
            return;
        }
        
        if (diagnosticModel == null || !diagnosticModel.isReady()) {
            call.reject("Diagnostic model not ready");
            return;
        }
        
        try {
            // Convert base64 to bitmap
            Bitmap bitmap = base64ToBitmap(imageData);
            
            if (bitmap == null) {
                call.reject("Failed to decode image");
                return;
            }
            
            // Run inference
            List<MotorcycleDiagnosticModel.Detection> detections = diagnosticModel.detectIssues(bitmap);
            
            // Convert results to JSON
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("detections", detectionsToJSArray(detections));
            result.put("count", detections.size());
            
            // Generate diagnosis summary
            if (!detections.isEmpty()) {
                MotorcycleDiagnosticModel.Detection primaryDetection = detections.get(0);
                JSObject diagnosis = new JSObject();
                diagnosis.put("issue", primaryDetection.displayName);
                diagnosis.put("severity", primaryDetection.getSeverity());
                diagnosis.put("recommendation", primaryDetection.getRecommendation());
                diagnosis.put("estimatedCost", primaryDetection.getEstimatedCost());
                diagnosis.put("description", generateDescription(detections));
                
                result.put("diagnosis", diagnosis);
            }
            
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Error during image analysis", e);
            call.reject("Analysis failed: " + e.getMessage());
        }
    }
    
    /**
     * Get model information
     */
    @PluginMethod
    public void getModelInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("modelName", "YOLOv8 Motorcycle Diagnostic");
        result.put("version", "1.0.0");
        result.put("inputSize", "640x640");
        result.put("classes", new String[]{
            "Broken Headlights/Tail Lights",
            "Broken Side Mirror", 
            "Flat Tire",
            "Oil Leak"
        });
        
        call.resolve(result);
    }
    
    /**
     * Convert base64 string to bitmap
     */
    private Bitmap base64ToBitmap(String base64String) {
        try {
            // Remove data URL prefix if present
            if (base64String.startsWith("data:image")) {
                base64String = base64String.split(",")[1];
            }
            
            byte[] decodedBytes = Base64.decode(base64String, Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
        } catch (Exception e) {
            Log.e(TAG, "Failed to decode base64 image", e);
            return null;
        }
    }
    
    /**
     * Convert detection list to JSArray
     */
    private JSArray detectionsToJSArray(List<MotorcycleDiagnosticModel.Detection> detections) {
        JSArray array = new JSArray();
        
        for (MotorcycleDiagnosticModel.Detection detection : detections) {
            JSObject obj = new JSObject();
            obj.put("class_id", detection.classId);
            obj.put("class_name", detection.className);
            obj.put("display_name", detection.displayName);
            obj.put("confidence", detection.confidence);
            
            // Bounding box
            JSObject bbox = new JSObject();
            bbox.put("x1", detection.x1);
            bbox.put("y1", detection.y1);
            bbox.put("x2", detection.x2);
            bbox.put("y2", detection.y2);
            obj.put("bbox", bbox);
            
            // Center point
            JSObject center = new JSObject();
            center.put("x", detection.centerX);
            center.put("y", detection.centerY);
            obj.put("center", center);
            
            // Additional info
            obj.put("severity", detection.getSeverity());
            obj.put("recommendation", detection.getRecommendation());
            obj.put("estimatedCost", detection.getEstimatedCost());
            
            array.put(obj);
        }
        
        return array;
    }
    
    /**
     * Generate description from multiple detections
     */
    private String generateDescription(List<MotorcycleDiagnosticModel.Detection> detections) {
        if (detections.isEmpty()) {
            return "No issues detected in the motorcycle.";
        }
        
        if (detections.size() == 1) {
            MotorcycleDiagnosticModel.Detection det = detections.get(0);
            return String.format("Detected %s with %.1f%% confidence. %s", 
                det.displayName, det.confidence * 100, det.getSeverity() + " severity issue.");
        }
        
        StringBuilder description = new StringBuilder();
        description.append(String.format("Detected %d issues: ", detections.size()));
        
        for (int i = 0; i < detections.size(); i++) {
            MotorcycleDiagnosticModel.Detection det = detections.get(i);
            description.append(det.displayName);
            if (i < detections.size() - 1) {
                description.append(", ");
            }
        }
        
        description.append(". Recommend immediate inspection.");
        return description.toString();
    }
    
    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (diagnosticModel != null) {
            diagnosticModel.close();
        }
    }
}
