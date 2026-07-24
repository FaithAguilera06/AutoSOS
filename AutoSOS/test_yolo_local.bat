@echo off
echo ========================================
echo YOLOv8 Local Backend Test
echo ========================================
echo.

echo Installing required packages...
pip install ultralytics opencv-python pillow numpy

echo.
echo Running comprehensive YOLOv8 test...
python test_yolo_local_backend.py

echo.
echo Test completed! Check yolo_test_results.json for detailed results.
pause
