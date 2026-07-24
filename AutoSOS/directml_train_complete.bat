@echo off
echo DirectML YOLOv8 Training Process
echo =================================
echo.

REM Change to the script's directory
cd /d "%~dp0"

echo Step 1: Testing DirectML...
python -c "import torch_directml; print('DirectML device:', torch_directml.device())"

echo.
echo Step 2: Processing new datasets...
python simple_retrain.py

echo.
echo Step 3: Starting DirectML training...
cd yolo-motorcycle-diagnostic-training
python ..\directml_train.py --epochs 150 --batch-size 32

echo.
echo DirectML Training completed!
pause
