@echo off
echo Starting YOLOv8 Service (Alternative)...

REM Change to the script's directory
cd /d "%~dp0"

set SUPABASE_URL=https://atdibhoeaeqfgjswcqwx.supabase.co
set SUPABASE_ANON_KEY=sb_publishable_8zWSuqsDoSKDiWkz3Yd_eg_E7N1X7oj

echo Environment variables set.
echo Starting Python service...
python yolo-motorcycle-diagnostic-training\backend\yolo_inference_service.py
pause
