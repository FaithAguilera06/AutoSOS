@echo off
echo Starting AutoSOS Facial Recognition Service...
echo.

cd facial_recognition

echo Installing dependencies...
python -m pip install -r requirements.txt

echo.
echo Starting FaceNet Facial Recognition API...
echo Service will be available at: http://localhost:8001
echo API Documentation: http://localhost:8001/docs
echo.

python facial_recognition_api.py

pause
