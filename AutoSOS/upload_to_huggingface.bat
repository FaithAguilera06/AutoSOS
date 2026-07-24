@echo off
echo ========================================
echo  Upload AutoSOS Files to Hugging Face
echo ========================================
echo.

echo 📁 Files ready in: huggingface-space\
echo.
echo 📋 Files to upload:
dir /b "huggingface-space\"
echo.

echo 🚀 Next steps:
echo 1. Go to: https://huggingface.co/spaces/iceszn12/autosos
echo 2. Click "Files" tab
echo 3. Click "Add file" → "Upload files"
echo 4. Select ALL files from huggingface-space\ folder:
echo    - Dockerfile
echo    - requirements.txt
echo    - app.py
echo    - best.pt
echo    - README.md
echo 5. Click "Commit changes"
echo.

echo ⏱️ Build time: 5-10 minutes
echo 🌐 Your app will be live at: https://iceszn12-autosos.hf.space
echo.

echo ✅ All files are ready for upload!
pause
