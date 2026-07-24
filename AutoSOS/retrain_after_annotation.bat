@echo off
echo Retraining with Improved Annotations
echo ====================================
echo.

REM Change to the script's directory
cd /d "%~dp0"

echo Step 1: Processing improved dataset...
python simple_retrain.py

echo.
echo Step 2: Retraining with better annotations...
cd yolo-motorcycle-diagnostic-training
python ..\directml_fixed_train.py --epochs 50 --batch-size 32

echo.
echo Retraining completed!
pause
