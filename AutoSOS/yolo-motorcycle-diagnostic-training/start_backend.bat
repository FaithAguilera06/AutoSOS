@echo off
echo Starting YOLOv8 Motorcycle Diagnostic Backend Service...
echo.

cd backend

echo Installing dependencies...
python -m pip install -r requirements.txt

echo.
echo Starting FastAPI server...
echo Service will be available at: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.

python yolo_inference_service.py

pause
