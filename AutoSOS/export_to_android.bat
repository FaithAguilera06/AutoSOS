@echo off
echo 📱 Exporting YOLOv8 Model for Android...
echo =====================================

cd yolo-motorcycle-diagnostic-training

echo.
echo 🔄 Step 1: Converting model to TensorFlow Lite...
python export_android_model.py

echo.
echo 🏗️  Step 2: Building Android project...
cd ..
ionic capacitor build android

echo.
echo 🎉 EXPORT COMPLETE!
echo.
echo 📋 NEXT STEPS:
echo 1. Open Android Studio
echo 2. Open project: android/
echo 3. Sync project with Gradle
echo 4. Build and run on device
echo.
echo 📱 The YOLOv8 model will run ON-DEVICE (no internet needed)!

pause
