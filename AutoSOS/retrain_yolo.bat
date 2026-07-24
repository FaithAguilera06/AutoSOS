@echo off
echo YOLOv8 Retraining with New Datasets
echo ====================================
echo.

REM Change to the script's directory
cd /d "%~dp0"

echo Starting YOLOv8 retraining process...
echo This will:
echo 1. Process your NewDatasets folder
echo 2. Create annotations for all images
echo 3. Prepare training dataset
echo 4. Start YOLOv8 training
echo.

python retrain_with_new_datasets.py

echo.
echo Retraining process completed!
pause
