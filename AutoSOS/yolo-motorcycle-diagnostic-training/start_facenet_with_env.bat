@echo off
echo Starting AutoSOS FaceNet Facial Recognition Service...
echo.

cd facial_recognition

echo Setting up environment variables...
set SUPABASE_URL=https://atdibhoeaeqfgjswcqwx.supabase.co
set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZGliaG9lYWVxZmdqc3djcXd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNTUyMzksImV4cCI6MjA3MjkzMTIzOX0.VO3uDBCOCUw0HItJnVG5WwoGuZKNG5I3ulmbZUdodk4

echo Installing dependencies...
python -m pip install -r requirements.txt

echo.
echo Starting FaceNet Facial Recognition API...
echo Service will be available at: http://localhost:8001
echo API Documentation: http://localhost:8001/docs
echo.
echo Environment Variables Set:
echo SUPABASE_URL=%SUPABASE_URL%
echo SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY%
echo.

python facial_recognition_api.py

pause
