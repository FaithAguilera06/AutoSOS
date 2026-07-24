@echo off
echo Simple YOLOv8 Retraining Process
echo ================================
echo.

REM Change to the script's directory
cd /d "%~dp0"

echo Step 1: Processing new datasets...
python simple_retrain.py

echo.
echo Step 2: Starting YOLOv8 training...
cd yolo-motorcycle-diagnostic-training
python ..\simple_train_yolo.py --epochs 150 --batch-size 32

echo.
echo Training completed!
pause
