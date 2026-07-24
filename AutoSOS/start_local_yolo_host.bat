@echo off
title AutoSOS Local YOLO v8 Host
echo.
echo ===============================================
echo    🏍️ AutoSOS Local YOLO v8 Host Service
echo ===============================================
echo.

REM Get the current directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo 📍 Working Directory: %SCRIPT_DIR%
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.9+ and try again
    pause
    exit /b 1
)

echo ✅ Python is installed
echo.

REM Check if required packages are installed
echo 🔍 Checking required packages...
python -c "import fastapi, ultralytics, cv2, numpy, pillow" >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing required packages...
    pip install fastapi uvicorn ultralytics opencv-python numpy pillow
    if errorlevel 1 (
        echo ❌ Failed to install packages
        pause
        exit /b 1
    )
    echo ✅ Packages installed successfully
) else (
    echo ✅ All required packages are installed
)

echo.

REM Get local IP address
echo 🌐 Getting local IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set "LOCAL_IP=%%b"
        goto :ip_found
    )
)
:ip_found
if "%LOCAL_IP%"=="" set "LOCAL_IP=127.0.0.1"

echo 📍 Local IP Address: %LOCAL_IP%
echo.

REM Check if port 8000 is available
echo 🔍 Checking if port 8000 is available...
netstat -an | findstr ":8000 " >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  Port 8000 is already in use
    echo Please close any other services using port 8000
    pause
    exit /b 1
)

echo ✅ Port 8000 is available
echo.

REM Create a simple local YOLO service script
echo 📝 Creating local YOLO service script...
(
echo import os
echo import sys
echo from fastapi import FastAPI, File, UploadFile, HTTPException
echo from fastapi.middleware.cors import CORSMiddleware
echo import cv2
echo import numpy as np
echo from ultralytics import YOLO
echo import io
echo from PIL import Image
echo import base64
echo import time
echo import logging
echo.
echo # Configure logging
echo logging.basicConfig(level=logging.INFO^)
echo logger = logging.getLogger(__name__^)
echo.
echo # Initialize FastAPI app
echo app = FastAPI(title="AutoSOS Local YOLO Service"^)
echo.
echo # Add CORS middleware
echo app.add_middleware(
echo     CORSMiddleware,
echo     allow_origins=["*"],
echo     allow_credentials=True,
echo     allow_methods=["*"],
echo     allow_headers=["*"],
echo ^)
echo.
echo # Global model variable
echo model = None
echo.
echo # Class names for motorcycle issues
echo CLASS_NAMES = {
echo     0: "broken_headlights_tail_lights",
echo     1: "broken_side_mirror", 
echo     2: "flat_tire",
echo     3: "oil_leak"
echo }
echo.
echo CLASS_DISPLAY_NAMES = {
echo     0: "Broken Headlights/Tail Lights",
echo     1: "Broken Side Mirror",
echo     2: "Flat Tire", 
echo     3: "Oil Leak"
echo }
echo.
echo CLASS_COLORS = {
echo     0: ^(255, 255, 0^),    # Yellow
echo     1: ^(255, 165, 0^),    # Orange
echo     2: ^(0, 0, 255^),      # Red
echo     3: ^(128, 0, 128^)     # Purple
echo }
echo.
echo @app.on_event^("startup"^)
echo async def startup_event^(^):
echo     global model
echo     try:
echo         # Try to load local model first
echo         model_path = os.path.join^("yolo-motorcycle-diagnostic-training", "runs", "detect", "train3", "weights", "best.pt"^)
echo         if os.path.exists^(model_path^):
echo             model = YOLO^(model_path^)
echo             logger.info^(f"✅ Loaded local model: {model_path}"^)
echo         else:
echo             # Fallback to default YOLOv8 model
echo             model = YOLO^("yolov8n.pt"^)
echo             logger.info^("✅ Loaded default YOLOv8 model"^)
echo     except Exception as e:
echo         logger.error^(f"❌ Failed to load model: {e}"^)
echo         # Try default model as last resort
echo         try:
echo             model = YOLO^("yolov8n.pt"^)
echo             logger.info^("✅ Loaded default YOLOv8 model as fallback"^)
echo         except Exception as e2:
echo             logger.error^(f"❌ Failed to load any model: {e2}"^)
echo.
echo @app.get^("/health"^)
echo async def health_check^(^):
echo     return {
echo         "status": "healthy",
echo         "model_loaded": model is not None,
echo         "service_type": "local_yolo_host",
echo         "ip_address": "%LOCAL_IP%",
echo         "port": 8000,
echo         "classes": CLASS_DISPLAY_NAMES
echo     }
echo.
echo @app.post^("/predict"^)
echo async def predict_motorcycle_issues^(
echo     file: UploadFile = File^(...^),
echo     confidence_threshold: float = 0.2,
echo     return_image: bool = False
echo ^):
echo     if model is None:
echo         raise HTTPException^(status_code=500, detail="Model not loaded"^)
echo     
echo     try:
echo         # Read and process image
echo         image_bytes = await file.read^(^)
echo         image = Image.open^(io.BytesIO^(image_bytes^)^)
echo         image_array = np.array^(image^)
echo         
echo         # Convert RGB to BGR for OpenCV
echo         if len^(image_array.shape^) == 3 and image_array.shape[2] == 3:
echo             image_array = cv2.cvtColor^(image_array, cv2.COLOR_RGB2BGR^)
echo         
echo         # Run inference
echo         start_time = time.time^(^)
echo         results = model^(image_array, conf=confidence_threshold^)
echo         inference_time_ms = int^((time.time^(^) - start_time^) * 1000^)
echo         
echo         # Process results
echo         detections = []
echo         annotated_image = image_array.copy^(^)
echo         
echo         for result in results:
echo             boxes = result.boxes
echo             if boxes is not None:
echo                 for box in boxes:
echo                     x1, y1, x2, y2 = box.xyxy[0].cpu^(^).numpy^(^)
echo                     confidence = box.conf[0].cpu^(^).numpy^(^)
echo                     class_id = int^(box.cls[0].cpu^(^).numpy^(^)^)
echo                     
echo                     class_name = CLASS_NAMES.get^(class_id, f"unknown_{class_id}"^)
echo                     display_name = CLASS_DISPLAY_NAMES.get^(class_id, f"Unknown Issue {class_id}"^)
echo                     color = CLASS_COLORS.get^(class_id, ^(0, 255, 0^)^)
echo                     
echo                     detection = {
echo                         "class_id": class_id,
echo                         "class_name": class_name,
echo                         "display_name": display_name,
echo                         "confidence": float^(confidence^),
echo                         "bbox": {
echo                             "x1": float^(x1^),
echo                             "y1": float^(y1^),
echo                             "x2": float^(x2^),
echo                             "y2": float^(y2^)
echo                         },
echo                         "center": {
echo                             "x": float^((x1 + x2^) / 2^),
echo                             "y": float^((y1 + y2^) / 2^)
echo                         }
echo                     }
echo                     detections.append^(detection^)
echo                     
echo                     if return_image:
echo                         cv2.rectangle^(annotated_image, ^(int^(x1^), int^(y1^)^), ^(int^(x2^), int^(y2^)^), color, 2^)
echo                         label = f"{display_name}: {confidence:.2f}"
echo                         cv2.putText^(annotated_image, label, ^(int^(x1^), int^(y1^) - 10^), 
echo                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2^)
echo         
echo         response = {
echo             "success": True,
echo             "detections": detections,
echo             "total_detections": len^(detections^),
echo             "inference_time_ms": inference_time_ms,
echo             "image_info": {
echo                 "width": image_array.shape[1],
echo                 "height": image_array.shape[0],
echo                 "channels": image_array.shape[2] if len^(image_array.shape^) == 3 else 1
echo             },
echo             "confidence_threshold": confidence_threshold
echo         }
echo         
echo         if return_image and len^(detections^) > 0:
echo             _, buffer = cv2.imencode^('.jpg', annotated_image^)
echo             image_base64 = base64.b64encode^(buffer^).decode^('utf-8'^)
echo             response["annotated_image"] = f"data:image/jpeg;base64,{image_base64}"
echo         
echo         return response
echo         
echo     except Exception as e:
echo         logger.error^(f"Error during prediction: {e}"^)
echo         raise HTTPException^(status_code=500, detail=f"Prediction failed: {str^(e^)}"^)
echo.
echo @app.post^("/predict-base64"^)
echo async def predict_from_base64^(
echo     image_data: str,
echo     confidence_threshold: float = 0.2,
echo     return_image: bool = False
echo ^):
echo     if model is None:
echo         raise HTTPException^(status_code=500, detail="Model not loaded"^)
echo     
echo     try:
echo         # Decode base64 image
echo         if image_data.startswith^('data:image'^):
echo             image_data = image_data.split^(','^)[1]
echo         
echo         image_bytes = base64.b64decode^(image_data^)
echo         image = Image.open^(io.BytesIO^(image_bytes^)^)
echo         image_array = np.array^(image^)
echo         
echo         # Convert RGB to BGR for OpenCV
echo         if len^(image_array.shape^) == 3 and image_array.shape[2] == 3:
echo             image_array = cv2.cvtColor^(image_array, cv2.COLOR_RGB2BGR^)
echo         
echo         # Run inference
echo         start_time = time.time^(^)
echo         results = model^(image_array, conf=confidence_threshold^)
echo         inference_time_ms = int^((time.time^(^) - start_time^) * 1000^)
echo         
echo         # Process results ^(same as predict endpoint^)
echo         detections = []
echo         annotated_image = image_array.copy^(^)
echo         
echo         for result in results:
echo             boxes = result.boxes
echo             if boxes is not None:
echo                 for box in boxes:
echo                     x1, y1, x2, y2 = box.xyxy[0].cpu^(^).numpy^(^)
echo                     confidence = box.conf[0].cpu^(^).numpy^(^)
echo                     class_id = int^(box.cls[0].cpu^(^).numpy^(^)^)
echo                     
echo                     class_name = CLASS_NAMES.get^(class_id, f"unknown_{class_id}"^)
echo                     display_name = CLASS_DISPLAY_NAMES.get^(class_id, f"Unknown Issue {class_id}"^)
echo                     color = CLASS_COLORS.get^(class_id, ^(0, 255, 0^)^)
echo                     
echo                     detection = {
echo                         "class_id": class_id,
echo                         "class_name": class_name,
echo                         "display_name": display_name,
echo                         "confidence": float^(confidence^),
echo                         "bbox": {
echo                             "x1": float^(x1^),
echo                             "y1": float^(y1^),
echo                             "x2": float^(x2^),
echo                             "y2": float^(y2^)
echo                         },
echo                         "center": {
echo                             "x": float^((x1 + x2^) / 2^),
echo                             "y": float^((y1 + y2^) / 2^)
echo                         }
echo                     }
echo                     detections.append^(detection^)
echo                     
echo                     if return_image:
echo                         cv2.rectangle^(annotated_image, ^(int^(x1^), int^(y1^)^), ^(int^(x2^), int^(y2^)^), color, 2^)
echo                         label = f"{display_name}: {confidence:.2f}"
echo                         cv2.putText^(annotated_image, label, ^(int^(x1^), int^(y1^) - 10^), 
echo                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2^)
echo         
echo         response = {
echo             "success": True,
echo             "detections": detections,
echo             "total_detections": len^(detections^),
echo             "inference_time_ms": inference_time_ms,
echo             "image_info": {
echo                 "width": image_array.shape[1],
echo                 "height": image_array.shape[0],
echo                 "channels": image_array.shape[2] if len^(image_array.shape^) == 3 else 1
echo             },
echo             "confidence_threshold": confidence_threshold
echo         }
echo         
echo         if return_image and len^(detections^) > 0:
echo             _, buffer = cv2.imencode^('.jpg', annotated_image^)
echo             image_base64 = base64.b64encode^(buffer^).decode^('utf-8'^)
echo             response["annotated_image"] = f"data:image/jpeg;base64,{image_base64}"
echo         
echo         return response
echo         
echo     except Exception as e:
echo         logger.error^(f"Error during base64 prediction: {e}"^)
echo         raise HTTPException^(status_code=500, detail=f"Prediction failed: {str^(e^)}"^)
echo.
echo @app.get^("/classes"^)
echo async def get_classes^(^):
echo     return {
echo         "classes": CLASS_DISPLAY_NAMES,
echo         "class_names": CLASS_NAMES,
echo         "colors": CLASS_COLORS
echo     }
echo.
echo if __name__ == "__main__":
echo     import uvicorn
echo     print^(f"🚀 Starting AutoSOS Local YOLO Service on {LOCAL_IP}:8000"^)
echo     print^(f"📱 Your app can connect to: http://{LOCAL_IP}:8000"^)
echo     uvicorn.run^(app, host="0.0.0.0", port=8000^)
) > local_yolo_service.py

echo ✅ Local YOLO service script created
echo.

REM Start the local YOLO service
echo 🚀 Starting Local YOLO v8 Service...
echo.
echo ===============================================
echo    🌐 Service Information
echo ===============================================
echo    📍 Local IP: %LOCAL_IP%
echo    🔌 Port: 8000
echo    🔗 Service URL: http://%LOCAL_IP%:8000
echo    📱 Health Check: http://%LOCAL_IP%:8000/health
echo ===============================================
echo.
echo 📱 Your AutoSOS app will automatically detect this service
echo    when running on the same network!
echo.
echo ⏹️  Press Ctrl+C to stop the service
echo.

REM Start the service
python local_yolo_service.py

REM Cleanup
echo.
echo 🧹 Cleaning up...
if exist local_yolo_service.py del local_yolo_service.py

echo.
echo 👋 Local YOLO service stopped
pause
