@echo off
echo GPU YOLOv8 Training Process
echo ============================
echo.

REM Change to the script's directory
cd /d "%~dp0"

echo Step 1: Checking GPU availability...
python -c "import torch; print('CUDA available:', torch.cuda.is_available()); print('GPU count:', torch.cuda.device_count() if torch.cuda.is_available() else 0)"

echo.
echo Step 2: Processing new datasets...
python simple_retrain.py

echo.
echo Step 3: Starting GPU training...
cd yolo-motorcycle-diagnostic-training
python ..\gpu_train_yolo.py --epochs 150 --batch-size 32

echo.
echo GPU Training completed!
pause
