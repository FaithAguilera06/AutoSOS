@echo off
echo Manual Annotation Tool for YOLOv8
echo ==================================
echo.

REM Change to the script's directory
cd /d "%~dp0"

echo Starting manual annotation tool...
echo.
echo Instructions:
echo - Click and drag to draw bounding boxes
echo - Press 1-4 to change class
echo - Press SPACE for next image
echo - Press S to save annotations
echo - Press D to delete last annotation
echo - Press Q to quit
echo.

python manual_annotation_tool.py

pause
