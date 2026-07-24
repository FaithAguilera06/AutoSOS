@echo off
echo ========================================
echo AutoSOS YOLOv8 Cloud Service Test
echo ========================================
echo.

echo Testing YOLOv8 cloud service connection...
echo Service URL: https://autosos-yolo.onrender.com
echo.

REM Test health endpoint
echo [1/3] Testing health endpoint...
echo Getting health response...
curl -s -w "HTTP Status: %%{http_code}\n" https://autosos-yolo.onrender.com/health > health_response.json
if %errorlevel% equ 0 (
    echo ✅ Health endpoint is accessible
    echo Health response content:
    type health_response.json
    echo.
) else (
    echo ❌ Health endpoint failed
)

echo.

REM Test classes endpoint
echo [2/3] Testing classes endpoint...
echo Getting classes response...
curl -s -w "HTTP Status: %%{http_code}\n" https://autosos-yolo.onrender.com/classes > classes_response.json
if %errorlevel% equ 0 (
    echo ✅ Classes endpoint is accessible
    echo Classes response content:
    type classes_response.json
    echo.
) else (
    echo ❌ Classes endpoint failed
)

echo.

REM Test model info endpoint
echo [3/3] Testing model info endpoint...
echo Getting model info response...
curl -s -w "HTTP Status: %%{http_code}\n" https://autosos-yolo.onrender.com/model-info > model_info_response.json
if %errorlevel% equ 0 (
    echo ✅ Model info endpoint is accessible
    echo Model info response content:
    type model_info_response.json
    echo.
) else (
    echo ❌ Model info endpoint failed
)

echo.
echo ========================================
echo Testing complete!
echo ========================================
echo.

REM Test with a simple image (if curl supports it)
echo Testing with sample image...
echo Creating test image...

REM Create a simple test image using PowerShell
powershell -Command "& {
    Add-Type -AssemblyName System.Drawing
    $bitmap = New-Object System.Drawing.Bitmap(640, 480)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::White)
    
    # Draw some test shapes that might be detected as motorcycle parts
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::Red, 3)
    $graphics.DrawRectangle($pen, 100, 100, 200, 150)  # Simulate headlight
    $graphics.DrawEllipse($pen, 300, 200, 100, 100)    # Simulate tire
    $graphics.DrawRectangle($pen, 400, 80, 40, 30)     # Simulate mirror
    
    # Add some text
    $font = New-Object System.Drawing.Font('Arial', 16)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
    $graphics.DrawString('Test Motorcycle', $font, $brush, 200, 50)
    
    $graphics.Dispose()
    $pen.Dispose()
    $font.Dispose()
    $brush.Dispose()
    
    # Save as JPEG with high quality
    $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageDecoders() | Where-Object { $_.FormatID -eq [System.Drawing.Imaging.ImageFormat]::Jpeg.Guid }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 90L)
    $bitmap.Save('test_image.jpg', $jpegCodec, $encoderParams)
    $bitmap.Dispose()
    
    Write-Host 'Test image created: test_image.jpg'
}"

if exist test_image.jpg (
    echo ✅ Test image created successfully
    echo.
    echo Testing YOLOv8 detection with test image...
    
    REM Convert image to base64 and test detection
    powershell -Command "& {
        $imageBytes = [System.IO.File]::ReadAllBytes('test_image.jpg')
        $base64 = [System.Convert]::ToBase64String($imageBytes)
        
        Write-Host 'Image size:' $imageBytes.Length 'bytes'
        Write-Host 'Base64 size:' $base64.Length 'characters'
        Write-Host 'Base64 preview:' $base64.Substring(0, [Math]::Min(50, $base64.Length)) '...'
        
        # Test if base64 is valid
        try {
            $testDecode = [System.Convert]::FromBase64String($base64)
            Write-Host '✅ Base64 validation successful - decoded size:' $testDecode.Length 'bytes'
        } catch {
            Write-Host '❌ Base64 validation failed:' $_.Exception.Message
            return
        }
        
        $body = @{
            image_data = $base64
            confidence = 0.1
            include_annotated_image = $false
        } | ConvertTo-Json -Depth 3
        
        Write-Host 'Request body size:' $body.Length 'characters'
        Write-Host 'Sending request to YOLOv8 service...'
        
        # Test both endpoints
        Write-Host 'Testing /detect endpoint (FormData approach)...'
        try {
            $formData = New-Object System.Net.Http.MultipartFormDataContent
            $fileStream = [System.IO.File]::OpenRead('test_image.jpg')
            $fileContent = New-Object System.Net.Http.StreamContent($fileStream)
            $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse('image/jpeg')
            $formData.Add($fileContent, 'file', 'test_image.jpg')
            
            $httpClient = New-Object System.Net.Http.HttpClient
            $response = $httpClient.PostAsync('https://autosos-yolo.onrender.com/detect', $formData).Result
            $responseContent = $response.Content.ReadAsStringAsync().Result
            
            Write-Host '✅ YOLOv8 /detect test successful!'
            Write-Host 'Status:' $response.StatusCode
            Write-Host 'Response:' $responseContent
            
            $httpClient.Dispose()
            $fileStream.Close()
        } catch {
            Write-Host '❌ YOLOv8 /detect test failed:'
            Write-Host 'Error:' $_.Exception.Message
        }
        
        Write-Host ''
        Write-Host 'Testing /detect-base64 endpoint (original approach)...'
        try {
            $response = Invoke-RestMethod -Uri 'https://autosos-yolo.onrender.com/detect-base64' -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 30
            Write-Host '✅ YOLOv8 /detect-base64 test successful!'
            Write-Host 'Response:' ($response | ConvertTo-Json -Depth 3)
        } catch {
            Write-Host '❌ YOLOv8 /detect-base64 test failed:'
            Write-Host 'Error:' $_.Exception.Message
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Host 'Response body:' $responseBody
            }
        }
    }"
    
    REM Clean up test image
    del test_image.jpg
    echo.
    echo Test image cleaned up.
) else (
    echo ❌ Failed to create test image
)

REM Clean up response files
if exist health_response.json del health_response.json
if exist classes_response.json del classes_response.json
if exist model_info_response.json del model_info_response.json
echo Response files cleaned up.

echo.
echo ========================================
echo Cloud YOLOv8 Service Test Complete
echo ========================================
echo.
echo If all tests passed, the YOLOv8 service is ready for use!
echo You can now use the camera page for real-time detection.
echo.
pause
