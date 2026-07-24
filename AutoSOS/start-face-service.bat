@echo off
echo Starting Face Recognition Service with Supabase Integration...
echo.

REM Change to the script's directory
cd /d "%~dp0"

REM Set environment variables
set SUPABASE_URL=https://atdibhoeaeqfgjswcqwx.supabase.co
set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZGliaG9lYWVxZmdqc3djcXd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNTUyMzksImV4cCI6MjA3MjkzMTIzOX0.VO3uDBCOCUw0HItJnVG5WwoGuZKNG5I3ulmbZUdodk4

echo Environment variables set:
echo SUPABASE_URL=%SUPABASE_URL%
echo SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY%
echo.

echo Starting Python service...
python yolo-motorcycle-diagnostic-training\facial_recognition\facial_recognition_api.py

pause
